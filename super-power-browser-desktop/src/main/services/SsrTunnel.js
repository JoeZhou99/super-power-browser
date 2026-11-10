const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { proxyError } = require('./ProxyConfig');
const { check } = require('../runtime/Cancellation');
const { resolveProxyBinary, reservePorts, launchChild, waitListening, stopChild } = require('./ProxyProcess');

class SsrTunnel {
  constructor(config, { resources, signal, onFailure = () => {} }) {
    this.config = config; this.resources = resources; this.signal = signal; this.onFailure = onFailure; this.closed = false;
  }
  async listen() {
    check(this.signal);
    const executable = await resolveProxyBinary(this.resources, 'ssr');
    const reservation = await reservePorts(1);
    this.port = reservation.ports[0];
    try {
      this.directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-ssr-'));
      const options = this.config.proxyOptions;
      const file = path.join(this.directory, 'config.json');
      await fs.writeFile(file, JSON.stringify({
        password: this.config.password, method: options.encryption,
        protocol: options.transportProtocol || 'origin', protocol_param: options.protocolParameter || '',
        obfs: options.obfs || 'plain', obfs_param: options.obfsParameter || '',
        udp: true, idle_timeout: 300, connect_timeout: 10, udp_timeout: 10,
        client_settings: { server: this.config.host, server_port: this.config.port, listen_address: '127.0.0.1', listen_port: this.port },
      }), { mode: 0o600 });
      check(this.signal);
      await reservation.release();
      check(this.signal);
      if (this.closed) throw proxyError('SSR 代理服务已关闭');
      this.child = launchChild(executable, ['-c', file]);
      this.child.stdin.end();
      this.child.once('exit', () => { if (this.ready && !this.closed) this.onFailure(proxyError('SSR 代理进程已退出')); });
      await waitListening(this.child, [this.port], this.signal);
      this.ready = true;
      return this;
    } catch (error) { await reservation.release().catch(() => {}); await this.close(); await stopChild(this.child); throw error; }
    finally { if (this.directory) await fs.rm(this.directory, { recursive: true, force: true }); }
  }
  async close() {
    if (this.closing) return this.closing;
    this.closed = true;
    this.closing = stopChild(this.child);
    return this.closing;
  }
}
module.exports = { SsrTunnel };
