const net = require('node:net');
const { domainToASCII } = require('node:url');

const PROTOCOLS = new Set(['http', 'https', 'socks5', 'socks4', 'socks4a', 'ss', 'vmess', 'vless', 'ssh', 'ssr']);
const PROTOCOL_ALIASES = { shadowsocks: 'ss', shadowsocksr: 'ssr', socks: 'socks5', socks5h: 'socks5' };
const NETWORK_ALIASES = { websocket: 'ws', h2: 'http', gun: 'grpc', mkcp: 'kcp' };
const NETWORKS = new Set(['tcp', 'ws', 'http', 'grpc', 'kcp', 'quic', 'httpupgrade', 'splithttp']);
const SS_METHODS = new Set(['aes-128-gcm', 'aes-256-gcm', 'chacha20-poly1305', 'chacha20-ietf-poly1305', 'xchacha20-poly1305', 'xchacha20-ietf-poly1305', 'none', 'plain', '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305']);
const SSR_METHODS = new Set(['none', 'rc4-md5', 'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr', 'aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb', 'aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm', 'chacha20', 'chacha20-ietf', 'chacha20-ietf-poly1305', 'xchacha20-ietf-poly1305']);
const SSR_METHOD_ALIASES = { plain: 'none', 'chacha20-poly1305': 'chacha20-ietf-poly1305', 'xchacha20-poly1305': 'xchacha20-ietf-poly1305' };

function proxyError(message) { const error = new Error(message); error.proxySafe = true; return error; }
function safeProxyMessage(error) {
  if (error?.proxySafe) return error.message;
  if (error?.level === 'client-authentication') return 'SSH 认证失败，请检查代理账号和密码';
  if (['ETIMEDOUT', 'ETIMEOUT'].includes(error?.code)) return '代理连接超时，请检查网络及代理服务';
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(error?.code)) return '代理域名解析失败，请检查代理地址';
  if (error?.code === 'ECONNREFUSED') return '代理拒绝连接，请检查端口及代理服务';
  return '代理连接失败，请检查地址、认证信息及网络';
}
function proxyHost(value) {
  let host = String(value ?? '').trim();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
    if (net.isIP(host) !== 6) throw proxyError('代理地址必须是有效的 IP 或域名');
  }
  if (net.isIP(host)) return host;
  if (!host || /[\s\/@:#?%\\\[\]]/.test(host)) throw proxyError('代理地址必须是有效的 IP 或域名');
  host = domainToASCII(host).toLowerCase();
  if (!host || host.length > 253 || !host.replace(/\.$/, '').split('.').every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label))) {
    throw proxyError('代理地址必须是有效的 IP 或域名');
  }
  return host;
}
const given = (...values) => values.find(value => value !== undefined && value !== null);
const filled = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
function record(value, name = '代理扩展配置') {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'string') {
    if (value.length > 65536) throw proxyError(`${name}过大`);
    try { value = JSON.parse(value); } catch { throw proxyError(`${name}必须是有效的 JSON 对象`); }
  }
  if (typeof value !== 'object' || Array.isArray(value) || value === null) throw proxyError(`${name}必须是对象`);
  return value;
}
function text(value, name, max = 2048, trim = true) {
  if (value === undefined || value === null) return '';
  if (!['string', 'number'].includes(typeof value)) throw proxyError(`${name}格式不正确`);
  const result = trim ? String(value).trim() : String(value);
  if (result.length > max || /[\x00-\x1f\x7f]/.test(result)) throw proxyError(`${name}过长或包含非法字符`);
  return result;
}
function secret(value, name) {
  if (value === undefined || value === null) return '';
  if (!['string', 'number'].includes(typeof value)) throw proxyError(`${name}格式不正确`);
  const result = String(value);
  if (Buffer.byteLength(result) > 4096 || result.includes('\0')) throw proxyError(`${name}过长或包含非法字符`);
  return result;
}
function boolean(value, name) {
  if (value === undefined || value === null || value === '') return false;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw proxyError(`${name}必须是布尔值`);
}
function validPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw proxyError('代理端口必须在 1 至 65535 之间');
  return port;
}
function network(value) {
  const requested = text(value || 'tcp', '代理传输协议', 32).toLowerCase();
  const result = NETWORK_ALIASES[requested] || requested;
  if (!NETWORKS.has(result)) throw proxyError('不支持的代理传输协议');
  return result;
}
function uuid(value, name) {
  const result = text(value, name, 64);
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(result)) throw proxyError(`${name}必须是有效的 UUID`);
  return result.toLowerCase();
}

