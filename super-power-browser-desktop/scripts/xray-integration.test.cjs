const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { ProxyRuntime, ProxyPool } = require('../src/main/services/ProxyRuntime');
const {ProxyRoutes}=require('../src/main/services/ProxyRoutes');
const {RelayController}=require('../src/main/services/RelayController');
const { resolveProxyBinary, reservePorts, launchChild, waitListening, stopChild } = require('../src/main/services/ProxyProcess');

// Every upstream and destination binds loopback. Fixture Xray routing rejects
// all destinations except its one synthetic target, so tests need no Internet.
const resources = path.resolve(__dirname, '..');
const userId = 'bd090a41-2f4f-48e9-95c5-57b4c684ccfe';
const account = ' test@account ';
const password = ' p@ss:/?#%"\\密码 ';
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function scope(t) {
  const disposers = [];
  t.after(async () => {
    let failure;
    for (const dispose of disposers.reverse()) {
      try { await dispose(); } catch (error) { failure ||= error; }
    }
    if (failure) throw failure;
  });
  return dispose => disposers.push(dispose);
}

async function target(add) {
  const requests = [], sockets = new Set();
  const server = http.createServer((request, response) => {
    requests.push({ path: request.url, authorization: request.headers['proxy-authorization'] });
    response.setHeader('Connection', 'close');
    response.end('local-target:' + request.url);
  });
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  add(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return { port: server.address().port, requests };
}

async function upstream(add, protocol, targetPort) {
  const executable = await resolveProxyBinary(resources);
  const reserved = await reservePorts(1), port = reserved.ports[0];
  let inbound, proxyOptions = {};
  if (protocol === 'http') inbound = { protocol: 'http', settings: { accounts: [{ user: account, pass: password }] } };
  else if (protocol === 'socks5') inbound = { protocol: 'socks', settings: { auth: 'password', accounts: [{ user: account, pass: password }], udp: false } };
  else if (protocol === 'ss') {
    inbound = { protocol: 'shadowsocks', settings: { method: 'aes-256-gcm', password, network: 'tcp' } };
    proxyOptions = { encryption: 'aes-256-gcm' };
  } else if (protocol === 'vmess') {
    inbound = { protocol: 'vmess', settings: { clients: [{ id: userId, alterId: 0 }] }, streamSettings: { network: 'tcp', security: 'none' } };
    proxyOptions = { vmessUser: { id: userId, alterId: 0, security: 'auto', securityTls: 'none', network: 'tcp' } };
  } else if (protocol === 'vless') {
    inbound = { protocol: 'vless', settings: { clients: [{ id: userId }], decryption: 'none' }, streamSettings: { network: 'tcp', security: 'none' } };
    proxyOptions = { vlessUser: { id: userId, encryption: 'none', security: 'none', network: 'tcp', flow: '' } };
  } else throw new Error('Unsupported test fixture');
  const configuration = {
    log: { loglevel: 'none' },
    inbounds: [{ tag: 'synthetic-upstream', listen: '127.0.0.1', port, ...inbound }],
    outbounds: [{ tag: 'deny', protocol: 'blackhole' }, { tag: 'target', protocol: 'freedom' }],
    routing: { rules: [{ type: 'field', ip: ['127.0.0.1/32'], port: String(targetPort), network: 'tcp', outboundTag: 'target' }] },
  };
  await reserved.release();
  const child = launchChild(executable, ['run', '-config', 'stdin:']);
  add(() => stopChild(child));
  child.stdin.end(JSON.stringify(configuration));
  await waitListening(child, [port]);
  return { child, connection: { protocol, host: '127.0.0.1', port, username: account, password, proxyOptions } };
}

function request(runtime, targetPort, suffix = '/', authenticate = true) {
  const local = new URL(runtime.url);
  const headers = { Connection: 'close' };
  if (authenticate) headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(decodeURIComponent(local.username) + ':' + decodeURIComponent(local.password)).toString('base64');
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: runtime.port, path: `http://127.0.0.1:${targetPort}${suffix}`, headers, agent: false }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
      response.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('Synthetic proxy request timeout')));
    req.on('error', reject);
  });
}

function runtime(add, connection, options = {}) {
  const value = new ProxyRuntime(connection, { resources, ...options });
  add(() => value.close());
  return value;
}

