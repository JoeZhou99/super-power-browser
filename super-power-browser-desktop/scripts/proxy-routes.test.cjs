const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { ProxyRuntime } = require('../src/main/services/ProxyRuntime');
const { ProxyRoutes, proxySnapshotId, targetLatency } = require('../src/main/services/ProxyRoutes');

const proxy = () => ({ protocol: 'http', host: 'primary.test', port: 8080, username: 'user', password: 'synthetic-secret',
  proxyOptions: { alternatives: [{ protocol: 'http', host: 'original.test', port: 8081, username: 'backup', password: 'backup-secret' }] } });

test('running route list and selection remain on the same snapshot after the saved configuration changes', async () => {
  const saved = proxy(), runtime = new ProxyRuntime(saved);
  const routes = new ProxyRoutes(saved, runtime);
  saved.proxyOptions.alternatives[0].host = 'replacement.test';
  const state = routes.state();
  assert.equal(state.candidates[1].ip, 'original.test');
  assert.equal(routes.select({ candidateIndex: 1, snapshotId: state.snapshotId }).host, 'original.test');
  assert.throws(() => routes.select({ candidateIndex: 1, snapshotId: proxySnapshotId(saved) }), /配置已变化/);
  let actual;
  runtime.entry = { switchTo: async value => { actual = value.host; } };
  await runtime.switchCandidate(1);
  assert.equal(actual, 'original.test');
  assert.equal(routes.state().candidateIndex, 1, 'reopening the check page must read the actual running line');
  const json = JSON.stringify(routes.state());
  assert.ok(!json.includes('secret') && !json.includes('username'));
});

test('route operations reject unversioned and injected candidates before starting a probe', async () => {
  const raw = proxy(), routes = new ProxyRoutes(raw, new ProxyRuntime(raw));
  for (const selection of [null, { candidateIndex: 1 }, { candidateIndex: 1, snapshotId: routes.snapshotId, host: 'injected.test' },
    { candidateIndex: 9, snapshotId: routes.snapshotId }, { candidateIndex: '1', snapshotId: routes.snapshotId }]) {
    assert.throws(() => routes.select(selection));
  }
});

test('snapshot excludes display fields and changes on any connection or routing edit', () => {
  const raw = proxy(), id = proxySnapshotId(raw);
  assert.equal(proxySnapshotId({ name: 'renamed', id: 'display-id', ...raw }), id);
  assert.equal(proxySnapshotId({ ...raw, proxyOptions: { ...raw.proxyOptions } }), id);
  for (const changed of [
    { ...raw, password: 'other' },
    { ...raw, proxyOptions: { ...raw.proxyOptions, routing: { directDomains: ['explicit.test'] } } },
    { ...raw, proxyOptions: { alternatives: [] } },
  ]) assert.notEqual(proxySnapshotId(changed), id);
});

test('total latency uses the authorized site and releases its temporary lease without changing the active line', async () => {
  let measured, closed = 0, started = 0;
  class Runtime {
    constructor(connection) { this.connection = connection; this.url = 'http://127.0.0.1:1234'; }
    async listen() { started++; }
    async close() { closed++; }
  }
  const raw = proxy(), live = new ProxyRuntime(raw);
  const routes = new ProxyRoutes(raw, live, { target: 'https://authorized.test/shop', Runtime, measure: async (target, url) => { measured = { target, url }; return 42; } });
  const result = await routes.latency({ candidateIndex: 1, snapshotId: routes.snapshotId });
  assert.equal(result.delay, 42); assert.equal(result.available, true);
  assert.equal(result.snapshotId, routes.snapshotId); assert.equal(result.candidateIndex, 1);
  assert.equal(measured.target, 'https://authorized.test/shop'); assert.equal(live.candidateIndex, 0);
  assert.equal(started, 1); assert.equal(closed, 1);
  await assert.rejects(routes.latency({ candidateIndex: 1, snapshotId: routes.snapshotId, target: 'https://injected.test' }));
  assert.equal(started, 1);
});