function normalizeProxy(proxy) { return normalizeConnection(proxy, new Set(), 0); }
function normalizeConnection(value, ancestors, depth) {
  if (depth > 4) throw proxyError('代理中转或备用线路层级过多');
  const proxy = record(value, '代理连接配置');
  if (ancestors.has(proxy)) throw proxyError('代理配置不能循环引用');
  ancestors.add(proxy);
  try {
    // In the legacy structure protocol is SSR/transport metadata; proxyType
    // identifies the connection protocol. Do not confuse these two fields.
    const legacyType = filled(proxy.proxyType, proxy.proxy_type, proxy.ProxyType);
    const requested = text(filled(legacyType, proxy.protocol), '代理协议', 32).toLowerCase();
    const protocol = PROTOCOL_ALIASES[requested] || requested;
    if (!PROTOCOLS.has(protocol)) throw proxyError('不支持的代理协议');
    const host = proxyHost(filled(proxy.host, proxy.ip, proxy.server, proxy.address, proxy.mappingIp, proxy.map_ip));
    const port = validPort(filled(proxy.port, proxy.serverPort, proxy.server_port, proxy.mappingPort, proxy.map_port));
    const username = secret(given(proxy.username, proxy.userName, proxy.user, proxy.UserName), '代理账号');
    const password = secret(given(proxy.password, proxy.pass, proxy.Password), '代理密码');
    if (protocol === 'ssh' && !username) throw proxyError('SSH 代理需要填写用户名');
    if (protocol === 'socks5' && (Buffer.byteLength(username) > 255 || Buffer.byteLength(password) > 255)) throw proxyError('SOCKS5 账号和密码不能超过 255 字节');
    if ((protocol === 'socks4' || protocol === 'socks4a') && password) throw proxyError('SOCKS4 不支持密码认证，请确认代理协议');

    const options = record(given(proxy.proxyOptions, proxy.proxy_options));
    const legacyProtocol = legacyType ? proxy.protocol : undefined;
    const proxyOptions = {};
    const fields = {
      encryption: filled(options.encryption, proxy.encryption, proxy.method),
      transportProtocol: filled(options.transportProtocol, options.protocol, proxy.transportProtocol, legacyProtocol),
      protocolParameter: given(options.protocolParameter, proxy.protocolParameter, proxy.protocol_parameter, proxy.protocolParam),
      obfs: filled(options.obfs, options.confuse, proxy.obfs, proxy.confuse),
      obfsParameter: given(options.obfsParameter, options.confuseParameter, proxy.obfsParameter, proxy.confuseParameter, proxy.confuse_parameter, proxy.obfsParam)
    };
    for (const [key, val] of Object.entries(fields)) if (val !== undefined) proxyOptions[key] = text(val, '代理扩展参数');
    if (proxyOptions.encryption) proxyOptions.encryption = proxyOptions.encryption.toLowerCase();
    const tls = record(given(options.tls, proxy.tls));
    proxyOptions.tls = {
      serverName: text(filled(tls.serverName, tls.server_name, proxy.serverName, proxy.server_name), 'TLS 服务器名称', 253),
      allowInsecure: boolean(given(tls.allowInsecure, proxy.allowInsecure), 'TLS 证书校验选项')
    };

    if (protocol === 'ss') {
      const aliases = { aead_aes_128_gcm: 'aes-128-gcm', aead_aes_256_gcm: 'aes-256-gcm', aead_chacha20_poly1305: 'chacha20-poly1305', aead_xchacha20_poly1305: 'xchacha20-poly1305' };
      proxyOptions.encryption = aliases[proxyOptions.encryption] || proxyOptions.encryption || '';
      if (!SS_METHODS.has(proxyOptions.encryption)) throw proxyError('不支持的 Shadowsocks 加密方式');
      if (!password) throw proxyError('Shadowsocks 代理需要填写密码');
      if (proxyOptions.transportProtocol && proxyOptions.transportProtocol !== 'tcp') throw proxyError('Shadowsocks 代理不支持此传输协议');
      if (proxyOptions.obfs && proxyOptions.obfs !== 'plain') throw proxyError('Shadowsocks 混淆需使用明确支持的协议');
    }
    if (protocol === 'ssr') {
      if (!proxyOptions.encryption || !password) throw proxyError('SSR 代理需要填写加密方式和密码');
      proxyOptions.encryption = SSR_METHOD_ALIASES[proxyOptions.encryption] || proxyOptions.encryption;
      if (!SSR_METHODS.has(proxyOptions.encryption)) throw proxyError('当前 SSR 组件不支持此加密方式');
      proxyOptions.transportProtocol ||= 'origin';
      proxyOptions.obfs ||= 'plain';
    }
    if (protocol === 'vmess') {
      const user = record(given(options.vmessUser, proxy.vmessUser));
      const alterId = Number(given(user.alterId, proxy.alterId, 0));
      if (!Number.isInteger(alterId) || alterId < 0 || alterId > 65535) throw proxyError('VMess alterId 必须在 0 至 65535 之间');
      const security = text(filled(user.security, proxyOptions.encryption, 'auto'), 'VMess 加密方式', 32).toLowerCase();
      if (!['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'].includes(security)) throw proxyError('不支持的 VMess 加密方式');
      const tlsInput = filled(user.securityTls, proxy.securityTls, proxy.security, 'tls');
      const securityTls = typeof tlsInput === 'boolean' ? (tlsInput ? 'tls' : 'none') : text(tlsInput, 'VMess 传输安全类型', 16).toLowerCase();
      if (!['none', 'tls'].includes(securityTls)) throw proxyError('VMess 仅支持 none 或 tls 传输安全类型');
      proxyOptions.vmessUser = {
        id: uuid(filled(user.id, proxy.uuid, username, password), 'VMess 用户 ID'), alterId, security, securityTls,
        network: network(filled(user.network, proxy.network, proxyOptions.transportProtocol)),
        serverName: text(filled(user.serverName, user.server_name, proxyOptions.tls.serverName), 'TLS 服务器名称', 253),
        path: text(given(user.path, proxy.path), '传输路径'),
        host: text(given(user.host, proxy.transportHost), '传输主机', 253),
        serviceName: text(given(user.serviceName, user.service_name, proxy.serviceName), 'gRPC 服务名')
      };
    }
    if (protocol === 'vless') {
      const user = record(given(options.vlessUser, proxy.vlessUser));
      const security = text(filled(user.security, proxy.security, proxyOptions.obfs, 'reality'), 'VLESS 传输安全类型', 16).toLowerCase();
      if (!['none', 'tls', 'reality'].includes(security)) throw proxyError('不支持的 VLESS 传输安全类型');
      const transport = network(filled(user.network, proxy.network, proxyOptions.transportProtocol));
      const encryption = text(filled(user.encryption, proxyOptions.encryption, 'none'), 'VLESS 加密方式', 32).toLowerCase();
      if (encryption !== 'none') throw proxyError('当前 Xray 版本的 VLESS 加密方式必须为 none');
      const flow = text(given(user.flow, proxy.flow, proxyOptions.protocolParameter, security === 'reality' && transport === 'tcp' ? 'xtls-rprx-vision' : ''), 'VLESS 流控', 32);
      if (!['', 'xtls-rprx-vision', 'xtls-rprx-vision-udp443'].includes(flow)) throw proxyError('不支持的 VLESS 流控');
      if (flow && (transport !== 'tcp' || !['tls', 'reality'].includes(security))) throw proxyError('VLESS Vision 需要 TCP 和 TLS 或 Reality');
      if (security === 'reality' && !['tcp', 'http', 'grpc'].includes(transport)) throw proxyError('Reality 仅支持 TCP、HTTP/2 或 gRPC 传输');
      const vlessUser = {
        id: uuid(filled(user.id, proxy.uuid, username, password, proxy.vmessUser?.id), 'VLESS 用户 ID'),
        encryption, flow, network: transport, security,
        serverName: text(filled(user.serverName, user.server_name, proxyOptions.tls.serverName, proxyOptions.obfsParameter), 'TLS 服务器名称', 253),
        fingerprint: text(filled(user.fingerprint, proxy.fingerprint, 'chrome'), 'TLS 指纹', 64),
        publicKey: text(filled(user.publicKey, user.public_key, proxy.publicKey, proxy.public_key, proxy.encryptKey, proxy.random_string), 'Reality 公钥', 128),
        shortId: text(given(user.shortId, user.short_id, proxy.shortId, proxy.short_id), 'Reality shortId', 16),
        spiderX: text(given(user.spiderX, proxy.spiderX), 'Reality spiderX'),
        path: text(given(user.path, proxy.path), '传输路径'),
        host: text(given(user.host, proxy.transportHost), '传输主机', 253),
        serviceName: text(given(user.serviceName, user.service_name, proxy.serviceName), 'gRPC 服务名')
      };
      if (security === 'reality') {
        if (!vlessUser.serverName) throw proxyError('Reality 代理需要填写服务器名称');
        if (!/^[\w-]{43}$/.test(vlessUser.publicKey) || Buffer.from(vlessUser.publicKey, 'base64url').length !== 32) throw proxyError('Reality 公钥格式不正确');
        if (!/^(?:[\da-f]{2}){0,8}$/i.test(vlessUser.shortId)) throw proxyError('Reality shortId 必须是最多 16 位的偶数位十六进制字符串');
      }
      proxyOptions.vlessUser = vlessUser;
    }

    const transitInput = given(options.transit, proxy.transit, proxy.transitInfo, proxy.transit_info);
    if (transitInput !== undefined && transitInput !== null && transitInput !== '') {
      const transit = record(transitInput, '中转配置');
      // Old ProxyIP includes an empty TransitInfo object even without a relay.
      if (filled(transit.host, transit.ip, transit.server, transit.address)) proxyOptions.transit = normalizeConnection(transit, ancestors, depth + 1);
      else if (Object.values(transit).some(item => item !== '' && item !== 0 && item !== null && item !== undefined)) throw proxyError('中转代理缺少地址');
    }
    const alternatives = given(options.alternatives, proxy.alternatives, proxy.transfer_proxies);
    if (alternatives !== undefined && alternatives !== null) {
      if (!Array.isArray(alternatives) || alternatives.length > 8) throw proxyError('备用代理必须是最多 8 条的列表');
      proxyOptions.alternatives = alternatives.map(item => normalizeConnection(item, ancestors, depth + 1));
    }
    return { protocol, host, port, username, password, proxyOptions };
  } finally { ancestors.delete(proxy); }
}

