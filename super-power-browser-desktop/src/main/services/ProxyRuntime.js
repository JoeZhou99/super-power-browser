const net = require('node:net');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { check, waitFor, pause } = require('../runtime/Cancellation');
const { proxyError, safeProxyMessage, proxyHost, normalizeProxy, upstream, compileXrayConfig } = require('./ProxyConfig');
const { resolveProxyBinary, reservePorts, launchChild, waitListening, verifyXrayInbounds, stopChild } = require('./ProxyProcess');
const { SsrTunnel } = require('./SsrTunnel');
const { Socks4Client } = require('./Socks4Client');

class SshTunnel {
  constructor(config,{Client,signal,onFailure=()=>{},timeout=15000}={}){
    this.config=config;this.Client=Client||require('ssh2').Client;this.signal=signal;this.onFailure=onFailure;this.timeout=timeout;
    this.sockets=new Set();this.channels=new Set();this.closed=false;this.ready=false;
  }
  async listen(){
    check(this.signal);
    this.client=new this.Client();
    this.client.on('error',error=>{this.failure=proxyError(safeProxyMessage(error));if(this.ready)this.fail();});
    this.client.on('close',()=>{if(!this.closed&&this.ready){this.failure=proxyError('SSH 代理连接已断开');this.fail();}});
    try{
      await new Promise((resolve,reject)=>{
        let done=false;
        const finish=error=>{if(done)return;done=true;clearTimeout(timer);this.signal?.removeEventListener('abort',abort);this.client.removeListener('ready',ready);this.client.removeListener('error',failed);this.client.removeListener('close',disconnected);error?reject(error):resolve();};
        const ready=()=>finish(),failed=error=>finish(proxyError(safeProxyMessage(error))),disconnected=()=>finish(proxyError('SSH 代理在连接完成前已断开'));
        const abort=()=>finish(this.signal.reason||proxyError('代理连接已取消'));
        const timer=setTimeout(()=>finish(proxyError('SSH 代理连接超时')),this.timeout);
        this.client.once('ready',ready);this.client.once('error',failed);this.client.once('close',disconnected);this.signal?.addEventListener('abort',abort,{once:true});
        try{this.client.connect({...this.config,readyTimeout:this.timeout,keepaliveInterval:15000,keepaliveCountMax:3});}catch(error){failed(error);}
      });
      check(this.signal);if(this.closed||this.failure)throw this.failure||proxyError('SSH 代理服务已关闭');this.ready=true;
      this.server=net.createServer(socket=>this.accept(socket));
      await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(0,'127.0.0.1',resolve);});
      this.server.on('error',()=>this.fail());
      check(this.signal);if(this.closed||this.failure){await new Promise(resolve=>this.server.close(resolve));throw this.failure||proxyError('SSH 代理服务已关闭');}this.port=this.server.address().port;return this;
    }catch(error){await this.close();throw error;}
  }
  accept(socket){
    this.sockets.add(socket);socket.once('close',()=>this.sockets.delete(socket));socket.on('error',()=>{});
    if(this.closed||this.failure){socket.destroy();return;}
    let pending=Buffer.alloc(0),stage='greeting';
    socket.setTimeout(this.timeout,()=>socket.destroy());
    const reject=code=>{socket.end(Buffer.from([5,code,0,1,0,0,0,0,0,0]));};
    const parse=chunk=>{
      pending=Buffer.concat([pending,chunk]);
      if(pending.length>65536){socket.destroy();return;}
      if(stage==='greeting'){
        if(pending.length<2)return;
        if(pending[0]!==5||pending[1]===0){socket.destroy();return;}
        if(pending.length<2+pending[1])return;
        if(!pending.subarray(2,2+pending[1]).includes(0)){socket.end(Buffer.from([5,255]));return;}
        pending=pending.subarray(2+pending[1]);stage='request';socket.write(Buffer.from([5,0]));
      }
      if(stage!=='request'||pending.length<4)return;
      if(pending[0]!==5||pending[1]!==1||pending[2]!==0){reject(7);return;}
      const kind=pending[3];let length,offset=4,host;
      if(kind===1)length=4;
      else if(kind===4)length=16;
      else if(kind===3){if(pending.length<5)return;length=pending[4];offset=5;if(!length){reject(8);return;}}
      else{reject(8);return;}
      if(pending.length<offset+length+2)return;
      if(kind===1)host=[...pending.subarray(offset,offset+4)].join('.');
      else if(kind===4)host=Array.from({length:8},(_,i)=>pending.readUInt16BE(offset+i*2).toString(16)).join(':');
      else host=pending.subarray(offset,offset+length).toString('utf8');
      const port=pending.readUInt16BE(offset+length),head=pending.subarray(offset+length+2);
      if(!port||/[\x00-\x20\x7f]/.test(host)){reject(8);return;}
      stage='connecting';socket.pause();socket.removeListener('data',parse);
      try{this.client.forwardOut('127.0.0.1',socket.remotePort||0,host,port,(error,channel)=>{
        if(error||this.closed||this.failure||socket.destroyed){channel?.destroy();if(!socket.destroyed)reject(5);return;}
        this.channels.add(channel);channel.on('error',()=>socket.destroy());
        channel.once('close',()=>{this.channels.delete(channel);socket.destroy();});socket.once('close',()=>channel.destroy());
        socket.setTimeout(0);socket.write(Buffer.from([5,0,0,1,127,0,0,1,0,0]));
        if(head.length)channel.write(head);socket.pipe(channel).pipe(socket);socket.resume();
      });}catch{reject(5);}
    };
    socket.on('data',parse);
  }
  fail(){if(this.closed)return;void this.close();this.onFailure(this.failure||proxyError('SSH 代理连接失败'));}
  async close(){
    if(this.closing)return this.closing;this.closed=true;
    this.closing=(async()=>{for(const socket of this.sockets)socket.destroy();for(const channel of this.channels)channel.destroy();this.client?.destroy();if(this.server?.listening)await new Promise(resolve=>this.server.close(resolve));})();
    return this.closing;
  }
}


