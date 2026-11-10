const http = require('node:http');
const https = require('node:https');
const { createHash } = require('node:crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { ProxyRuntime, proxyError } = require('./ProxyRuntime');
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

class ProxyRoutes {
  constructor(proxy, runtime, { target, resources, signal, Runtime = ProxyRuntime, measure = targetLatency } = {}) {
    this.snapshotId = proxySnapshotId(proxy); this.runtime = runtime;
    this.target = target; this.resources = resources; this.signal = signal;
    this.Runtime = Runtime; this.measure = measure;
  }
  state() {
    return { snapshotId: this.snapshotId, candidateIndex: this.runtime.candidateIndex,
      candidates: this.runtime.candidates.map((candidate, candidateIndex) => ({ candidateIndex, ip: candidate.host, port: candidate.port, proxy_type: candidate.protocol })) };
  }
  select(selection) {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection) ||
        Object.keys(selection).some(key => !['candidateIndex', 'snapshotId'].includes(key)) || selection.snapshotId !== this.snapshotId) {
      throw proxyError('线路配置已变化，请刷新检测页面后重试');
    }
    return this.runtime.candidate(selection.candidateIndex);
  }
  async latency(selection) {
    const connection = this.select(selection); check(this.signal);
    if (this.measuring) throw proxyError('线路正在测速，请稍后重试');
    this.measuring = true;
    let runtime;
    try {
      runtime = new this.Runtime(connection, { resources: this.resources, signal: this.signal });
      await runtime.listen(); check(this.signal);
      const delay = await this.measure(this.target, runtime.url, { signal: this.signal });
      return { available: true, delay, candidateIndex: selection.candidateIndex, snapshotId: this.snapshotId };
    } finally {
      try { await runtime?.close(); } finally { this.measuring = false; }
    }
  }
}
module.exports = { ProxyRoutes, proxySnapshotId, targetLatency };