test('pool measurements verify the fixed exit, display the relay first hop, and never expose credentials',async()=>{
  const raw={protocol:'http',host:'fixed-exit.test',port:8080,password:'exit-secret',mapIp:'1.1.1.1',
    proxyOptions:{transit:{protocol:'socks5',host:'relay.test',port:1080,password:'relay-secret'}},
    relayPool:{id:'pool',name:'平台加速',revision:2,candidates:[{id:'relay',name:'香港 A',region:'香港',poolId:'hk-pool',poolName:'香港分组'}]}};
  let closed=0,measures=0,valid=false;
  class Runtime{constructor(config){this.config=config;this.url='http://127.0.0.1:12345';}async listen(){}async close(){closed++;}}
  const live=new ProxyRuntime(raw),routes=new ProxyRoutes(raw,live,{target:'https://shop.test/',Runtime,
    tcp:async connection=>{assert.equal(connection.host,'relay.test');return 25;},
    validate:async runtime=>{assert.equal(runtime.config.host,'fixed-exit.test');if(!valid)throw new Error('fixed exit mismatch');},
    measure:async()=>{measures++;return 300;}});
  const selection={candidateIndex:0,snapshotId:routes.snapshotId};
  await assert.rejects(routes.latency(selection),/fixed exit mismatch/);
  assert.equal(measures,0);assert.equal(closed,1);assert.equal(live.candidateIndex,0);
  valid=true;const measurement=await routes.latency(selection);
  assert.equal(measurement.delay,300);assert.equal(measurement.entryLatencyMs,25);
  assert.ok(Date.parse(measurement.sampledAt));assert.equal(closed,2);
  const state=routes.state();assert.equal(state.candidates[0].name,'香港 A');assert.equal(state.candidates[0].ip,'relay.test');
  assert.equal(state.candidates[0].poolId,'hk-pool');assert.equal(state.candidates[0].poolName,'香港分组');
  assert.equal(state.candidates[0].health.available,true);assert.ok(!JSON.stringify(state).includes('secret'));
});

test('a failed temporary proxy start clears stale healthy measurements and releases the lease',async()=>{
  let closed=0;
  class Runtime{async listen(){throw new Error('temporary startup failure');}async close(){closed++;}}
  const raw=proxy(),live=new ProxyRuntime(raw),routes=new ProxyRoutes(raw,live,{Runtime});
  routes.health.set(1,{available:true,delay:10,entryLatencyMs:2,sampledAt:'2026-11-11T00:00:00Z'});
  await assert.rejects(routes.latency({candidateIndex:1,snapshotId:routes.snapshotId}),/temporary startup failure/);
  assert.equal(routes.state().candidates[1].health.available,false);
  assert.equal(routes.state().candidates[1].health.delay,null);assert.equal(closed,1);assert.equal(live.candidateIndex,0);
});

test('startup readiness uses the live exit once without entry TCP, merchant HEAD or temporary sessions',async()=>{
  const raw=proxy(), live=new ProxyRuntime(raw), network={available:true,ip:'1.1.1.1',country_code:'US',timezone:'America/New_York'};
  let validations=0;
  const forbidden=()=>{throw new Error('diagnostic probe must not gate startup');};
  const routes=new ProxyRoutes({...raw,relayPool:{id:'pool'}},live,{Runtime:forbidden,tcp:forbidden,measure:forbidden,
    validate:async runtime=>{assert.equal(runtime,live);validations++;return network;}});
  const result=await routes.ready();
  assert.equal(result.network,network);assert.equal(validations,1);assert.equal(result.candidateIndex,0);
  assert.equal(result.delay,null);assert.equal(result.entryLatencyMs,null);assert.equal(result.available,true);
  assert.ok(Number.isFinite(result.exitLatencyMs));assert.equal(routes.measuring,false);
  assert.ok(!JSON.stringify(routes.state()).includes('America/New_York'),'network details are not exposed as relay metadata');
});

test('readiness failures preserve exit rejection and only expose safe diagnostics',async()=>{
  const raw=proxy(),live=new ProxyRuntime(raw),routes=new ProxyRoutes(raw,live,{validate:async()=>{throw new Error('unsafe-secret-connection');}});
  await assert.rejects(routes.ready(),/unsafe-secret-connection/);
  assert.equal(routes.state().candidates[0].health.available,false);
  assert.ok(!JSON.stringify(routes.state()).includes('unsafe-secret-connection'));assert.equal(routes.measuring,false);
  const missing=new ProxyRoutes(raw,live);
  await assert.rejects(missing.ready(),/未配置代理出口校验/);
});

