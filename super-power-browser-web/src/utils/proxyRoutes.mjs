import { PROXY_PROTOCOLS, validateProxyAddress } from './proxyImport.mjs';
import { prepareProxyOptions, validateProxyOptions } from './proxyOptions.mjs';

export const RELAY_PROTOCOLS = ['http', 'https', 'socks5', 'ss', 'vmess', 'vless'];
export const MAX_PROXY_ALTERNATIVES = 8;
export const MAX_PROXY_DEPTH = 2;

export function createProxyConnection(protocol = 'http') {
  return { protocol, host: '', port: protocol === 'ssh' ? 22 : protocol.startsWith('socks') ? 1080 : ['ss', 'ssr'].includes(protocol) ? 8388 : protocol === 'http' ? 8080 : 443,
    username: '', password: '', proxyOptions: prepareProxyOptions(protocol) };
}

// Copy a saved connection, not a live reference: later changes to its source must
// not silently change the account or exit of another shop.
export function copyProxyConnection(record, credentials, depth = 1, forTransit = false) {
  const options = prepareProxyOptions(record.protocol, credentials.proxyOptions);
  delete options.alternatives;
  delete options.resourceProxy; delete options.routing;
  const connection = { protocol: record.protocol, host: record.host, port: record.port,
    username: credentials.username, password: credentials.password, proxyOptions: options };
  return validateConnection(connection, depth, { count: 0 }, forTransit);
}

function validateConnection(connection, depth, nodes, forTransit = false) {
  if (!connection || !PROXY_PROTOCOLS.includes(connection.protocol)) throw new Error('请选择代理节点协议');
  const { protocol } = connection;
  if (forTransit && !RELAY_PROTOCOLS.includes(protocol)) throw new Error('中转节点暂不支持 SSH、SSR 或 SOCKS4');
  const address = validateProxyAddress(connection.host, connection.port);
  const username = connection.username ?? '', password = connection.password ?? '';
  if (typeof username !== 'string' || typeof password !== 'string') throw new Error('节点账号密码格式不正确');
  if (['http', 'https', 'socks5', 'ssh'].includes(protocol) && password && !username) throw new Error('节点使用密码时必须填写账号');
  if (protocol === 'ssh' && !username) throw new Error('SSH 节点需要填写账号');
  if (['socks4', 'socks4a'].includes(protocol) && password) throw new Error('SOCKS4 不支持密码认证');
  if (protocol === 'socks5' && [username, password].some(value => new TextEncoder().encode(value).length > 255)) throw new Error('SOCKS5 账号和密码不能超过 255 字节');
  const options = validateProxyOptions(protocol, connection.proxyOptions || {}, password);
  return { protocol, ...address, username, password, proxyOptions: validateProxyRoutes(protocol, options, depth, nodes) };
}

export function validateProxyRoutes(protocol, input, depth = 0, nodes = { count: 0 }) {
  if (depth > MAX_PROXY_DEPTH || ++nodes.count > 12) throw new Error('代理链路最多两层中转，节点总数不能超过 12 个');
  const options = JSON.parse(JSON.stringify(input || {}));
  if (depth > 0 && (options.resourceProxy !== undefined || options.routing !== undefined)) throw new Error('网站分流只能配置在主代理下');
  if (options.transit) {
    if (!RELAY_PROTOCOLS.includes(protocol)) throw new Error('SSH、SSR 或 SOCKS4 节点暂不支持叠加中转');
    try { options.transit = validateConnection(options.transit, depth + 1, nodes, true); }
    catch (error) { throw new Error(`中转节点：${error.message}`); }
  }
  if (options.alternatives !== undefined) {
    if (!Array.isArray(options.alternatives) || options.alternatives.length > MAX_PROXY_ALTERNATIVES) throw new Error('最多配置 8 条备用线路');
    if (depth > 0 && options.alternatives.length) throw new Error('备用线路只能添加在主代理下');
    options.alternatives = options.alternatives.map((item, index) => {
      try { return validateConnection(item, depth + 1, nodes); }
      catch (error) { throw new Error(`备用线路 ${index + 1}：${error.message}`); }
    });
  }
  if (options.resourceProxy) {
    try { options.resourceProxy = validateConnection(options.resourceProxy, depth + 1, nodes); }
    catch (error) { throw new Error(`资源专用代理：${error.message}`); }
  }
  if (options.routing) {
    const routing = {};
    for (const key of ['resourceDomains', 'directDomains', 'cdnDomains']) {
      const domains = options.routing[key] || [];
      routing[key] = validateRoutingDomains(Array.isArray(domains) ? domains.filter(domain => domain !== '') : domains);
    }
    if (!options.resourceProxy && (routing.resourceDomains.length || routing.cdnDomains.length)) throw new Error('请先配置资源专用代理，再填写资源或 CDN 分流域名');
    options.routing = routing;
  }
  return options;
}

export function validateRoutingDomains(domains) {
  if (!Array.isArray(domains) || domains.length > 100) throw new Error('每类分流域名最多 100 条');
  return [...new Set(domains.map(value => {
    if (typeof value !== 'string' || value.length > 255 || !value || value !== value.trim()) throw new Error('分流域名长度或格式不正确');
    const wildcard = value.startsWith('*.'), source = wildcard ? value.slice(2) : value;
    if (!source || /[\s*:/?#@%\\[\]]/.test(source)) throw new Error('分流规则请填写域名或 *.域名，不包含 URL、端口或其他通配符');
    let host;
    try { host = new URL(`http://${source}`).hostname.replace(/\.$/, '').toLowerCase(); } catch { throw new Error('分流域名格式不正确'); }
    if (!host.includes('.') || /^[\d.]+$/.test(host) || /\.(?:localhost|local|localdomain|lan|internal)$/.test(host) || host === 'home.arpa' || host.endsWith('.home.arpa') || !host.split('.').every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label))) throw new Error('分流规则不能指向 IP 或本机域名');
    return (wildcard ? '*.' : '') + host;
  }))];
}
