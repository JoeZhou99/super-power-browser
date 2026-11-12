const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { createHash } = require('node:crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { ProxyRuntime, proxyError, safeProxyMessage } = require('./ProxyRuntime');
const { check } = require('../runtime/Cancellation');

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
}
function proxySnapshotId(proxy) {
  const connection = {};
  for (const key of ['protocol', 'host', 'port', 'username', 'password', 'proxyOptions']) {
    if (Object.hasOwn(proxy, key)) connection[key] = proxy[key];
  }
  return createHash('sha256').update(JSON.stringify(ordered(connection))).digest('hex');
}

// Measures the authorized shop target only. A renderer cannot choose a URL,
// upstream or credentials, and the request never carries shop cookies/tokens.
function targetLatency(target, proxyUrl, { signal, timeout = 8000 } = {}) {
  check(signal);
  const url = new URL(target);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw proxyError('店铺测速地址不合法');
  // A CONNECT socket is not yet owned by ClientRequest while the proxy is
  // answering. Abort the underlying dial as well as the request/agent.
  const connection = new AbortController();
  const agent = new HttpsProxyAgent(proxyUrl, { signal: connection.signal });
  const started = performance.now();
  return new Promise((resolve, reject) => {
    let done = false, request, timer;
    const finish = (error, value) => {
      if (done) return;
      done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      connection.abort(); request?.destroy(); agent.destroy(); error ? reject(error) : resolve(value);
    };
    const abort = () => finish(signal.reason || proxyError('测速已取消'));
    try {
      request = (url.protocol === 'https:' ? https : http).request(url, {
        method: 'HEAD', agent, headers: { 'Accept': '*/*', 'Connection': 'close' },
      }, response => {
        const status = response.statusCode || 0;
        response.destroy();
        // Redirect/403/405 still prove a real response from the selected site.
        finish(status >= 200 && status < 600 && status !== 407 ? null : proxyError('线路未能到达测速网站'), Math.round(performance.now() - started));
      });
      request.on('error', () => finish(proxyError('线路测速失败，请检查代理或稍后重试')));
      request.on('proxyConnect', response => {
        if (response.statusCode !== 200) finish(proxyError('代理无法建立测速连接'));
      });
      timer = setTimeout(() => finish(proxyError('线路测速超时')), timeout);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort(); else request.end();
    } catch { finish(proxyError('线路测速失败')); }
  });
}

function firstHop(connection) {
  while (connection.proxyOptions?.transit) connection = connection.proxyOptions.transit;
  return connection;
}
function tcpLatency(connection, {signal, timeout = 5000} = {}) {
  check(signal);
  return new Promise((resolve, reject) => {
    const started = performance.now(), socket = net.connect({host:connection.host, port:connection.port});
    const finish = (error, value) => { signal?.removeEventListener('abort', abort); socket.destroy(); error ? reject(error) : resolve(value); };
    const abort = () => finish(signal.reason || proxyError('测速已取消'));
    socket.setTimeout(timeout, () => finish(proxyError('入口连接超时')));
    socket.once('connect', () => finish(null, Math.round(performance.now() - started)));
    socket.once('error', () => finish(proxyError('入口连接失败')));
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) abort();
  });
}