test('cancelling live readiness releases exclusivity without restarting or changing routes',async()=>{
  const raw=proxy(),live=new ProxyRuntime(raw),controller=new AbortController();let entered;
  const started=new Promise(resolve=>{entered=resolve;});
  const routes=new ProxyRoutes(raw,live,{validate:async(_,signal)=>{entered();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
  const ready=routes.ready({signal:controller.signal}),rejected=assert.rejects(ready,{name:'AbortError'});
  await started;
  await assert.rejects(routes.ready(),/正在测速/);
  controller.abort();await rejected;
  assert.equal(routes.measuring,false);assert.equal(live.candidateIndex,0);
});

async function server(t, handler) {
  const sockets = new Set(), value = http.createServer(handler);
  value.on('connection', socket => { sockets.add(socket); socket.on('error', () => {}); socket.once('close', () => sockets.delete(socket)); });
  await new Promise(resolve => value.listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => value.close(resolve)); });
  return value;
}
test('real total latency traverses the authenticated proxy and does not send credentials/cookies to the target', async t => {
  const seen = [], target = await server(t, (req, res) => { seen.push(req); res.writeHead(405); res.end(); });
  const upstream = await server(t), auth = 'Basic ' + Buffer.from('synthetic:password').toString('base64');
  let tunnels = 0;
  upstream.on('connect', (req, socket, head) => {
    assert.equal(req.headers['proxy-authorization'], auth); tunnels++;
    assert.equal(req.url, `127.0.0.1:${target.address().port}`);
    const remote = net.connect(target.address().port, '127.0.0.1', () => { socket.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if (head.length) remote.write(head); remote.pipe(socket).pipe(remote); });
    remote.on('error', () => socket.destroy()); socket.once('close', () => remote.destroy());
  });
  const delay = await targetLatency(`http://127.0.0.1:${target.address().port}/shop`, `http://synthetic:password@127.0.0.1:${upstream.address().port}`);
  assert.ok(Number.isFinite(delay) && delay >= 0); assert.equal(tunnels, 1); assert.equal(seen.length, 1);
  assert.equal(seen[0].method, 'HEAD');
  for (const key of ['cookie', 'authorization', 'proxy-authorization']) assert.equal(seen[0].headers[key], undefined);
});
test('an unavailable route cannot fall back to the direct target', async t => {
  let hits = 0;
  const target = await server(t, (_, res) => { hits++; res.end(); });
  const upstream = await server(t);
  upstream.on('connect', (_, socket) => socket.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n'));
  // CONNECT failure is returned as a proxy response, not a target measurement.
  await assert.rejects(targetLatency(`http://127.0.0.1:${target.address().port}/`, `http://127.0.0.1:${upstream.address().port}`));
  assert.equal(hits, 0);
});
for (const mode of ['cancellation', 'timeout']) {
  test(`a stalled CONNECT closes its underlying socket after ${mode}`, async t => {
    const upstream = await server(t), controller = new AbortController();
    let connected = false, closeTimer;
    const closed = new Promise((resolve, reject) => {
      upstream.on('connect', (_, socket) => {
        connected = true;
        // Behave as a stalled upstream that honors peer shutdown. Fixture
        // teardown must not be what finally closes the abandoned connection.
        socket.resume(); socket.once('end', () => socket.end());
        socket.once('close', () => { clearTimeout(closeTimer); resolve(); });
        closeTimer = setTimeout(() => reject(new Error('CONNECT socket leaked')), 2000);
        if (mode === 'cancellation') controller.abort();
      });
    });
    t.after(() => clearTimeout(closeTimer));
    await Promise.all([
      assert.rejects(targetLatency('http://authorized.test/', `http://127.0.0.1:${upstream.address().port}`, {
        signal: controller.signal, timeout: mode === 'timeout' ? 250 : 2000,
      })),
      closed,
    ]);
    assert.equal(connected, true);
  });
}