async function until(predicate, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (predicate()) return; await pause(20); }
  assert.fail('Timed out waiting for proxy lifecycle transition');
}

async function assertStopped(child, port) {
  await until(() => child.exitCode !== null || child.signalCode !== null);
  const listening = await new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
  });
  assert.equal(listening, false, 'released proxy port must not remain listening');
}

for (const protocol of ['http', 'socks5', 'ss', 'vmess', 'vless']) {
  test(`real Xray ${protocol} forwarding reaches only the local destination`, { timeout: 20000 }, async t => {
    const add = scope(t), destination = await target(add), remote = await upstream(add, protocol, destination.port);
    const client = runtime(add, remote.connection);
    await client.listen();
    assert.equal((await request(client, destination.port, '/unauthorized', false)).status, 407);
    assert.equal(destination.requests.length, 0);
    const result = await request(client, destination.port, '/through-' + protocol);
    assert.deepEqual(result, { status: 200, body: 'local-target:/through-' + protocol });
    assert.equal(destination.requests.length, 1);
    assert.equal(destination.requests[0].authorization, undefined, 'proxy credentials must not reach the destination');
    const child = client.child, port = client.port;
    await client.close();
    await assertStopped(child, port);
  });
}

test('real HTTP upstream rejects a wrong password including reserved characters', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const client = runtime(add, { ...remote.connection, password: password + '-wrong' });
  await client.listen();
  const result = await request(client, destination.port).catch(() => ({ status: 0 }));
  assert.notEqual(result.status, 200);
  assert.equal(destination.requests.length, 0);
});

test('VMess transport survives a real authenticated SOCKS5 transit chain', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'vmess', destination.port);
  const relay = await upstream(add, 'socks5', remote.connection.port);
  const client = runtime(add, { ...remote.connection, proxyOptions: { ...remote.connection.proxyOptions, transit: relay.connection } });
  await client.listen();
  assert.deepEqual(await request(client, destination.port, '/chain'), { status: 200, body: 'local-target:/chain' });
  assert.equal(destination.requests.length, 1);
});

test('SOCKS5 exit survives a real encrypted Shadowsocks transit chain', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'socks5', destination.port);
  const relay = await upstream(add, 'ss', remote.connection.port);
  const client = runtime(add, { ...remote.connection, proxyOptions: { ...remote.connection.proxyOptions, transit: relay.connection } });
  await client.listen();
  assert.deepEqual(await request(client, destination.port, '/ss-chain'), { status: 200, body: 'local-target:/ss-chain' });
  assert.equal(destination.requests.length, 1);
});

test('concurrent identical leases share one child and release it only after the final owner', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const pool = new ProxyPool(resources);add(() => pool.close());
  const clients = Array.from({ length: 20 }, () => runtime(add, remote.connection, { pool }));
  await Promise.all(clients.map(client => client.listen()));
  assert.equal(new Set(clients.map(client => client.child.pid)).size, 1);
  assert.equal(new Set(clients.map(client => client.port)).size, 1);
  assert.equal(new Set(clients.map(client => client.url)).size, 1);
  assert.equal(pool.sessions.size, 1);
  const child = clients[0].child, port = clients[0].port;
  await Promise.all(clients.slice(0, -1).map(client => client.close()));
  assert.equal(child.exitCode, null);assert.equal(child.signalCode, null);
  assert.equal((await request(clients.at(-1), destination.port, '/last-owner')).status, 200);
  await clients.at(-1).close();
  assert.equal(pool.sessions.size, 0);
  await assertStopped(child, port);
});

test('cancelling one pending lease preserves another owner of the same real proxy', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const pool = new ProxyPool(resources);add(() => pool.close());
  const controller = new AbortController();
  const first = runtime(add, remote.connection, { pool, signal: controller.signal });
  const second = runtime(add, remote.connection, { pool });
  const cancelled = first.listen(), retained = second.listen();
  const rejection = assert.rejects(cancelled, { name: 'AbortError' });
  controller.abort(new DOMException('Synthetic cancellation', 'AbortError'));
  await rejection;await retained;
  assert.equal(first.closed, true);assert.equal(second.closed, false);
  assert.equal(second.entry.owners.size, 1);
  assert.equal((await request(second, destination.port, '/retained')).status, 200);
});