function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

class XraySession {
  constructor(config, options, pool, key) {
    this.config = config; this.options = options; this.pool = pool; this.key = key;
    this.owners = new Set(); this.controller = new AbortController(); this.closed = false; this.restarts = 0;
    this.username = randomBytes(8).toString('hex'); this.password = randomBytes(24).toString('hex');
  }
  get url() { return `http://${this.username}:${this.password}@127.0.0.1:${this.port}`; }
  async start() {
    const signal = this.controller.signal;
    this.startFailure = null;
    let reservation;
    try {
      check(signal);
      const executable = await resolveProxyBinary(this.options.resources);
      if (!this.port) {
        reservation = await reservePorts(2);
        [this.port, this.socksPort] = reservation.ports;
      }
      if (['ssh', 'ssr', 'socks4', 'socks4a'].includes(this.config.protocol)) {
        const Type = this.config.protocol === 'ssr' ? SsrTunnel : SshTunnel;
        const Client = ['socks4', 'socks4a'].includes(this.config.protocol) ? Socks4Client : this.options.Client;
        this.helper = new Type(this.config, { Client, resources: this.options.resources, signal, onFailure: error => { if (this.ready) this.failed(error); else this.startFailure = error; } });
        await this.helper.listen();
      }
      check(signal);
      const configuration = compileXrayConfig(this.config, {
        httpPort: this.port, socksPort: this.socksPort, username: this.username, password: this.password,
        helperProxy: this.helper ? { protocol: 'socks5', host: '127.0.0.1', port: this.helper.port } : undefined,
      });
      await reservation?.release(); reservation = null;
      check(signal);
      const child = launchChild(executable, ['run', '-config', 'stdin:']);
      this.child = child;
      child.once('exit', () => {
        if (this.ready && this.child === child && !this.closed) this.failed(proxyError('本地代理进程已退出'));
      });
      child.stdin.end(JSON.stringify(configuration));
      await waitListening(child, [this.port, this.socksPort], signal, 10000,
        () => verifyXrayInbounds(this.socksPort, this.username, this.password, signal));
      if (this.startFailure) throw this.startFailure;
      this.ready = true; this.startedAt = Date.now();
      return this;
    } catch (error) {
      await reservation?.release().catch(() => {});
      await Promise.allSettled([stopChild(this.child), this.helper?.close()]);
      throw error;
    }
  }
  failed(error) {
    if (this.closed || this.recovering || this.failure) return;
    if (this.switching) { this.ready = false; return; }
    this.ready = false;
    if (Date.now() - this.startedAt > 30000) this.restarts = 0;
    this.recovering = (async () => {
      while (!this.closed && this.owners.size && this.restarts < 3) {
        this.restarts++;
        await Promise.allSettled([stopChild(this.child), this.helper?.close()]);
        this.child = null; this.helper = null;
        try { await pause(150 * 2 ** (this.restarts - 1), this.controller.signal); await this.pool.startSession(this); return; }
        catch (cause) { error = cause; }
      }
      if (this.closed) return;
      this.failure = proxyError('代理服务多次异常退出，请检查代理配置后重新打开');
      for (const owner of this.owners) owner.emit('failure', this.failure);
      // A pending route switch may be awaiting this recovery while close waits
      // for that switch. Begin cleanup without making recovery wait for it.
      void this.close();
    })().finally(() => { this.recovering = null; });
  }
  async switchTo(config, validate) {
    if (this.closed || this.failure) throw this.failure || proxyError('代理服务已关闭');
    if (this.owners.size !== 1) throw proxyError('共享代理会话不能切换线路');
    if (this.switching) throw proxyError('正在切换线路，请稍后重试');
    this.switching = (async () => {
      await (this.recovering || this.starting);
      check(this.controller.signal);
      // Validate through an isolated candidate before existing browser traffic
      // can use it. The authorized fixed exit belongs to the shop, not a relay.
      if (validate) await validate(config, this.controller.signal);
      check(this.controller.signal);
      const previous = this.config;
      this.ready = false;
      await Promise.allSettled([stopChild(this.child), this.helper?.close()]);
      this.child = null; this.helper = null; this.config = config;
      try {
        check(this.controller.signal);
        await this.pool.startSession(this);
        this.restarts = 0;
      } catch (error) {
        this.config = previous;
        if (!this.closed) {
          try { await this.pool.startSession(this); }
          catch {
            this.failure = proxyError('线路切换失败且原线路无法恢复，请重新打开店铺');
            for (const owner of this.owners) owner.emit('failure', this.failure);
            void this.close();
          }
        }
        throw error;
      }
    })().finally(() => {
      this.switching = null;
      if (!this.closed && !this.failure && !this.ready) this.failed(proxyError('本地代理进程已退出'));
    });
    return this.switching;
  }
  async close() {
    if (this.closing) return this.closing;
    this.closed = true; this.ready = false; this.controller.abort();
    if (this.pool.sessions.get(this.key) === this) this.pool.sessions.delete(this.key);
    this.closing = (async () => {
      await Promise.allSettled([stopChild(this.child), this.helper?.close()]);
      await this.starting?.catch(() => {});
      await this.switching?.catch(() => {});
      // An async spawn/helper may finish between cancellation and the first close.
      await Promise.allSettled([stopChild(this.child), this.helper?.close()]);
    })();
    return this.closing;
  }
}

