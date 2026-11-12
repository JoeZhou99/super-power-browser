const net = require('node:net');
const { check } = require('../runtime/Cancellation');

// The browser gets a separate loopback entrance. Exit checks use the original
// authenticated Xray entrance, so verifying a route never unlocks shop traffic.
// This forwards raw TCP bytes; protocols and upstream authentication stay in Xray.
class BrowserProxyGate {
  constructor(runtime, { signal } = {}) {
    this.runtime = runtime; this.signal = signal; this.allowed = false;
    this.closed = false; this.sockets = new Set();
  }
  get url() {
    const address = new URL(this.runtime.url);
    address.hostname = '127.0.0.1'; address.port = String(this.port);
    return address.href;
  }
  get browserUrl() { return `http://127.0.0.1:${this.port}`; }
  async listen() {
    check(this.signal);
    if (this.closed) throw new Error('店铺网络入口已关闭');
    if (this.server) return this;
    this.server = net.createServer(socket => {
      this.track(socket);
      if (!this.allowed || this.closed || this.signal?.aborted) { socket.destroy(); return; }
      const upstream = net.connect({ host: '127.0.0.1', port: this.runtime.port });
      this.track(upstream);
      socket.once('close', () => upstream.destroy());
      upstream.once('close', () => socket.destroy());
      socket.pipe(upstream).pipe(socket);
    });
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, '127.0.0.1', resolve);
    });
    this.server.on('error', () => this.block());
    this.port = this.server.address().port;
    this.abort = () => { void this.close(); };
    this.signal?.addEventListener('abort', this.abort, { once: true });
    if (this.signal?.aborted) { await this.close(); check(this.signal); }
    return this;
  }
  track(socket) {
    this.sockets.add(socket);
    socket.on('error', () => socket.destroy());
    socket.once('close', () => this.sockets.delete(socket));
  }
  allow() {
    check(this.signal);
    if (this.closed) throw new Error('店铺网络入口已关闭');
    this.allowed = true;
  }
  block() {
    this.allowed = false;
    for (const socket of this.sockets) socket.destroy();
  }
  async close() {
    if (this.closing) return this.closing;
    this.closed = true; this.block();
    this.signal?.removeEventListener('abort', this.abort);
    this.closing = this.server?.listening
      ? new Promise(resolve => this.server.close(resolve)) : Promise.resolve();
    return this.closing;
  }
}
module.exports = { BrowserProxyGate };
