const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { ProxyRuntime } = require('../src/main/services/ProxyRuntime');
const processTools = require('../src/main/services/ProxyProcess');
const { prepareServerFixture } = require('./prepare-ssr-test-fixture.cjs');
const ssrManifest = require('../proxy-runtime/ssr-manifest.json');

const resources = path.resolve(__dirname, '..');
const host = Object.values(os.networkInterfaces()).flat().find(item => item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.'))?.address;
const supported = Boolean(ssrManifest.platforms[`${process.platform}-${process.arch}`]);
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

async function listen(server, address = host) {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, address, resolve));
  return server.address().port;
}

async function reachable(address, port) {
  return new Promise(resolve => {
    const socket = net.connect(port, address);
    let done = false;
    const finish = result => { if (done) return; done = true; socket.destroy(); resolve(result); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(200, () => finish(false));
  });
}

async function until(predicate, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await predicate()) return; await pause(25); }
  assert.fail('Timed out waiting for the local SSR fixture');
}

async function fixtures(add) {
  const requests = [], sockets = new Set();
  const target = http.createServer((request, response) => {
    requests.push({ path: request.url, authorization: request.headers['proxy-authorization'] });
    response.setHeader('Connection', 'close');
    response.end('through-local-ssr:' + request.url);
  });
  target.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  const targetPort = await listen(target);
  add(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => target.close(resolve)); });
  const executable = await prepareServerFixture();
  const reservation = net.createServer();
  const serverPort = await listen(reservation);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-ssr-integration-'));
  add(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'server.json');
  const password = randomBytes(24).toString('hex');
  await fs.writeFile(file, JSON.stringify({
    password, method: 'aes-128-ctr', protocol: 'auth_aes128_md5', protocol_param: '',
    obfs: 'plain', obfs_param: '', udp: false, idle_timeout: 30, connect_timeout: 3,
    server_settings: { listen_address: host, listen_port: serverPort },
  }), { mode: 0o600 });
  await new Promise(resolve => reservation.close(resolve));
  const server = processTools.launchChild(executable, ['-c', file]);
  server.stdin.end();
  add(() => processTools.stopChild(server));
  await until(async () => {
    if (server.failure) throw server.failure;
    assert.equal(server.exitCode, null, 'official SSR server exited before listening');
    return reachable(host, serverPort);
  });
  return { targetPort, requests, connection: {
    protocol: 'ssr', host, port: serverPort, password,
    proxyOptions: { encryption: 'aes-128-ctr', transportProtocol: 'auth_aes128_md5', obfs: 'plain' },
  } };
}

function request(client, targetPort, suffix, authorized = true) {
  const auth = new URL(client.url);
  const headers = { Connection: 'close' };
  if (authorized) headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(decodeURIComponent(auth.username) + ':' + decodeURIComponent(auth.password)).toString('base64');
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: client.port, path: `http://${host}:${targetPort}${suffix}`, headers, agent: false }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
      response.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(new Error('Local SSR fixture request timed out')));
    req.on('error', reject);
  });
}

test('real Xray -> SsrTunnel -> official SSR server reaches only an on-machine HTTP target', { timeout: 30000, skip: !host || !supported }, async t => {
  const add = scope(t), fixture = await fixtures(add);
  const client = new ProxyRuntime(fixture.connection, { resources });
  add(() => client.close());
  await client.listen();
  const helper = client.entry.helper, xray = client.child;
  assert.ok(helper.child.pid && xray.pid && helper.child.pid !== xray.pid);
  assert.deepEqual((await fs.readdir(helper.directory).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))), []);
  assert.equal((await request(client, fixture.targetPort, '/unauthorized', false)).status, 407);
  assert.equal(fixture.requests.length, 0);
  assert.deepEqual(await request(client, fixture.targetPort, '/roundtrip'), { status: 200, body: 'through-local-ssr:/roundtrip' });
  assert.deepEqual(fixture.requests, [{ path: '/roundtrip', authorization: undefined }]);
  const port = client.port, helperPort = helper.port;
  await client.close();
  await until(() => (helper.child.exitCode !== null || helper.child.signalCode !== null) && (xray.exitCode !== null || xray.signalCode !== null));
  assert.equal(await reachable('127.0.0.1', port), false);
  assert.equal(await reachable('127.0.0.1', helperPort), false);
});

test('SSR close or cancellation while releasing its reserved port cannot leave a child or credentials', { timeout: 15000, skip: !supported }, async t => {
  const modulePath = require.resolve('../src/main/services/SsrTunnel');
  const originalModule = require.cache[modulePath];
  const originalReserve = processTools.reservePorts;
  for (const action of ['abort', 'close']) {
    const controller = new AbortController();
    let releaseStarted, releaseFinish, reservation;
    const started = new Promise(resolve => { releaseStarted = resolve; });
    const released = new Promise(resolve => { releaseFinish = resolve; });
    const stub = t.mock.method(processTools, 'reservePorts', async count => {
      reservation = await originalReserve(count);
      let first = true;
      return { ports: reservation.ports, release: async () => {
        await reservation.release();
        if (first) { first = false; releaseStarted(); await released; }
      } };
    });
    delete require.cache[modulePath];
    const { SsrTunnel } = require(modulePath);
    const tunnel = new SsrTunnel({ host: '192.0.2.1', port: 9, password: 'synthetic-only', proxyOptions: { encryption: 'aes-128-ctr' } }, { resources, signal: controller.signal });
    const operation = tunnel.listen();
    const rejected = assert.rejects(operation, action === 'abort' ? { name: 'AbortError' } : /已关闭/);
    try {
      await started;
      if (action === 'abort') controller.abort(); else await tunnel.close();
      releaseFinish();
      await rejected;
      assert.equal(tunnel.child, undefined);
      assert.equal(await reachable('127.0.0.1', reservation.ports[0]), false);
      await assert.rejects(fs.stat(tunnel.directory), { code: 'ENOENT' });
    } finally {
      releaseFinish(); await tunnel.close(); stub.mock.restore();
      require.cache[modulePath] = originalModule;
    }
  }
});

test('SSR cancellation immediately after spawning stops the real helper and removes its temporary config', { timeout: 15000, skip: !supported }, async t => {
  const modulePath = require.resolve('../src/main/services/SsrTunnel');
  const originalModule = require.cache[modulePath];
  const originalLaunch = processTools.launchChild;
  const controller = new AbortController();
  let child;
  const stub = t.mock.method(processTools, 'launchChild', (...args) => {
    child = originalLaunch(...args);
    queueMicrotask(() => controller.abort());
    return child;
  });
  delete require.cache[modulePath];
  const { SsrTunnel } = require(modulePath);
  const tunnel = new SsrTunnel({ host: '192.0.2.1', port: 9, password: 'synthetic-only', proxyOptions: { encryption: 'aes-128-ctr' } }, { resources, signal: controller.signal });
  try {
    await assert.rejects(tunnel.listen(), { name: 'AbortError' });
    assert.ok(child?.pid, 'the fixture must exercise cancellation after a real spawn');
    assert.ok(child.exitCode !== null || child.signalCode !== null);
    assert.equal(await reachable('127.0.0.1', tunnel.port), false);
    await assert.rejects(fs.stat(tunnel.directory), { code: 'ENOENT' });
  } finally {
    await tunnel.close(); await processTools.stopChild(child); stub.mock.restore();
    require.cache[modulePath] = originalModule;
  }
});
