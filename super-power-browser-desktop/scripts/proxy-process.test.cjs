const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const dgram = require('node:dgram');
const { reservePorts } = require('../src/main/services/ProxyProcess');

async function bindTcp(port) {
  const server = net.createServer();
  try {
    await new Promise((resolve, reject) => server.once('error', reject).listen({ host: '127.0.0.1', port, exclusive: true }, resolve));
    return server;
  } catch (error) { server.close(); throw error; }
}

async function bindUdp(port) {
  const socket = dgram.createSocket('udp4');
  try {
    await new Promise((resolve, reject) => { socket.once('error', reject); socket.bind({ address: '127.0.0.1', port, exclusive: true }, resolve); });
    return socket;
  } catch (error) { socket.close(); throw error; }
}

test('proxy port reservations cover TCP and UDP, then release both idempotently', async () => {
  const reservation = await reservePorts(2);
  try {
    assert.equal(new Set(reservation.ports).size, 2);
    for (const port of reservation.ports) {
      await assert.rejects(bindTcp(port), error => ['EADDRINUSE', 'EACCES'].includes(error.code));
      await assert.rejects(bindUdp(port), error => ['EADDRINUSE', 'EACCES'].includes(error.code));
    }
    await Promise.all([reservation.release(), reservation.release()]);
    for (const port of reservation.ports) {
      const tcp = await bindTcp(port), udp = await bindUdp(port);
      await Promise.all([new Promise(resolve => tcp.close(resolve)), new Promise(resolve => udp.close(resolve))]);
    }
  } finally { await reservation.release(); }
});

test('a UDP-selected port already occupied by TCP is retried without disturbing its owner', async t => {
  const occupied = await bindTcp(0), occupiedPort = occupied.address().port;
  let intercepted = false;
  const original = dgram.Socket.prototype.bind;
  const stub = t.mock.method(dgram.Socket.prototype, 'bind', function (options, callback) {
    if (!intercepted && options.port === 0) { intercepted = true; options = { ...options, port: occupiedPort }; }
    return original.call(this, options, callback);
  });
  let reservation;
  try {
    reservation = await reservePorts(1);
    assert.equal(intercepted, true);
    assert.notEqual(reservation.ports[0], occupiedPort);
    assert.equal(occupied.listening, true);
    const releasedCandidate = await bindUdp(occupiedPort);
    await new Promise(resolve => releasedCandidate.close(resolve));
  } finally {
    stub.mock.restore(); await reservation?.release();
    await new Promise(resolve => occupied.close(resolve));
  }
});
