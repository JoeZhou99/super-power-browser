const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ProxyChecks, requestRotation } = require('../src/main/services/ProxyChecks');
const {collectGeo}=require('../src/main/pluginManage/NetworkInfo');

test('managed proxy checks tolerate a slow reachable provider while another provider stalls',async()=>{
  const collect=options=>collectGeo({...options,proxyUrl:'http://127.0.0.1:1',
    // Scale the production budgets to milliseconds: one provider never answers,
    // while the other answers after the equivalent of sixteen seconds.
    timeout:(options.timeout??12000)/100,requestTimeout:(options.requestTimeout??8000)/100,
    providers:['https://stalled.test/json','https://slow.test/json'],
    request:(url,agent,signal)=>url.includes('stalled')?new Promise(()=>{}):new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>resolve({ip:'1.1.1.1',country_code:'JP'}),160);
      signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});
    })});
  const f=poolFixture(collect),result=await f.checks.probe(f.proxy,undefined,null);
  assert.equal(result.connected,true,'A valid managed exit must use the same provider allowance as shop startup');
  assert.deepEqual(f.opened,['relay-a.test']);assert.deepEqual(f.closed,f.opened);
});

function poolFixture(collect){
  const exit={protocol:'http',host:'1.1.1.1',mapIp:'1.1.1.1',webType:2,port:8080};
  const proxy={...exit,proxyOptions:{transit:{protocol:'socks5',host:'relay-a.test',port:1080},alternatives:[
    {...exit,proxyOptions:{transit:{protocol:'socks5',host:'relay-b.test',port:1080}}}
  ]},relayPool:{id:'pool',candidates:[{name:'A'},{name:'B'}]}};
  const opened=[],closed=[];
  class Runtime{
    constructor(connection){
      this.connection=connection;this.candidates=[connection,...connection.proxyOptions.alternatives||[]];
      assert.equal(connection.host,'1.1.1.1');assert.equal(connection.port,8080);
      assert.ok(connection.proxyOptions.transit,'every attempt must traverse an authorized relay');
      this.name=connection.proxyOptions.transit.host;
    }
    async listen(){opened.push(this.name);}
    get url(){return this.name;}
    async close(){closed.push(this.name);}
  }
  return {proxy,opened,closed,checks:new ProxyChecks({}, {Runtime,collect,operations:async()=>null})};
}

for(const failure of ['unreachable','wrong-exit'])test(`pool check tries the next relay after ${failure} and releases each temporary session`,async()=>{
  const f=poolFixture(async({proxyUrl,expectedIp})=>{
    assert.equal(expectedIp,'1.1.1.1');
    if(proxyUrl==='relay-a.test')return failure==='wrong-exit'?{available:true,ip:'8.8.8.8'}:{available:false};
    return {available:true,ip:'1.1.1.1'};
  });
  const result=await f.checks.probe(f.proxy,undefined,null);
  assert.equal(result.connected,true);assert.equal(result.ip,'1.1.1.1');assert.match(result.message,/线路：B/);
  assert.deepEqual(f.opened,['relay-a.test','relay-b.test']);assert.deepEqual(f.closed,f.opened);
});

test('all failed pool candidates return failure without testing the exit directly',async()=>{
  const f=poolFixture(async()=>({available:false}));
  const result=await f.checks.probe(f.proxy,undefined,null);
  assert.equal(result.connected,false);assert.match(result.message,/中继池线路均未通过检测/);
  assert.deepEqual(f.opened,['relay-a.test','relay-b.test']);assert.deepEqual(f.closed,f.opened);
});

test('cancelling a pool check releases the current candidate and never starts the next',async()=>{
  let entered;const started=new Promise(resolve=>{entered=resolve;});
  const f=poolFixture(()=>{entered();return new Promise(()=>{});}),controller=new AbortController();
  const pending=f.checks.probe(f.proxy,controller.signal,null),rejected=assert.rejects(pending,{name:'AbortError'});
  await started;controller.abort();await rejected;
  assert.deepEqual(f.opened,['relay-a.test']);assert.deepEqual(f.closed,f.opened);
});

test('bulk checks bound concurrency and logout cancels queued probes without saving stale results', async () => {
  let opened = 0, closed = 0, maximum = 0;
  const requests = [];
  class Runtime {
    async listen() { opened++; maximum = Math.max(maximum, opened - closed); }
    get url() { return 'http://127.0.0.1:1'; }
    async close() { closed++; }
  }
  const api = { request: async (route, options) => { requests.push({ route, options }); return { ipType: 2, webType: 1 }; } };
  const checks = new ProxyChecks(api, { Runtime, collect: () => new Promise(() => {}) });
  const operations = Array.from({ length: 12 }, (_, index) => checks.check(`00000000-0000-0000-0000-${String(index).padStart(12, '0')}`));
  const results = Promise.allSettled(operations);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(opened, 4);assert.equal(maximum, 4);
  await checks.cancelAll();
  assert.ok((await results).every(result => result.status === 'rejected' && result.reason.name === 'AbortError'));
  assert.equal(closed, 4);assert.equal(checks.pending.size, 0);assert.equal(checks.queue.length, 0);assert.equal(checks.active, 0);
  assert.ok(requests.every(({ options }) => !options.body));
  checks.collect = async () => ({ available: true, ip: '8.8.8.8' });
  await checks.suspend();
  await assert.rejects(checks.check('00000000-0000-0000-0000-000000000099'), /正在结束/);
  assert.equal(opened, 4, 'no new probe may start while logout is closing shops');
  checks.resume();
  assert.equal((await checks.check('00000000-0000-0000-0000-000000000099')).connected, true);
  assert.equal(closed, 5);
});

