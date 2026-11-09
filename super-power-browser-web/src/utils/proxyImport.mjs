export const PROXY_PROTOCOLS = ['http', 'https', 'socks5', 'ssh'];
export const MAX_PROXY_IMPORT = 500;

export function validateProxyAddress(host, port) {
  const value = String(host || '').trim();
  if (!value) throw new Error('请填写代理地址');
  if (/[\s/@?#\\]/.test(value) || value.includes('://')) throw new Error('代理地址只填写主机名或 IP，不含协议、账号或路径');
  const unwrapped = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!unwrapped || /[\[\]]/.test(unwrapped)) throw new Error('代理地址格式不正确');
  try {
    new URL(`http://${unwrapped.includes(':') ? `[${unwrapped}]` : unwrapped}`);
  } catch { throw new Error('代理地址格式不正确，IPv6 地址请检查是否完整'); }
  const portText = String(port ?? '');
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('端口必须是 1—65535 的整数');
  return { host: unwrapped, port: Number(portText) };
}

export function validateChangeIpUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) throw new Error();
    return value;
  } catch { throw new Error('换 IP 链接须为完整的 HTTP 或 HTTPS 地址，不能包含账号密码或片段'); }
}

function decodeCredential(value) {
  try { return decodeURIComponent(value); }
  catch { throw new Error('账号或密码的 URL 编码不正确'); }
}

export function parseProxyLine(line, defaultProtocol = 'http') {
  let source = line.trim(), remark = '', changeIpUrl = '', hasRemark = false, hasUrl = false;
  if (!source) throw new Error('代理内容不能为空');
  // Suffixes can occur in either order; an IPv6 address is never treated as a URL suffix.
  for (let suffix = 0; suffix < 2; suffix++) {
    const remarkMatch = source.match(/\{([^{}]*)\}\s*$/);
    const urlMatch = source.match(/\[(https?:\/\/[^\]]*)\]\s*$/i);
    if (remarkMatch) {
      if (hasRemark) throw new Error('每条代理只能填写一个备注');
      hasRemark = true; remark = remarkMatch[1].trim(); source = source.slice(0, remarkMatch.index).trim();
    } else if (urlMatch) {
      if (hasUrl) throw new Error('每条代理只能填写一个换 IP 链接');
      hasUrl = true; changeIpUrl = validateChangeIpUrl(urlMatch[1].trim()); source = source.slice(0, urlMatch.index).trim();
    } else break;
  }
  let protocol = defaultProtocol.toLowerCase();
  const scheme = source.match(/^([a-z][a-z\d+.-]*):\/\//i);
  if (scheme) { protocol = scheme[1].toLowerCase(); source = source.slice(scheme[0].length); }
  if (!PROXY_PROTOCOLS.includes(protocol)) throw new Error('协议仅支持 HTTP、HTTPS、SOCKS5、SSH');
  let username = '', password = '', endpoint = source, uriCredentials = false;
  const at = source.lastIndexOf('@');
  const colonCredentials = source.startsWith('[')
    ? /^\[[^\]]+\]:\d+:[^:]*:/.test(source)
    : /^[^:\s@]+:\d+:[^:]*:/.test(source);
  if (at >= 0 && !colonCredentials) {
    uriCredentials = true;
    const credentials = source.slice(0, at), separator = credentials.indexOf(':');
    if (separator < 0) throw new Error('账号密码请使用 用户名:密码@地址:端口 格式');
    username = decodeCredential(credentials.slice(0, separator));
    password = decodeCredential(credentials.slice(separator + 1)); endpoint = source.slice(at + 1);
  }
  const match = endpoint.startsWith('[')
    ? endpoint.match(/^\[([^\]]+)\]:(\d+)(?::([^:]*):(.*))?$/)
    : endpoint.match(/^([^:\s]+):(\d+)(?::([^:]*):(.*))?$/);
  if (!match) throw new Error('格式不正确，请使用 地址:端口 或 地址:端口:账号:密码；IPv6 地址用方括号包裹');
  if (match[3] !== undefined) {
    if (uriCredentials) throw new Error('一条代理不能同时使用两种账号密码格式');
    username = match[3]; password = match[4];
  }
  if (!username && password) throw new Error('填写密码时必须同时填写账号');
  const address = validateProxyAddress(match[1], match[2]);
  return { ...address, protocol, username, password, remark, changeIpUrl, name: remark || `${address.host}:${address.port}` };
}

export function parseProxyImport(text, defaultProtocol = 'http') {
  const lines = text.split(/\r?\n/).map((value, index) => ({ value, line: index + 1 })).filter(row => row.value.trim());
  if (lines.length > MAX_PROXY_IMPORT) return { rows: [], total: lines.length, error: `每次最多添加 ${MAX_PROXY_IMPORT} 条代理，当前有 ${lines.length} 条` };
  const rows = lines.map(({ value, line }) => {
    try { return { line, proxy: parseProxyLine(value, defaultProtocol), error: '' }; }
    catch (error) { return { line, error: error instanceof Error ? error.message : '代理格式不正确' }; }
  });
  return { rows, total: lines.length, error: '' };
}