test('child failure restores the same authenticated ports and stops after three rapid restarts', { timeout: 30000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const pool = new ProxyPool(resources);add(() => pool.close());
  const client = runtime(add, remote.connection, { pool });await client.listen();
  const port = client.port, socksPort = client.socksPort, url = client.url;
  for (let count = 0; count < 3; count++) {
    const previous = client.child, exited = once(previous, 'exit');previous.kill('SIGKILL');await exited;
    await until(() => client.child && client.child !== previous && client.entry.ready && !client.entry.recovering);
    assert.equal(client.port, port);assert.equal(client.socksPort, socksPort);assert.equal(client.url, url);
    assert.equal((await request(client, destination.port, '/restart-' + count)).status, 200);
  }
  const terminal = once(client, 'failure'), last = client.child;
  last.kill('SIGKILL');await terminal;
  await until(() => client.entry.closed);
  await assertStopped(last, port);
  assert.equal(pool.sessions.size, 0);
  assert.equal(destination.requests.length, 3);
});

test('a refused upstream never falls back to connecting directly to the destination', { timeout: 15000 }, async t => {
  const add = scope(t), destination = await target(add), reserved = await reservePorts(1);
  const refusedPort = reserved.ports[0];await reserved.release();
  const client = runtime(add, { protocol: 'http', host: '127.0.0.1', port: refusedPort });
  await client.listen();
  const result = await request(client, destination.port, '/must-not-arrive').catch(() => ({ status: 0 }));
  assert.notEqual(result.status, 200);assert.equal(destination.requests.length, 0);
});

test('managed relay pool probes isolated real chains and recovers a failed relay through the same exit', {timeout:45000},async t=>{
  const add=scope(t),destination=await target(add),exit=await upstream(add,'http',destination.port);
  const relays=[await upstream(add,'socks5',exit.connection.port),await upstream(add,'http',exit.connection.port)];
  const connection={...exit.connection,proxyOptions:{...exit.connection.proxyOptions,transit:relays[0].connection,
    alternatives:[{...exit.connection,proxyOptions:{...exit.connection.proxyOptions,transit:relays[1].connection}}]},
    relayPool:{id:'synthetic-pool',name:'Local fixture',automatic:true,candidates:[{id:'a',name:'A'},{id:'b',name:'B'}]}};
  const client=runtime(add,connection);await client.listen();
  const validate=async probe=>{
    assert.equal(probe.config.host,exit.connection.host);assert.equal(probe.config.port,exit.connection.port);
    assert.equal((await request(probe,destination.port,'/fixed-exit')).status,200);
  };
  const routes=new ProxyRoutes(connection,client,{resources,target:`http://127.0.0.1:${destination.port}/measure`,validate});
  const controller=new RelayController(routes,index=>client.switchCandidate(index,{validate:async candidate=>{
    const probe=new ProxyRuntime(candidate,{resources});
    try{await probe.listen();await validate(probe);}finally{await probe.close();}
  }}),{policy:connection.relayPool});add(()=>controller.close());
  await controller.initialize();const selected=client.candidateIndex,oldPid=client.child.pid,port=client.port,url=client.url;
  await routes.latency({candidateIndex:1-selected,snapshotId:routes.snapshotId});
  assert.equal(client.child.pid,oldPid);assert.equal(client.candidateIndex,selected);
  await stopChild(relays[selected].child);
  await controller.tick();await controller.tick();assert.equal(client.candidateIndex,selected);
  await controller.tick();assert.equal(client.candidateIndex,1-selected);
  assert.equal(client.port,port);assert.equal(client.url,url);
  assert.equal((await request(client,destination.port,'/after-failover')).status,200);
  assert.equal(client.entry.config.host,exit.connection.host);assert.equal(client.entry.config.port,exit.connection.port);
  assert.equal(controller.state().relayStatus,'healthy');
});

