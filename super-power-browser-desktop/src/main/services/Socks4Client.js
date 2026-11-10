const { EventEmitter } = require('node:events');
const net = require('node:net');
const dns = require('node:dns');
const { domainToASCII } = require('node:url');
const { proxyError } = require('./ProxyConfig');

// The small ssh2 Client-compatible surface lets SshTunnel provide its existing
// loopback SOCKS5 listener. Xray only supports SOCKS5 for outbound connections.
class Socks4Client extends EventEmitter {
  constructor({ lookup = dns.lookup, connect = options => net.connect(options) } = {}) {
    super();
    this.lookup = lookup; this.openSocket = connect;
    this.sockets = new Set(); this.pending = new Set();
    this.closed = false; this.ready = false;
  }
  connect(config) {
    if (this.closed || this.config) throw proxyError('SOCKS4 客户端已关闭或启动');
    if (!['socks4', 'socks4a'].includes(config?.protocol)) throw proxyError('SOCKS4 协议类型不正确');
    if (!config.host || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw proxyError('SOCKS4 地址或端口不正确');
    const user = Buffer.from(config.username || '', 'utf8');
    if (user.includes(0) || user.length > 4096) throw proxyError('SOCKS4 用户标识不正确或过长');
    if (config.password) throw proxyError('SOCKS4 不支持密码认证');
    if (config.proxyOptions?.transit) throw proxyError('SOCKS4 辅助服务暂不支持中转配置');
    this.config = { ...config, user };
    this.timeout = Number.isFinite(config.readyTimeout) && config.readyTimeout > 0 ? config.readyTimeout : 15000;
    queueMicrotask(() => { if (!this.closed) { this.ready = true; this.emit('ready'); } });
    return this;
  }
  forwardOut(_sourceHost, _sourcePort, targetHost, targetPort, callback) {
    let socket, done = false, response = Buffer.alloc(0);
    const finish = (error, channel) => {
      if (done) return;
      done = true; clearTimeout(timer); this.pending.delete(cancel);
      if (socket) {
        socket.removeListener('data', received); socket.removeListener('error', failed);
        socket.removeListener('end', disconnected); socket.removeListener('close', disconnected);
        if (error) socket.destroy();
      }
      queueMicrotask(() => callback(error || null, channel));
    };
    const cancel = () => finish(proxyError('SOCKS4 转发已取消'));
    const failed = () => finish(proxyError('SOCKS4 上游连接失败'));
    const disconnected = () => finish(proxyError('SOCKS4 上游在握手完成前断开'));
    const received = chunk => {
      response = Buffer.concat([response, chunk]);
      if (response.length < 8) return;
      if (response[0] !== 0 || response[1] !== 0x5a) {
        finish(proxyError('SOCKS4 上游拒绝连接或返回无效响应'));
        return;
      }
      socket.pause();
      const extra = response.subarray(8);
      finish(null, socket);
      if (extra.length) socket.unshift(extra);
    };
    const timer = setTimeout(() => finish(proxyError('SOCKS4 上游握手超时')), this.timeout || 15000);
    this.pending.add(cancel);
    if (this.closed || !this.ready) { cancel(); return; }
    if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535 || typeof targetHost !== 'string' || /[\x00-\x20\x7f]/.test(targetHost)) {
      finish(proxyError('SOCKS4 目标地址或端口不正确')); return;
    }
    const version = net.isIP(targetHost);
    if (version === 6) { finish(proxyError('SOCKS4 不支持 IPv6 目标地址')); return; }
    const domain = version ? '' : domainToASCII(targetHost);
    if (!version && (!domain || Buffer.byteLength(domain) > 253)) { finish(proxyError('SOCKS4 目标域名不正确')); return; }
    const open = (address, remoteDomain = '') => {
      if (done || this.closed) return;
      if (!net.isIPv4(address)) { finish(proxyError('SOCKS4 无法解析目标 IPv4 地址')); return; }
      const header = Buffer.alloc(8);
      header[0] = 4; header[1] = 1; header.writeUInt16BE(targetPort, 2);
      address.split('.').forEach((part, index) => { header[4 + index] = Number(part); });
      const request = Buffer.concat([header, this.config.user, Buffer.from([0]), ...(remoteDomain ? [Buffer.from(remoteDomain, 'ascii'), Buffer.from([0])] : [])]);
      try {
        socket = this.openSocket({host:this.config.host, port:this.config.port});
        this.sockets.add(socket);
        socket.once('close', () => this.sockets.delete(socket));
        // The stream can emit a late error between handshake completion and its
        // caller attaching listeners; channel owners still receive that event.
        socket.on('error', () => {});
        socket.once('error', failed); socket.once('end', disconnected); socket.once('close', disconnected);
        socket.on('data', received);
        socket.once('connect', () => { if (!done) socket.write(request); });
      } catch { failed(); }
    };
    if (version === 4) { open(targetHost); return; }
    if (this.config.protocol === 'socks4a') { open('0.0.0.1', domain); return; }
    try {
      this.lookup(domain, {family:4}, (error, address) => {
        if (done || this.closed) return;
        if (error) finish(proxyError('SOCKS4 无法解析目标 IPv4 地址'));
        else open(address);
      });
    } catch { finish(proxyError('SOCKS4 无法解析目标 IPv4 地址')); }
  }
  end() { return this.destroy(); }
  destroy() {
    if (this.closed) return this;
    this.closed = true; this.ready = false;
    for (const cancel of [...this.pending]) cancel();
    for (const socket of this.sockets) socket.destroy();
    queueMicrotask(() => this.emit('close'));
    return this;
  }
}

module.exports = { Socks4Client };
