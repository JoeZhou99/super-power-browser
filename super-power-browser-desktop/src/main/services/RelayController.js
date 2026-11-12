const {check} = require('../runtime/Cancellation');
const {proxyError, safeProxyMessage} = require('./ProxyConfig');

const bounded = (value, fallback, minimum, maximum) => Number.isInteger(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;

// One controller per running shop. It never builds or accepts a new upstream;
// every selection is an index in the authenticated launch snapshot.
class RelayController {
  constructor(routes, switchRoute, {policy = {}, signal, now = Date.now, schedule = setTimeout, cancel = clearTimeout} = {}) {
    this.routes = routes; this.switchRoute = switchRoute; this.now = now; this.schedule = schedule; this.cancel = cancel;
    this.automatic = policy.automatic !== false; this.failures = 0; this.status = 'initializing'; this.lastSwitchAt = 0;
    this.startupChecks = [];
    this.interval = bounded(policy.probeIntervalMs, 60000, 15000, 300000);
    this.threshold = bounded(policy.failureThreshold, 3, 2, 10);
    this.cooldown = bounded(policy.cooldownMs, 120000, 30000, 600000);
    this.controller = new AbortController();
    this.signal = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
    this.abort = () => this.cancel(this.timer);
    this.signal.addEventListener('abort', this.abort, {once:true});
    routes.controller = this;
  }
  state() { return {automatic:this.automatic, relayStatus:this.status, consecutiveFailures:this.failures, lastSwitchAt:this.lastSwitchAt || null,
    startupChecks:this.startupChecks.map(item => ({...item}))}; }
  async exclusive(action) {
    check(this.signal);
    if (this.busy || this.routes.measuring) throw proxyError('线路正在检测或切换，请稍后重试');
    const operation = Promise.resolve().then(action).finally(() => {if (this.busy === operation) this.busy = null;});
    this.busy = operation;
    return operation;
  }
  async initialize() {
    return this.exclusive(async () => {
      this.startupChecks = [];
      const deadline = new AbortController();
      const signal = AbortSignal.any([this.signal, deadline.signal]);
      // Cancellation is propagated into network work and awaited through cleanup.
      // A proxy restart already committing may need time to restore its sockets;
      // racing that promise would leave a late switch running after startup failed.
      const timer = this.schedule(() => deadline.abort(proxyError('中继连接准备超时，请稍后重试')), 45000);
      timer?.unref?.();
      const stage = async (candidateIndex, name, action) => {
        const started = this.now();
        try {
          check(signal);
          const result = await action();
          check(signal);
          this.startupChecks.push({candidateIndex, stage:name, durationMs:Math.max(0, this.now() - started), result:'success'});
          return result;
        } catch (error) {
          const result = this.signal.aborted ? 'cancelled' : deadline.signal.aborted ? 'timeout' : 'failed';
          this.startupChecks.push({candidateIndex, stage:name, durationMs:Math.max(0, this.now() - started), result,
            message:result === 'cancelled' ? '已取消打开店铺' : safeProxyMessage(deadline.signal.aborted ? deadline.signal.reason : error)});
          throw error;
        }
      };
      const current = this.routes.runtime.candidateIndex;
      const indexes = [current, ...this.routes.runtime.candidates.map((_,index) => index).filter(index => index !== current)];
      let lastError;
      try {
        for (const index of indexes) {
          try {
            check(signal);
            if (index !== this.routes.runtime.candidateIndex) {
              await stage(index, 'switch', () => this.switchRoute(index, {signal}));
            }
            const ready = await stage(index, 'verify', () => this.routes.ready({signal}));
            this.failures = 0; this.status = 'healthy';
            return {...this.state(), network:ready.network};
          } catch (error) {
            check(this.signal);
            lastError = error;
            if (deadline.signal.aborted) break;
          }
        }
        this.status = 'unavailable';
        const reason = deadline.signal.aborted ? safeProxyMessage(deadline.signal.reason) : lastError && safeProxyMessage(lastError);
        const error = proxyError(`中继池暂时没有可用线路${reason ? `：${reason}` : '，请稍后重试或联系管理员'}`);
        error.startupChecks = this.state().startupChecks;
        throw error;
      } finally {
        this.cancel(timer);
      }
    });
  }
  start() {
    if (this.started || this.signal.aborted) return;
    this.started = true; this.arm();
  }
  arm() {
    if (!this.started || this.signal.aborted) return;
    this.timer = this.schedule(() => {void this.tick().catch(() => {}).finally(() => this.arm());}, this.interval);
    this.timer?.unref?.();
  }
  async tick() {
    if (this.busy || this.routes.measuring || this.signal.aborted) return;
    return this.exclusive(async () => {
      try {
        await this.routes.ready({signal:this.signal}); this.failures = 0; this.status = this.automatic ? 'healthy' : 'locked'; return;
      } catch { check(this.signal); this.failures++; this.status = 'degraded'; }
      // A manual choice locks selection, not exit verification. Continue to
      // surface failure/recovery and let the host enforce its traffic gate.
      if (!this.automatic) { if (this.failures >= this.threshold) this.status = 'unavailable'; return; }
      if (this.failures < this.threshold || this.lastSwitchAt && this.now() - this.lastSwitchAt < this.cooldown) return;
      const current = this.routes.runtime.candidateIndex;
      const indexes = this.routes.runtime.candidates.map((_,index) => index).filter(index => index !== current);
      for (const index of indexes) {
        try {
          await this.switchRoute(index, {signal:this.signal});
          await this.routes.ready({signal:this.signal});
          this.lastSwitchAt = this.now(); this.failures = 0; this.status = 'healthy'; return;
        } catch { check(this.signal); }
      }
      this.status = 'unavailable';
    });
  }
  manual(index) {
    this.routes.runtime.candidate(index);
    return this.exclusive(async () => {
      // Lock even when this manual candidate fails validation; background
      // recovery must not override an accepted manual operation silently.
      this.automatic = false;
      const result = await this.switchRoute(index, {signal:this.signal});
      this.lastSwitchAt = this.now(); this.failures = 0; this.status = 'locked';
      return result;
    });
  }
  setAutomatic(value) {
    if (typeof value !== 'boolean') throw proxyError('自动切换参数不合法');
    if (this.busy) throw proxyError('线路正在检测或切换，请稍后重试');
    this.automatic = value; this.failures = 0; this.status = value ? 'monitoring' : 'locked';
    // Resume observes the current route on its next scheduled check; it never
    // interrupts a healthy upload merely because another route is quicker.
    return this.state();
  }
  async close() {
    this.started = false; this.cancel(this.timer); this.controller.abort();
    this.signal.removeEventListener('abort', this.abort);
    await this.busy?.catch(() => {});
  }
}
module.exports = {RelayController};