class ProxyPool {
  constructor(resources) { this.resources = resources; this.sessions = new Map(); this.activeStarts = 0; this.queue = []; }
  async startSession(session) {
    const signal = session.controller.signal;
    check(signal);
    if (this.activeStarts >= 4) await new Promise((resolve, reject) => {
      const next = () => { signal.removeEventListener('abort', abort); this.activeStarts++; resolve(); };
      const abort = () => { const index = this.queue.indexOf(next); if (index >= 0) this.queue.splice(index, 1); reject(signal.reason); };
      this.queue.push(next); signal.addEventListener('abort', abort, { once: true });
    });
    else this.activeStarts++;
    try { check(signal); return await session.start(); }
    finally { this.activeStarts--; this.queue.shift()?.(); }
  }
  acquire(config, owner, options = {}) {
    // A shop with selectable routes owns its ports. Ordinary connections still
    // share one child, but switching can never redirect another shop's traffic.
    const key = options.isolated ? randomBytes(24).toString('hex') : createHash('sha256').update(JSON.stringify(stable(config))).digest('hex');
    let session = this.sessions.get(key);
    if (!session || session.closed || session.failure) {
      session = new XraySession(config, { ...options, resources: this.resources }, this, key);
      this.sessions.set(key, session);
      session.starting = this.startSession(session);
      session.starting.catch(() => { if (this.sessions.get(key) === session) this.sessions.delete(key); });
    }
    session.owners.add(owner);
    return session;
  }
  async release(session, owner) {
    session.owners.delete(owner);
    if (!session.owners.size) await session.close();
  }
  async close() { await Promise.allSettled([...this.sessions.values()].map(session => session.close())); }
}
const pools = new Map();
function poolFor(resources) {
  resources = path.resolve(resources);
  if (!pools.has(resources)) pools.set(resources, new ProxyPool(resources));
  return pools.get(resources);
}