class ProxyRoutes {
  constructor(proxy, runtime, { target, resources, signal, Runtime = ProxyRuntime, measure = targetLatency, validate, tcp = tcpLatency } = {}) {
    this.snapshotId = proxySnapshotId(proxy); this.runtime = runtime;
    this.target = target; this.resources = resources; this.signal = signal;
    this.Runtime = Runtime; this.measure = measure; this.validate = validate; this.tcp = tcp;
    this.relayPool = proxy.relayPool; this.health = new Map();
  }
  state() {
    return { snapshotId: this.snapshotId, candidateIndex: this.runtime.candidateIndex,
      ...(this.relayPool ? {relayPool:{id:this.relayPool.id, name:this.relayPool.name, revision:this.relayPool.revision}, ...this.controller?.state()} : {}),
      candidates: this.runtime.candidates.map((candidate, candidateIndex) => {
        const hop = firstHop(candidate), metadata = this.relayPool?.candidates?.[candidateIndex];
        return {candidateIndex, ip:hop.host, port:hop.port, proxy_type:hop.protocol,
          ...(metadata ? {id:metadata.id, name:metadata.name, region:metadata.region, poolId:metadata.poolId, poolName:metadata.poolName} : {}),
          ...(this.health.has(candidateIndex) ? {health:{...this.health.get(candidateIndex)}} : {})};
      }) };
  }
  select(selection) {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection) ||
        Object.keys(selection).some(key => !['candidateIndex', 'snapshotId'].includes(key)) || selection.snapshotId !== this.snapshotId) {
      throw proxyError('线路配置已变化，请刷新检测页面后重试');
    }
    return this.runtime.candidate(selection.candidateIndex);
  }
  async observe(index, runtime, signal) {
    const sampledAt = new Date().toISOString();
    let entryLatencyMs = null;
    try {
      // An entry TCP sample is diagnostic only; the full authenticated path is
      // authoritative. A firewall may treat an empty TCP connection differently.
      if (this.relayPool) entryLatencyMs = await this.tcp(firstHop(this.runtime.candidate(index)), {signal}).catch(() => null);
      check(signal);
      await this.validate?.(runtime, signal);
      const delay = await this.measure(this.target, runtime.url, {signal});
      const value = {available:true, delay, entryLatencyMs, sampledAt};
      this.health.set(index, value);
      return {...value, candidateIndex:index, snapshotId:this.snapshotId};
    } catch (error) {
      check(signal);
      this.health.set(index, {available:false, delay:null, entryLatencyMs, sampledAt});
      throw error;
    }
  }
  async latency(selection, {signal = this.signal} = {}) {
    const connection = this.select(selection); check(signal);
    if (this.measuring) throw proxyError('线路正在测速，请稍后重试');
    this.measuring = true;
    let runtime, observing = false;
    try {
      runtime = new this.Runtime(connection, { resources: this.resources, signal });
      await runtime.listen(); check(signal);
      observing = true;
      return await this.observe(selection.candidateIndex, runtime, signal);
    } catch (error) {
      check(signal);
      if (!observing) this.health.set(selection.candidateIndex, {available:false, delay:null, entryLatencyMs:null, sampledAt:new Date().toISOString()});
      throw error;
    } finally {
      try { await runtime?.close(); } finally { this.measuring = false; }
    }
  }
  async current({signal = this.signal} = {}) {
    if (this.measuring) throw proxyError('线路正在测速，请稍后重试');
    this.measuring = true;
    try { return await this.observe(this.runtime.candidateIndex, this.runtime, signal); }
    finally { this.measuring = false; }
  }
  async ready({signal = this.signal} = {}) {
    check(signal);
    if (this.measuring) throw proxyError('线路正在测速，请稍后重试');
    this.measuring = true;
    const index = this.runtime.candidateIndex, started = performance.now(), sampledAt = new Date().toISOString();
    try {
      // Startup and automatic recovery need proof of the authenticated exit.
      // Entry TCP and merchant HEAD probes belong to explicit speed tests;
      // a slow or blocked merchant probe must not prevent opening its browser.
      if (!this.validate) throw proxyError('未配置代理出口校验');
      const network = await this.validate(this.runtime, signal);
      check(signal);
      const previous = this.health.get(index);
      const value = {available:true, delay:previous?.delay ?? null, entryLatencyMs:previous?.entryLatencyMs ?? null,
        exitLatencyMs:Math.round(performance.now() - started), sampledAt, stage:'exit'};
      this.health.set(index, value);
      return {...value, candidateIndex:index, snapshotId:this.snapshotId, network};
    } catch (error) {
      this.health.set(index, {available:false, delay:null, entryLatencyMs:null,
        exitLatencyMs:Math.round(performance.now() - started), sampledAt, stage:'exit', failure:safeProxyMessage(error)});
      check(signal);
      throw error;
    } finally { this.measuring = false; }
  }
}
module.exports = { ProxyRoutes, proxySnapshotId, targetLatency, firstHop, tcpLatency };