test('cancelling a pending rotation closes its request and never issues a retry', async () => {
  let calls = 0, accepted;
  const requestArrived = new Promise(resolve => { accepted = resolve; });
  const sockets = new Set();
  const server = http.createServer(() => { calls++; accepted(); });
  server.on('connection', socket => { sockets.add(socket);socket.once('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const controller = new AbortController();
  try {
    const operation = requestRotation(`http://127.0.0.1:${server.address().port}/rotate?token=synthetic`, { signal: controller.signal });
    const rejected = assert.rejects(operation, { name: 'AbortError' });
    await requestArrived;controller.abort();await rejected;
    assert.equal(calls, 1);
  } finally { for (const socket of sockets) socket.destroy();await new Promise(resolve => server.close(resolve)); }
});

test('SSR close during port release cannot spawn a child after cancellation', async () => {
  let release, reachedRelease, spawned = 0, stopped = 0;
  const waiting = new Promise(resolve => { reachedRelease = resolve; });
  const released = new Promise(resolve => { release = resolve; });
  const filename = path.resolve(__dirname, '../src/main/services/SsrTunnel.js');
  const fakeProcess = {
    resolveProxyBinary: async () => '/synthetic/ssr-client',
    reservePorts: async () => ({ ports: [19000], release: async () => { reachedRelease();await released; } }),
    launchChild: () => { spawned++;return { stdin: { end() {} }, once() {} }; },
    waitListening: async () => {},
    stopChild: async child => { if (child) stopped++; },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, require: name => {
      if (name === './ProxyProcess') return fakeProcess;
      if (name === 'node:fs/promises') return { mkdtemp: async () => '/synthetic/ssr-temp', writeFile: async () => {}, rm: async () => {} };
      return require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name);
    },
  }, { filename });
  const controller = new AbortController();
  const tunnel = new module.exports.SsrTunnel({ host: 'gateway.test', port: 80, password: 'synthetic', proxyOptions: { encryption: 'aes-256-cfb' } }, { signal: controller.signal, resources: '/synthetic' });
  const operation = tunnel.listen(), rejection = assert.rejects(operation, { name: 'AbortError' });
  await waiting;controller.abort();await tunnel.close();release();await rejection;
  assert.equal(spawned, 0);assert.equal(stopped, 0);
});


test('device checks and IP rotation use authenticated published provider lists', async () => {
  const providers=['https://configured-check.test/ip'],observed=[],tokens=[];
  class Runtime {async listen(){} get url(){return 'http://127.0.0.1:1';} async close(){}}
  const api={token:'customer-session',request:async route=>route.endsWith('/connection')
    ?{ipType:2,webType:1,changeIpUrl:'https://rotate.test/'}:{}};
  const checks=new ProxyChecks(api,{Runtime,rotate:async()=>{},
    operations:async({token})=>{tokens.push(token);return {networkChecks:{enabled:true,proxyProviders:providers}};},
    collect:async options=>{observed.push(options.providers);return {available:true,ip:'1.1.1.1'};}});
  const id='00000000-0000-0000-0000-000000000999';
  assert.equal((await checks.check(id)).connected,true);
  assert.equal((await checks.changeIp(id)).connected,true);
  assert.deepEqual(observed,[providers,providers]);assert.deepEqual(tokens,['customer-session','customer-session']);
});


test('unavailable operations configuration neither rotates IP nor records a false failed proxy check',async()=>{
  let rotated=0,started=0;const requests=[];
  const api={token:'customer-session',request:async(route,options)=>{requests.push({route,options});return {ipType:2,changeIpUrl:'https://rotate.example.com/'};}};
  class Runtime {constructor(){started++;}}
  const checks=new ProxyChecks(api,{Runtime,rotate:async()=>{rotated++;},operations:async()=>{throw new Error('configuration-unavailable');}});
  const id='00000000-0000-0000-0000-000000000998';
  await assert.rejects(checks.check(id),/configuration-unavailable/);
  await assert.rejects(checks.changeIp(id),/configuration-unavailable/);
  assert.equal(rotated,0);assert.equal(started,0);
  assert.ok(requests.every(({options})=>!options.body));
});
