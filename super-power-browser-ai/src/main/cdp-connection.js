// Read-only, bounded CDP health checks. Never navigate or launch a browser here.
export async function validateShopConnection(connection, fetchImpl = fetch) {
  try {
    if (!connection?.isopen || String(connection.browserId) !== String(connection.mallId)) throw new Error('浏览器实例与店铺不匹配');
    const url = new URL(connection.cdpUrl);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('CDP 地址必须是本机浏览器地址');
    url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'https:' : 'http:';
    const signal = AbortSignal.timeout(2500);
    const [version, pages] = await Promise.all(['/json/version', '/json/list'].map(async path => {
      const response = await fetchImpl(new URL(path, url), { signal, redirect: 'error' });
      if (!response.ok) throw new Error(`CDP 检查失败：HTTP ${response.status}`);
      return response.json();
    }));
    if (!version.webSocketDebuggerUrl || !Array.isArray(pages)) throw new Error('端口未返回有效的 CDP 浏览器信息');
    if (url.pathname.startsWith('/devtools/browser/') && new URL(version.webSocketDebuggerUrl).pathname !== url.pathname) throw new Error('浏览器实例已更换');
    return { ok: true, checkedAt: Date.now() };
  } catch (error) {
    const cause = error.cause?.code || error.code || '';
    return { ok: false, error: `${error.message || 'CDP 连接验证失败'}${cause ? `（${cause}）` : ''}` };
  }
}
