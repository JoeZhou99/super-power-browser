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