test('authorized route switching keeps ports and credentials, isolates shops, and rejects injected candidates', { timeout: 30000 }, async t => {
  const add = scope(t), firstTarget = await target(add), secondTarget = await target(add);
  const firstUpstream = await upstream(add, 'http', firstTarget.port);
  const secondUpstream = await upstream(add, 'socks5', secondTarget.port);
  const connection = { ...firstUpstream.connection, proxyOptions: { alternatives: [secondUpstream.connection] } };
  const pool = new ProxyPool(resources);add(() => pool.close());
  const first = runtime(add, connection, { pool }), otherShop = runtime(add, connection, { pool });
  await Promise.all([first.listen(), otherShop.listen()]);
  assert.notEqual(first.child.pid, otherShop.child.pid);
  assert.notEqual(first.port, otherShop.port);
  const port = first.port, socksPort = first.socksPort, url = first.url, otherPid = otherShop.child.pid;
  const originalPid = first.child.pid;
  for (const invalid of [-1, 2, 0.5, '1', { protocol: 'http', host: '127.0.0.1', port: secondTarget.port }]) {
    await assert.rejects(first.switchCandidate(invalid), /只能使用当前店铺已配置的线路/);
  }
  assert.equal(first.child.pid, originalPid);
  let validated = false;
  await first.switchCandidate(1, { validate: async candidate => {
    const probe = runtime(add, candidate);
    try { await probe.listen();assert.equal((await request(probe, secondTarget.port, '/validate')).status, 200);validated = true; }
    finally { await probe.close(); }
  } });
  assert.equal(validated, true);assert.equal(first.candidateIndex, 1);
  assert.equal(first.port, port);assert.equal(first.socksPort, socksPort);assert.equal(first.url, url);
  assert.equal(otherShop.child.pid, otherPid);assert.equal(otherShop.candidateIndex, 0);
  assert.equal((await request(first, secondTarget.port, '/switched')).status, 200);
  assert.equal((await request(otherShop, firstTarget.port, '/other-shop')).status, 200);
  const selectedPid = first.child.pid;
  await assert.rejects(first.switchCandidate(0, { validate: async () => { throw new Error('Synthetic fixed exit mismatch'); } }));
  assert.equal(first.child.pid, selectedPid);assert.equal(first.candidateIndex, 1);
  assert.equal((await request(first, secondTarget.port, '/rejected-switch')).status, 200);
  await first.switchCandidate(0);
  assert.equal(first.url, url);assert.equal(first.socksPort, socksPort);
  assert.equal((await request(first, firstTarget.port, '/restored')).status, 200);
  assert.equal(otherShop.child.pid, otherPid);
});

test('closing a shop cancels candidate validation without leaking a replacement child', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const connection = { ...remote.connection, proxyOptions: { alternatives: [remote.connection] } };
  const client = runtime(add, connection);await client.listen();
  const child = client.child, port = client.port;
  let entered;
  const validationStarted = new Promise(resolve => { entered = resolve; });
  const changing = client.switchCandidate(1, { validate: async (_, signal) => {
    entered();
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  } });
  const rejected = assert.rejects(changing, { name: 'AbortError' });
  await validationStarted;await client.close();await rejected;
  assert.equal(client.closed, true);assert.equal(client.entry.closed, true);
  await assertStopped(child, port);
});

test('route startup failure restores the original real proxy with unchanged local authentication', { timeout: 20000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const reserved = await reservePorts(1), refusedPort = reserved.ports[0];await reserved.release();
  const client = runtime(add, { ...remote.connection, proxyOptions: { alternatives: [
    { protocol: 'ssh', host: '127.0.0.1', port: refusedPort, username: 'synthetic', password: 'synthetic' }
  ] } });
  await client.listen();const originalUrl = client.url, socksPort = client.socksPort;
  await assert.rejects(client.switchCandidate(1));
  assert.equal(client.candidateIndex, 0);assert.equal(client.url, originalUrl);assert.equal(client.socksPort, socksPort);
  assert.equal((await request(client, destination.port, '/rollback')).status, 200);
});

test('terminal recovery while a route switch waits cannot deadlock close', { timeout: 15000 }, async t => {
  const add = scope(t), destination = await target(add), remote = await upstream(add, 'http', destination.port);
  const pool = new ProxyPool(resources);add(() => pool.close());
  const client = runtime(add, { ...remote.connection, proxyOptions: { alternatives: [remote.connection] } }, { pool });
  await client.listen();const child = client.child, port = client.port;
  pool.startSession = async () => { throw new Error('Synthetic restart spawn failure'); };
  const terminal = once(client, 'failure'), exited = once(child, 'exit');child.kill('SIGKILL');await exited;
  await until(() => Boolean(client.entry.recovering));
  const rejected = assert.rejects(client.switchCandidate(1));
  await terminal;await Promise.all([client.close(), rejected]);
  assert.equal(client.entry.closed, true);assert.equal(pool.sessions.size, 0);
  await assertStopped(child, port);
});
