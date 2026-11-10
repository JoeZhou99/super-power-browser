export const SS_METHODS = ['aes-128-gcm', 'aes-256-gcm', 'chacha20-ietf-poly1305', 'xchacha20-ietf-poly1305', '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305', 'none'];
export const SSR_METHODS = ['aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb', 'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr', 'rc4-md5', 'chacha20', 'chacha20-ietf', 'aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm', 'chacha20-ietf-poly1305', 'xchacha20-ietf-poly1305', 'none'];
const SSR_METHOD_ALIASES = { plain: 'none', 'chacha20-poly1305': 'chacha20-ietf-poly1305', 'xchacha20-poly1305': 'xchacha20-ietf-poly1305' };
export const SSR_PROTOCOLS = ['origin', 'verify_simple', 'auth_simple', 'auth_sha1', 'auth_sha1_v2', 'auth_sha1_v4', 'auth_aes128_md5', 'auth_aes128_sha1', 'auth_chain_a', 'auth_chain_b', 'auth_chain_c', 'auth_chain_d', 'auth_chain_e', 'auth_chain_f'];
export const SSR_OBFS = ['plain', 'http_simple', 'http_post', 'random_head', 'tls1.2_ticket_auth', 'tls1.2_ticket_fastauth'];
export const TRANSPORTS = ['tcp', 'ws', 'grpc', 'http', 'httpupgrade', 'splithttp'];

export function validateTransportHost(value = '') {
  if (typeof value !== 'string') throw new Error('传输 Host 格式不正确');
  const host = value.trim();
  if (!host) return '';
  const match = host.match(/^(\[[^\]]+\]|[^:[\]\s/?#@\\%]+)(?::(\d{1,5}))?$/);
  if (!match || host.length > 255 || (match[2] !== undefined && (Number(match[2]) < 1 || Number(match[2]) > 65535))) throw new Error('传输 Host 须为主机名或 [IPv6]，可附加端口');
  try { new URL(`http://${host}`); } catch { throw new Error('传输 Host 地址不合法'); }
  return host;
}

export function prepareProxyOptions(protocol, saved = {}, changingProtocol = false) {
  const options = JSON.parse(JSON.stringify(saved || {}));
  if (changingProtocol) for (const key of ['encryption', 'transportProtocol', 'protocolParameter', 'obfs', 'obfsParameter', 'vmessUser', 'vlessUser']) delete options[key];
  if (['https', 'vmess', 'vless'].includes(protocol)) options.tls = { serverName: '', allowInsecure: false, ...options.tls };
  if (protocol === 'ss') options.encryption ||= 'aes-128-gcm';
  if (protocol === 'ssr') {
    options.encryption ||= 'aes-256-cfb'; options.transportProtocol ||= 'origin'; options.obfs ||= 'plain';
    options.encryption = SSR_METHOD_ALIASES[options.encryption] || options.encryption;
    options.protocolParameter ??= ''; options.obfsParameter ??= '';
  }
  if (protocol === 'vmess') {
    options.vmessUser = { id: '', alterId: 0, security: 'auto', securityTls: 'tls', network: 'tcp', serverName: '', path: '', host: '', serviceName: '', ...options.vmessUser };
    if (typeof options.vmessUser.securityTls === 'boolean') options.vmessUser.securityTls = options.vmessUser.securityTls ? 'tls' : 'none';
    if (options.vmessUser.network === 'h2') options.vmessUser.network = 'http';
  }
  if (protocol === 'vless') {
    const network = options.vlessUser?.network || 'tcp', security = options.vlessUser?.security || 'reality';
    options.vlessUser = { id: '', encryption: 'none', flow: security === 'reality' && network === 'tcp' ? 'xtls-rprx-vision' : '', network, security, serverName: '', fingerprint: 'chrome', publicKey: '', shortId: '', spiderX: '', path: '', host: '', serviceName: '', ...options.vlessUser };
    if (options.vlessUser.network === 'h2') options.vlessUser.network = 'http';
  }
  return options;
}

export function validateProxyOptions(protocol, input, password = '') {
  const options = prepareProxyOptions(protocol, input);
  if (['ss', 'ssr'].includes(protocol)) {
    if (!options.encryption) throw new Error('请填写代理加密方式');
    if (!password) throw new Error('SS / SSR 代理需要填写密码');
    const ciphers = protocol === 'ss' ? [...SS_METHODS, 'plain', 'chacha20-poly1305', 'xchacha20-poly1305'] : SSR_METHODS;
    if (!ciphers.includes(options.encryption)) throw new Error('不支持的代理加密方式');
    if (protocol === 'ssr' && (!SSR_PROTOCOLS.includes(options.transportProtocol) || !SSR_OBFS.includes(options.obfs))) throw new Error('不支持的 SSR 协议或混淆方式');
  }
  if (['vmess', 'vless'].includes(protocol)) {
    const user = options[`${protocol}User`];
    user.host = validateTransportHost(user.host);
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(user.id)) throw new Error('请填写有效的用户 UUID');
    if (!TRANSPORTS.includes(user.network)) throw new Error('暂不支持此传输协议');
    if (protocol === 'vmess' && (!Number.isInteger(Number(user.alterId)) || Number(user.alterId) < 0 || Number(user.alterId) > 65535)) throw new Error('alterId 必须是 0 至 65535 的整数');
    if (protocol === 'vmess' && (!['none','tls'].includes(user.securityTls) || !['auto','none','zero','aes-128-gcm','chacha20-poly1305'].includes(user.security))) throw new Error('不支持的 VMess 安全类型或加密方式');
    if (protocol === 'vless') {
      if (!['none', 'tls', 'reality'].includes(user.security)) throw new Error('不支持的 VLESS 安全类型');
      if (user.encryption !== 'none') throw new Error('VLESS 加密方式须为 none');
      if (!['','xtls-rprx-vision','xtls-rprx-vision-udp443'].includes(user.flow)) throw new Error('不支持的 VLESS 流控');
      if (user.flow && (user.network !== 'tcp' || !['tls', 'reality'].includes(user.security))) throw new Error('Vision 流控需要 TCP 和 TLS / Reality');
      if (user.security === 'reality') {
        if (!['tcp', 'http', 'grpc'].includes(user.network)) throw new Error('Reality 仅支持 TCP、HTTP/2 或 gRPC');
        if (!user.serverName || !/^[A-Za-z0-9_-]{43}$/.test(user.publicKey)) throw new Error('Reality 需要填写 SNI 和有效的公钥');
        if (!/^(?:[\da-f]{2}){0,8}$/i.test(user.shortId)) throw new Error('shortId 须为最多 16 位的偶数长度十六进制字符');
      }
    }
  }
  return options;
}
