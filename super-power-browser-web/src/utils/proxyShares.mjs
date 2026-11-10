import { prepareProxyOptions, validateProxyOptions } from './proxyOptions.mjs';

function decoded(value) { try { return decodeURIComponent(value); } catch { throw new Error('分享链接的 URL 编码不正确'); } }
function base64(value) {
  try {
    const raw = decoded(value).replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z\d+/]*={0,2}$/.test(raw) || raw.length > 65536) throw new Error();
    return new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(atob(raw), char => char.charCodeAt(0)));
  } catch { throw new Error('分享链接的 Base64 内容不正确'); }
}
function endpoint(value, validate) {
  const match = value.match(/^(\[[^\]]+\]|[^:/?#]+):(\d+)(?:\/)?(?:\?([^#]*))?$/);
  if (!match) throw new Error('分享链接的地址或端口不正确');
  return {address: validate(match[1], match[2]), query: new URLSearchParams(match[3] || '')};
}
function checkQuery(query, supported) { for (const key of query.keys()) if (!supported.includes(key)) throw new Error('分享链接包含暂不支持的参数，请使用单个添加核对配置'); }
function tlsFlag(value) {
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return true;
  throw new Error('分享链接的证书校验选项不正确');
}

export function parseProxyShare(source, protocol, validateAddress) {
  let remark = '', username = '', password = '', address, options = {};
  const hash = source.indexOf('#');
  if (hash >= 0) { remark = decoded(source.slice(hash + 1)); source = source.slice(0, hash); }
  if (protocol === 'ss') {
    const wholeLinkEncoded = !source.includes('@');
    if (wholeLinkEncoded) source = base64(source);
    const at = source.lastIndexOf('@');
    if (at < 1) throw new Error('SS 请使用包含加密方式、密码和地址的完整分享链接');
    let credentials = source.slice(0, at);
    let decodeParts = !wholeLinkEncoded;
    if (!credentials.includes(':') && /%3a/i.test(credentials)) { credentials = decoded(credentials); decodeParts = false; }
    if (!credentials.includes(':')) { credentials = base64(credentials); decodeParts = false; }
    const split = credentials.indexOf(':');
    if (split < 1) throw new Error('SS 分享链接缺少加密方式或密码');
    options.encryption = (decodeParts ? decoded(credentials.slice(0, split)) : credentials.slice(0, split)).toLowerCase();
    password = decodeParts ? decoded(credentials.slice(split + 1)) : credentials.slice(split + 1);
    const parsed = endpoint(source.slice(at + 1), validateAddress); address = parsed.address;
    checkQuery(parsed.query, []); // SIP003 plugins need a separate transport adapter.
  } else if (protocol === 'ssr') {
    const raw = base64(source), match = raw.match(/^(.+):(\d+):([^:]+):([^:]+):([^:]+):([^/]*)(?:\/\?(.*))?$/);
    if (!match) throw new Error('SSR 分享链接格式不正确');
    address = validateAddress(match[1], match[2]); password = base64(match[6]);
    const query = new URLSearchParams(match[7] || '');
    checkQuery(query, ['remarks', 'group', 'protoparam', 'obfsparam']);
    options = {encryption: match[4], transportProtocol: match[3], obfs: match[5], protocolParameter: query.has('protoparam') ? base64(query.get('protoparam')) : '', obfsParameter: query.has('obfsparam') ? base64(query.get('obfsparam')) : ''};
    if (!remark && query.has('remarks')) remark = base64(query.get('remarks'));
  } else if (protocol === 'vmess') {
    let config;
    try { config = JSON.parse(base64(source)); } catch { throw new Error('VMess 请使用完整的 Base64 JSON 分享链接'); }
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('VMess 分享链接配置不正确');
    if (config.type && config.type !== 'none') throw new Error('暂不支持此 VMess 伪装方式');
    if (config.tls !== undefined && !['tls','none','',true,false].includes(config.tls)) throw new Error('不支持的 VMess 传输安全类型');
    address = validateAddress(config.add, config.port);
    if (!remark) remark = String(config.ps || '');
    const network = config.net === 'h2' ? 'http' : String(config.net || 'tcp');
    options = {vmessUser: {id: String(config.id || ''), alterId: Number(config.aid || 0), security: String(config.scy || 'auto'), securityTls: config.tls === 'tls' || config.tls === true ? 'tls' : 'none', network, serverName: String(config.sni || ''), path: String(config.path || ''), host: String(config.host || ''), serviceName: network === 'grpc' ? String(config.serviceName || config.path || '') : ''}, tls: {serverName: '', allowInsecure: tlsFlag(String(config.allowInsecure || ''))}};
  } else if (protocol === 'vless') {
    const at = source.lastIndexOf('@');
    if (at < 1) throw new Error('VLESS 请使用包含 UUID 和地址的完整分享链接');
    const id = decoded(source.slice(0, at));
    const parsed = endpoint(source.slice(at + 1), validateAddress); address = parsed.address;
    const query = parsed.query;
    checkQuery(query, ['type', 'security', 'sni', 'fp', 'pbk', 'sid', 'spx', 'flow', 'encryption', 'path', 'host', 'serviceName', 'allowInsecure', 'headerType']);
    if (query.get('headerType') && query.get('headerType') !== 'none') throw new Error('暂不支持此 VLESS 伪装方式');
    const security = query.get('security') || 'none', network = query.get('type') === 'h2' ? 'http' : query.get('type') || 'tcp';
    options = {vlessUser: {id, encryption: query.get('encryption') || 'none', flow: query.get('flow') || '', network, security, serverName: query.get('sni') || '', fingerprint: query.get('fp') || 'chrome', publicKey: query.get('pbk') || '', shortId: query.get('sid') || '', spiderX: query.get('spx') || '', path: query.get('path') || '', host: query.get('host') || '', serviceName: query.get('serviceName') || ''}, tls: {serverName: '', allowInsecure: tlsFlag(query.get('allowInsecure'))}};
  } else throw new Error('不支持的分享链接协议');
  options = validateProxyOptions(protocol, prepareProxyOptions(protocol, options), password);
  return {...address, protocol, username, password, remark, name: remark || `${address.host}:${address.port}`, changeIpUrl: '', proxyOptions: options};
}
