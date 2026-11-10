const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { ProxyRuntime } = require('../src/main/services/ProxyRuntime');

async function server(t, value) {
  const sockets = new Set();
  value.on('connection', socket => { sockets.add(socket);socket.on('error', () => {});socket.once('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => value.once('error', reject).listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const socket of sockets) socket.destroy();await new Promise(resolve => value.close(resolve)); });
  return value.address().port;
}
function request(runtime, targetPort, host = '127.0.0.1') {
  const local = new URL(runtime.url);
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: runtime.port, path: `http://${host}:${targetPort}/`, agent: false,
      headers: { 'Proxy-Authorization': 'Basic ' + Buffer.from(local.username + ':' + local.password).toString('base64'), Connection: 'close' },
    }, response => { let body = '';response.on('data', part => { body += part; });response.on('end', () => resolve({ status: response.statusCode, body }));response.on('error', reject); });
    req.setTimeout(5000, () => req.destroy(new Error('Synthetic request timeout')));req.on('error', reject);
  });
}

test('HTTPS upstream uses configured SNI and verifies certificates unless explicitly disabled', { timeout: 20000 }, async t => {
  let reached = 0, sni, authenticated = 0;
  const targetPort = await server(t, http.createServer((req, res) => { reached++;assert.equal(req.headers['proxy-authorization'], undefined);res.end('tls-proxy-target'); }));
  const fixtures = path.join(path.dirname(require.resolve('ssh2/package.json')), 'test/fixtures');
  const gateway = https.createServer({ key: fs.readFileSync(path.join(fixtures, 'https_key.pem')), cert: fs.readFileSync(path.join(fixtures, 'https_cert.pem')) });
  gateway.on('secureConnection', socket => { sni = socket.servername; });
  gateway.on('tlsClientError', () => {});
  const expected = 'Basic ' + Buffer.from('user:p@ss%"\\').toString('base64');
  gateway.on('connect', (req, socket, head) => {
    if (req.url !== `127.0.0.1:${targetPort}` || req.headers['proxy-authorization'] !== expected) { socket.end('HTTP/1.1 407 Proxy Authentication Required\r\nConnection: close\r\n\r\n');return; }
    authenticated++;
    const destination = net.connect(targetPort, '127.0.0.1', () => { socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if (head.length) destination.write(head);socket.pipe(destination).pipe(socket); });
    socket.on('close', () => destination.destroy());destination.on('close', () => socket.destroy());destination.on('error', () => socket.destroy());
  });
  const port = await server(t, gateway);
  for (const allowInsecure of [false, true]) {
    const runtime = new ProxyRuntime({ protocol: 'https', host: '127.0.0.1', port, username: 'user', password: 'p@ss%"\\', proxyOptions: { tls: { serverName: 'fixture.localhost', allowInsecure } } });
    try {
      await runtime.listen();const result = await request(runtime, targetPort).catch(() => ({ status: 0 }));
      if (allowInsecure) { assert.deepEqual(result, { status: 200, body: 'tls-proxy-target' });assert.equal(sni, 'fixture.localhost'); }
      else { assert.notEqual(result.status, 200);assert.equal(reached, 0); }
    } finally { await runtime.close(); }
  }
  assert.equal(authenticated, 1);assert.equal(reached, 1);
});

for (const protocol of ['socks4', 'socks4a']) test(`${protocol} reaches the target using its actual wire protocol`, { timeout: 15000 }, async t => {
  let forwarded = 0, receivedHost;
  const targetPort = await server(t, http.createServer((_req, res) => res.end(protocol + '-target')));
  const gateway = net.createServer(socket => {
    let pending = Buffer.alloc(0);
    const parse = chunk => {
      pending = Buffer.concat([pending, chunk]);if (pending.length < 9) return;
      const userEnd = pending.indexOf(0, 8);if (userEnd < 0) return;
      const is4a = pending.subarray(4, 8).equals(Buffer.from([0, 0, 0, 1]));
      let end = userEnd + 1, host = [...pending.subarray(4, 8)].join('.');
      if (is4a) { const domainEnd = pending.indexOf(0, end);if (domainEnd < 0) return;host = pending.subarray(end, domainEnd).toString();end = domainEnd + 1; }
      if (pending[0] !== 4 || pending[1] !== 1 || pending.readUInt16BE(2) !== targetPort || !['127.0.0.1', 'localhost'].includes(host) || pending.subarray(8, userEnd).toString() !== 'synthetic-user') { socket.destroy();return; }
      receivedHost = host;forwarded++;socket.removeListener('data', parse);socket.pause();
      const head = pending.subarray(end), destination = net.connect(targetPort, '127.0.0.1', () => {
        socket.write(Buffer.from([0, 90, 0, 0, 127, 0, 0, 1]));if (head.length) destination.write(head);socket.pipe(destination).pipe(socket);socket.resume();
      });
      socket.on('close', () => destination.destroy());destination.on('close', () => socket.destroy());destination.on('error', () => socket.destroy());
    };
    socket.on('data', parse);socket.setTimeout(5000, () => socket.destroy());
  });
  const port = await server(t, gateway), runtime = new ProxyRuntime({ protocol, host: '127.0.0.1', port, username: 'synthetic-user' });
  try {
    await runtime.listen();assert.deepEqual(await request(runtime, targetPort, protocol === 'socks4a' ? 'localhost' : '127.0.0.1'), { status: 200, body: protocol + '-target' });
    assert.equal(forwarded, 1);assert.equal(receivedHost, protocol === 'socks4a' ? 'localhost' : '127.0.0.1');
  } finally { await runtime.close(); }
});
