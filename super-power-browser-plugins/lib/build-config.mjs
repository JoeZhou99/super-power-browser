export function validateBuildConfig(input = {}) {
  const mode = input.mode ?? 'superpower';
  if (!['superpower', 'legacy'].includes(mode)) throw new Error('mode 只能为 superpower 或 legacy');
  const apiBase = input.apiBase ?? 'http://127.0.0.1:18080/extension';
  const authOrigin = input.authOrigin ?? new URL(apiBase).origin;
  for (const text of [apiBase, authOrigin]) {
    const u = new URL(text);
    if (u.username || u.password || u.search || u.hash || !['http:', 'https:'].includes(u.protocol)) throw new Error('接口地址不合法');
    if (u.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw new Error('远程接口必须使用 HTTPS');
    if (mode === 'superpower' && /(^|\.)zhanfubrowser\.com$/i.test(u.hostname)) throw new Error('新项目模式不能连接旧平台服务');
  }
  if (new URL(authOrigin).pathname !== '/') throw new Error('authOrigin 必须为不带路径的源地址');
  return { mode, apiBase: apiBase.replace(/\/$/, ''), authOrigin: new URL(authOrigin).origin, version: '0.2.7' };
}

export function rewriteServices(text, config) {
  if (config.mode === 'legacy') return text;
  return text.replace(/(?:https?|wss?):\/\/(?:[\w-]+\.)*zhanfubrowser\.com(?=[:/"'`\s?,;)}\]]|$)/g, origin => {
    const u = new URL(origin);
    if (u.hostname === 'api.zhanfubrowser.com') return config.apiBase;
    if (u.hostname === 'mms.zhanfubrowser.com') return config.authOrigin;
    const service = u.hostname.replace(/\.zhanfubrowser\.com$/, '').replaceAll('.', '-');
    const base = `${config.apiBase}/services/${service}`;
    return u.protocol.startsWith('ws') ? base.replace(/^http/, 'ws') : base;
  });
}