class ProxyRuntime extends EventEmitter {
  constructor(proxy, { signal, resources = process.resourcesPath || path.resolve(__dirname, '../../..'), pool, Client } = {}) {
    super();
    this.config = normalizeProxy(proxy); this.signal = signal; this.Client = Client;
    const { alternatives = [], ...primaryOptions } = this.config.proxyOptions;
    this.candidates = [{ ...this.config, proxyOptions: primaryOptions }, ...alternatives.map(candidate => {
      const { alternatives: unused, ...proxyOptions } = candidate.proxyOptions;
      return { ...candidate, proxyOptions };
    })];
    this.candidateIndex = 0;
    this.pool = pool || (Client ? new ProxyPool(resources) : poolFor(resources)); this.closed = false;
  }
  get port() { return this.entry?.port; }
  get socksPort() { return this.entry?.socksPort; }
  get tunnel() { return this.entry?.helper; }
  get child() { return this.entry?.child; }
  get url() { if (!this.entry?.ready || this.closed) throw proxyError('代理服务尚未就绪'); return this.entry.url; }
  get browserUrl() { return `http://127.0.0.1:${this.port}`; }
  get socksUrl() { return `socks5://${this.entry.username}:${this.entry.password}@127.0.0.1:${this.socksPort}`; }
  candidate(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.candidates.length) throw proxyError('只能使用当前店铺已配置的线路');
    return this.candidates[index];
  }
  async switchCandidate(index, { validate } = {}) {
    const candidate = this.candidate(index);
    if (this.closed || !this.entry) throw proxyError('代理服务已关闭');
    if (this.switching) throw proxyError('正在切换线路，请稍后重试');
    if (index === this.candidateIndex) return { candidateIndex: index };
    this.switching = this.entry.switchTo(candidate, validate).then(() => {
      this.candidateIndex = index;
      return { candidateIndex: index };
    }).catch(error => { if (error?.name === 'AbortError') throw error; throw proxyError(safeProxyMessage(error)); })
      .finally(() => { this.switching = null; });
    return this.switching;
  }
  async listen() {
    if (this.closed) throw proxyError('代理服务已关闭');
    if (this.starting) return this.starting;
    this.starting = (async () => {
      try {
        check(this.signal);
        this.entry = this.pool.acquire(this.candidates[0], this, { Client: this.Client, isolated: this.candidates.length > 1 });
        this.abort = () => { void this.close(); };
        this.signal?.addEventListener('abort', this.abort, { once: true });
        await waitFor(this.entry.recovering || this.entry.starting, this.signal);
        check(this.signal);
        if (this.closed || this.entry.closed || this.entry.failure) throw this.entry.failure || proxyError('代理服务已关闭');
        return this;
      } catch (error) {
        await this.close();
        if (error?.name === 'AbortError') throw error;
        throw proxyError(safeProxyMessage(error));
      }
    })();
    return this.starting;
  }
  async close() {
    if (this.closing) return this.closing;
    this.closed = true;
    this.signal?.removeEventListener('abort', this.abort);
    this.closing = this.entry ? this.pool.release(this.entry, this) : Promise.resolve();
    return this.closing;
  }
}
async function closeAllProxyRuntimes() { await Promise.allSettled([...pools.values()].map(pool => pool.close())); }
module.exports = { ProxyRuntime, ProxyPool, SshTunnel, closeAllProxyRuntimes, upstream, proxyHost, normalizeProxy, proxyError, safeProxyMessage };