function upstream(proxy) {
  const config = normalizeProxy(proxy);
  if (!['http', 'https', 'socks5', 'socks4', 'socks4a', 'ssh'].includes(config.protocol)) throw proxyError('此代理协议需要通过本地转发使用');
  const host = net.isIP(config.host) === 6 ? `[${config.host}]` : config.host;
  const url = new URL(`${config.protocol}://${host}:${config.port}`);
  url.username = encodeURIComponent(config.username);
  url.password = encodeURIComponent(config.password);
  return url.href;
}
function streamSettings(user, tls, security) {
  const settings = { network: user.network, security };
  if (security === 'tls') settings.tlsSettings = { serverName: user.serverName || undefined, allowInsecure: tls.allowInsecure };
  if (security === 'reality') settings.realitySettings = {
    serverName: user.serverName, fingerprint: user.fingerprint, publicKey: user.publicKey,
    shortId: user.shortId, spiderX: user.spiderX, show: false
  };
  if (user.network === 'ws') settings.wsSettings = { path: user.path || '/', ...(user.host ? { headers: { Host: user.host } } : {}) };
  if (user.network === 'http') settings.httpSettings = { path: user.path || '/', ...(user.host ? { host: [user.host] } : {}) };
  if (user.network === 'grpc') settings.grpcSettings = { serviceName: user.serviceName || '' };
  if (user.network === 'httpupgrade') settings.httpupgradeSettings = { path: user.path || '/', host: user.host || '' };
  if (user.network === 'splithttp') settings.splithttpSettings = { path: user.path || '/', host: user.host || '' };
  return settings;
}
function compileOutbound(config, tag, outbounds, helperProxy) {
  const { protocol, host, port, username, password, proxyOptions: options } = config;
  const outbound = { tag, protocol: '', settings: {} };
  if (['ssh', 'ssr', 'socks4', 'socks4a'].includes(protocol)) {
    if (!helperProxy) throw proxyError(`${protocol.toUpperCase()} 代理本地辅助服务尚未就绪`);
    if (options.transit) throw proxyError(`${protocol.toUpperCase()} 辅助服务暂不支持中转配置`);
    const helper = normalizeProxy(helperProxy);
    if (helper.protocol !== 'socks5' || !['127.0.0.1', '::1'].includes(helper.host) || helper.proxyOptions.transit || helper.proxyOptions.alternatives?.length) throw proxyError('辅助代理必须是本机 SOCKS5 服务');
    return compileOutbound(helper, tag, outbounds);
  }
  if (['http', 'https', 'socks5'].includes(protocol)) {
    outbound.protocol = protocol.startsWith('socks') ? 'socks' : 'http';
    const server = { address: host, port };
    if (username || password) server.users = [{ user: username, pass: password }];
    outbound.settings = { servers: [server] };
    if (protocol === 'https') outbound.streamSettings = { network: 'tcp', security: 'tls', tlsSettings: { serverName: options.tls.serverName || host, allowInsecure: options.tls.allowInsecure } };
  } else if (protocol === 'ss') {
    outbound.protocol = 'shadowsocks';
    outbound.settings = { servers: [{ address: host, port, method: options.encryption, password }] };
  } else if (protocol === 'vmess') {
    const user = options.vmessUser;
    outbound.protocol = 'vmess';
    outbound.settings = { vnext: [{ address: host, port, users: [{ id: user.id, alterId: user.alterId, security: user.security }] }] };
    outbound.streamSettings = streamSettings(user, options.tls, user.securityTls);
  } else if (protocol === 'vless') {
    const user = options.vlessUser;
    outbound.protocol = 'vless';
    outbound.settings = { vnext: [{ address: host, port, users: [{ id: user.id, encryption: user.encryption, flow: user.flow }] }] };
    outbound.streamSettings = streamSettings(user, options.tls, user.security);
  } else throw proxyError('不支持的代理协议');
  outbounds.push(outbound);
  if (options.transit) {
    if (options.transit.proxyOptions.alternatives?.length) throw proxyError('中转代理暂不支持嵌套备用线路');
    const transitTag = `${tag}-transit`;
    // v1.8.24 transport_internet.go SocketConfig.DialerProxy keeps the target
    // outbound's TLS/Reality/WS transport intact; legacy proxySettings did not.
    outbound.streamSettings ||= { network: 'tcp' };
    outbound.streamSettings.sockopt = { dialerProxy: transitTag };
    compileOutbound(options.transit, transitTag, outbounds);
  }
  return outbound;
}
function compileXrayConfig(proxy, { httpPort, socksPort, username, password, helperProxy } = {}) {
  const config = normalizeProxy(proxy);
  httpPort = validPort(httpPort); socksPort = validPort(socksPort);
  if (httpPort === socksPort) throw proxyError('本地 HTTP 和 SOCKS 代理端口不能相同');
  username = secret(username, '本地代理账号'); password = secret(password, '本地代理密码');
  if (!username || !password || Buffer.byteLength(username) > 255 || Buffer.byteLength(password) > 255) throw proxyError('本地代理必须配置有效的独立账号和密码');
  const accounts = [{ user: username, pass: password }];
  const sniffing = { enabled: true, destOverride: ['http', 'tls'] };
  const outbounds = [];
  compileOutbound(config, 'proxy', outbounds, helperProxy);
  return {
    log: { loglevel: 'none' },
    inbounds: [
      { tag: 'http', listen: '127.0.0.1', port: httpPort, protocol: 'http', settings: { accounts }, sniffing },
      { tag: 'socks', listen: '127.0.0.1', port: socksPort, protocol: 'socks', settings: { auth: 'password', accounts, udp: true, ip: '127.0.0.1' }, sniffing }
    ],
    outbounds
  };
}

module.exports = { proxyError, safeProxyMessage, proxyHost, normalizeProxy, upstream, compileXrayConfig };
