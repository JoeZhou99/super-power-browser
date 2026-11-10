const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { normalizeProxy, compileXrayConfig, upstream, proxyHost, safeProxyMessage } = require('../src/main/services/ProxyConfig');

const id = '11111111-2222-3333-4444-555555555555';
const publicKey = Buffer.alloc(32, 7).toString('base64url');
const local = { httpPort: 42321, socksPort: 42322, username: 'local-user', password: 'local-password' };
const connection = (protocol = 'http', extra = {}) => ({ protocol, host: 'gateway.example.test', port: 443, username: 'account', password: 'pass', ...extra });
const vless = (extra = {}) => connection('vless', { username: id, proxyOptions: { vlessUser: { id, serverName: 'example.test', publicKey, shortId: 'aabb', ...extra } } });
const vmess = (extra = {}) => connection('vmess', { username: id, proxyOptions: { vmessUser: { id, ...extra } } });

test('normalization preserves exact credentials, validates addresses and canonicalizes legacy fields', () => {
  const password = '  p@ss:/?#%\\"\n尾  ';
  const normalized = normalizeProxy({ proxyType: 'HTTPS', ip: 'Proxy.Example.COM', port: '443', userName: ' a:b@c ', password });
  assert.equal(normalized.protocol, 'https');
  assert.equal(normalized.host, 'proxy.example.com');
  assert.equal(normalized.port, 443);
  assert.equal(normalized.username, ' a:b@c ');
  assert.equal(normalized.password, password);
  assert.equal(normalized.proxyOptions.tls.allowInsecure, false);
  assert.deepEqual(normalizeProxy(normalized), normalized);
  assert.equal(proxyHost('代理.example'),'xn--mnq481g.example');
  for (const host of ['2001:db8::1', '[2001:db8::1]']) assert.equal(proxyHost(host), '2001:db8::1');
  for (const host of ['name@host', 'host:8080', 'a.example/path', '[bad]', 'evil\\host', 'a%2fb', 'a b']) assert.throws(() => proxyHost(host));
  for (const port of [0, 65536, 1.5, 'abc']) assert.throws(() => normalizeProxy(connection('http', { port })));
});

test('upstream URL encodes credentials once and preserves IPv6 without URL injection', () => {
  const source = connection('socks5', { host: '[2001:db8::1]', username: 'a:b@c', password: 'p@ss:/?#%' });
  const url = new URL(upstream(source));
  assert.equal(url.hostname, '[2001:db8::1]');
  assert.equal(decodeURIComponent(url.username), source.username);
  assert.equal(decodeURIComponent(url.password), source.password);
  assert.throws(() => upstream(vless()), /本地转发/);
  for (const protocol of ['direct', 'freedom', 'virtualhttp', 'unknown']) assert.throws(() => normalizeProxy(connection(protocol)), /不支持/);
});

test('all browser-facing inbounds require local authentication and never expose remote credentials', () => {
  const config = compileXrayConfig(connection('https'), local);
  assert.deepEqual(config.log, { loglevel: 'none' });
  assert.equal(config.inbounds.length, 2);
  for (const inbound of config.inbounds) {
    assert.equal(inbound.listen, '127.0.0.1');
    assert.deepEqual(inbound.settings.accounts, [{ user: local.username, pass: local.password }]);
    assert.deepEqual(inbound.sniffing.destOverride, ['http', 'tls']);
    assert.ok(inbound.tag);
    assert.equal(inbound.this, undefined);
  }
  assert.equal(config.inbounds.find(item => item.protocol === 'socks').settings.auth, 'password');
  assert.equal(config.inbounds.find(item => item.protocol === 'socks').settings.udp, true);
  assert.deepEqual(config.outbounds.map(item => item.protocol), ['http']);
  assert.equal(config.outbounds[0].proxySettings, undefined);
  assert.equal(config.outbounds[0].mux, undefined);
  assert.throws(() => compileXrayConfig(connection(), { ...local, username: '' }), /账号和密码/);
  assert.throws(() => compileXrayConfig(connection(), { ...local, socksPort: local.httpPort }), /端口不能相同/);
});

test('HTTPS validates certificates by default and explicit settings do not coerce false to true', () => {
  const basic = compileXrayConfig(connection('https'), local).outbounds[0];
  assert.deepEqual(basic.streamSettings, { network: 'tcp', security: 'tls', tlsSettings: { serverName: 'gateway.example.test', allowInsecure: false } });
  const source = connection('https', { proxyOptions: { tls: { serverName: 'certificate.example.test', allowInsecure: 'false' } } });
  assert.equal(compileXrayConfig(source, local).outbounds[0].streamSettings.tlsSettings.allowInsecure, false);
  source.proxyOptions.tls.allowInsecure = true;
  assert.equal(compileXrayConfig(source, local).outbounds[0].streamSettings.tlsSettings.allowInsecure, true);
  source.proxyOptions.tls.allowInsecure = 'secret-invalid-value';
  assert.throws(() => normalizeProxy(source), error => error.proxySafe && !error.message.includes('secret-invalid-value'));
});

test('JSON serialization never rewrites quotes, slashes or Unicode in passwords', () => {
  const source = connection('http', { username: ' a:b@c ', password: 'p\\"@:\n密码' });
  const roundTrip = JSON.parse(JSON.stringify(compileXrayConfig(source, local)));
  assert.deepEqual(roundTrip.outbounds[0].settings.servers[0].users, [{ user: source.username, pass: source.password }]);
});

test('SOCKS4 variants require a real helper and SOCKS5 uses its native outbound', () => {
  const native = compileXrayConfig(connection('socks5'), local).outbounds[0];
  assert.equal(native.protocol, 'socks');
  assert.equal(native.settings.version, undefined);
  for (const protocol of ['socks4', 'socks4a']) {
    const source = connection(protocol, {password:''});
    assert.equal(normalizeProxy(source).protocol, protocol);
    assert.throws(() => compileXrayConfig(source, local), /辅助服务尚未就绪/);
    const config = compileXrayConfig(source, {...local,helperProxy:{protocol:'socks5',host:'127.0.0.1',port:42323}});
    assert.deepEqual(config.outbounds[0].settings, {servers:[{address:'127.0.0.1',port:42323}]});
    assert.throws(() => compileXrayConfig(connection('http',{proxyOptions:{transit:source}}), local), /辅助服务尚未就绪/);
  }
  assert.equal(normalizeProxy(connection('socks5h')).protocol, 'socks5');
  assert.throws(() => normalizeProxy(connection('socks4')), /不支持密码/);
  assert.throws(() => normalizeProxy(connection('socks5', { username: '界'.repeat(86) })), /255 字节/);
});

test('Shadowsocks maps legacy method and rejects unsupported or incomplete ciphers', () => {
  const normalized = normalizeProxy({ proxyType: 'SS', server: 'gateway.test', server_port: 8388, password: 'p\\"@', method: 'AEAD_AES_256_GCM' });
  const outbound = compileXrayConfig(normalized, local).outbounds[0];
  assert.equal(outbound.protocol, 'shadowsocks');
  assert.deepEqual(outbound.settings.servers[0], { address: 'gateway.test', port: 8388, method: 'aes-256-gcm', password: 'p\\"@' });
  assert.throws(() => normalizeProxy(connection('ss')), /加密方式/);
  assert.throws(() => normalizeProxy(connection('ss', { encryption: 'aes-256-cfb' })), /加密方式/);
  assert.throws(() => normalizeProxy(connection('ss', { encryption: 'aes-128-gcm', password: '' })), /填写密码/);
});

test('VMess preserves its user settings and maps WebSocket, TLS and host independently', () => {
  const source = vmess({ alterId: 0, security: 'chacha20-poly1305', securityTls: 'tls', network: 'ws', serverName: 'sni.test', path: '/socket?ed=2048', host: 'cdn.test' });
  const outbound = compileXrayConfig(source, local).outbounds[0];
  assert.equal(outbound.protocol, 'vmess');
  assert.deepEqual(outbound.settings.vnext[0].users, [{ id, alterId: 0, security: 'chacha20-poly1305' }]);
  assert.deepEqual(outbound.streamSettings.wsSettings, { path: '/socket?ed=2048', headers: { Host: 'cdn.test' } });
  assert.equal(outbound.streamSettings.tlsSettings.serverName, 'sni.test');
  assert.equal(outbound.streamSettings.tlsSettings.allowInsecure, false);
  assert.equal(outbound.mux, undefined);
  const legacy = normalizeProxy({ proxyType: 'vmess', ip: 'gateway.test', port: 443, protocol: 'grpc', vmessUser: { id, securityTls: 'none', serviceName: 'service' } });
  assert.equal(compileXrayConfig(legacy, local).outbounds[0].streamSettings.grpcSettings.serviceName, 'service');
  assert.throws(() => normalizeProxy(vmess({ id: 'bad-uuid' })), /UUID/);
  assert.equal(normalizeProxy(vmess({ securityTls: false })).proxyOptions.vmessUser.securityTls, 'none');
  assert.equal(normalizeProxy(vmess({ securityTls: true })).proxyOptions.vmessUser.securityTls, 'tls');
});

test('transport Host keeps its explicit port and IPv6 authority separate from SNI', () => {
  for (const host of ['cdn.test:8443', '[2001:db8::1]:443']) {
    const source = vmess({ network: 'ws', host, serverName: 'certificate.test' });
    const outbound = compileXrayConfig(source, local).outbounds[0];
    assert.equal(outbound.streamSettings.wsSettings.headers.Host, host);
    assert.equal(outbound.streamSettings.tlsSettings.serverName, 'certificate.test');
  }
});

test('SSR rejects SS-only 2022 ciphers and maps aliases before starting its helper', () => {
  for (const [alias, expected] of Object.entries({ plain: 'none', 'chacha20-poly1305': 'chacha20-ietf-poly1305', 'xchacha20-poly1305': 'xchacha20-ietf-poly1305' })) {
    assert.equal(normalizeProxy(connection('ssr', { encryption: alias })).proxyOptions.encryption, expected);
  }
  for (const encryption of ['2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305']) assert.throws(() => normalizeProxy(connection('ssr', { encryption })), /不支持此加密方式/);
});

test('VLESS Reality preserves server public key, short ID and TLS fingerprint', () => {
  const source = vless({ fingerprint: 'firefox', spiderX: '/resources' });
  const normalized = normalizeProxy(source);
  assert.deepEqual(normalizeProxy(normalized), normalized);
  const outbound = compileXrayConfig(normalized, local).outbounds[0];
  assert.equal(outbound.protocol, 'vless');
  assert.deepEqual(outbound.settings.vnext[0].users, [{ id, encryption: 'none', flow: 'xtls-rprx-vision' }]);
  assert.deepEqual(outbound.streamSettings.realitySettings, { serverName: 'example.test', fingerprint: 'firefox', publicKey, shortId: 'aabb', spiderX: '/resources', show: false });
  assert.equal(outbound.proxySettings, undefined);
  assert.equal(outbound.mux, undefined);
});

test('legacy VLESS flat fields normalize without confusing the connection and transport protocols', () => {
  const normalized = normalizeProxy({ proxyType: 'vless', ip: 'gateway.test', port: 443, userName: id, protocol: 'tcp', protocol_parameter: 'xtls-rprx-vision', confuse: 'reality', confuse_parameter: 'sni.test', random_string: publicKey, short_id: 'aabb' });
  assert.equal(normalized.protocol, 'vless');
  assert.equal(normalized.proxyOptions.vlessUser.network, 'tcp');
  assert.equal(normalized.proxyOptions.vlessUser.serverName, 'sni.test');
  assert.equal(normalized.proxyOptions.vlessUser.publicKey, publicKey);
  assert.equal(normalized.proxyOptions.vlessUser.shortId, 'aabb');
  assert.equal(normalizeProxy(connection('http', { transitInfo: { server: '', port: 0, protocol: '' } })).proxyOptions.transit, undefined);
});

test('invalid Reality and incompatible Vision transports fail before starting a child', () => {
  for (const override of [{ publicKey: '' }, { publicKey: 'invalid' }, { shortId: 'abc' }, { serverName: '' }, { network: 'ws' }]) {
    assert.throws(() => normalizeProxy(vless(override)));
  }
  assert.throws(() => normalizeProxy(vless({ security: 'none', flow: 'xtls-rprx-vision' })), /Vision/);
  const tls = compileXrayConfig(vless({ security: 'tls', network: 'grpc', flow: '', serviceName: 'service', serverName: 'sni.test' }), local).outbounds[0];
  assert.equal(tls.streamSettings.grpcSettings.serviceName, 'service');
  assert.equal(tls.streamSettings.realitySettings, undefined);
  assert.equal(tls.streamSettings.tlsSettings.allowInsecure, false);
});

test('chained relays preserve target transport and never inject a direct outbound', () => {
  const source = vmess({ network: 'ws', path: '/stream', securityTls: 'tls' });
  source.proxyOptions.transit = connection('https', { proxyOptions: { transit: connection('socks5') } });
  const config = compileXrayConfig(source, local);
  assert.deepEqual(config.outbounds.map(item => item.tag), ['proxy', 'proxy-transit', 'proxy-transit-transit']);
  assert.equal(config.outbounds[0].streamSettings.sockopt.dialerProxy, 'proxy-transit');
  assert.equal(config.outbounds[0].streamSettings.security, 'tls');
  assert.equal(config.outbounds[0].streamSettings.wsSettings.path, '/stream');
  assert.equal(config.outbounds[1].streamSettings.sockopt.dialerProxy, 'proxy-transit-transit');
  assert.equal(config.outbounds[1].streamSettings.tlsSettings.allowInsecure, false);
  for (const outbound of config.outbounds) { assert.notEqual(outbound.protocol, 'freedom'); assert.equal(outbound.proxySettings, undefined); }
});

test('SSR and SSH are explicitly adapted through a local SOCKS helper', () => {
  const helperProxy = { protocol: 'socks5', host: '127.0.0.1', port: 42323 };
  for (const source of [connection('ssh'), connection('ssr', { encryption: 'aes-256-cfb', proxyOptions: { transportProtocol: 'auth_aes128_sha1', obfs: 'tls1.2_ticket_auth' } })]) {
    assert.throws(() => compileXrayConfig(source, local), /辅助服务尚未就绪/);
    const config = compileXrayConfig(source, { ...local, helperProxy });
    assert.deepEqual(config.outbounds[0].settings, { servers: [{ address: '127.0.0.1', port: 42323 }] });
    assert.throws(() => compileXrayConfig(source, { ...local, helperProxy: connection('socks5') }), /本机/);
  }
  const legacy = normalizeProxy({ proxyType: 'SSR', ip: 'gateway.test', port: 8388, password: 'pass', protocol: 'auth_aes128_sha1', protocol_parameter: 'argument', encryption: 'aes-256-cfb', confuse: 'tls1.2_ticket_auth', confuse_parameter: 'host.test' });
  assert.equal(legacy.proxyOptions.transportProtocol, 'auth_aes128_sha1');
  assert.equal(legacy.proxyOptions.protocolParameter, 'argument');
  assert.equal(legacy.proxyOptions.obfsParameter, 'host.test');
});

test('backup connections are normalized without being compiled as implicit bypasses', () => {
  const source = connection('http', { proxyOptions: { alternatives: [connection('https'), vless()] } });
  const normalized = normalizeProxy(source);
  assert.equal(normalized.proxyOptions.alternatives[0].proxyOptions.tls.allowInsecure, false);
  assert.equal(normalized.proxyOptions.alternatives[1].proxyOptions.vlessUser.id, id);
  assert.equal(compileXrayConfig(normalized, local).outbounds.length, 1);
  source.proxyOptions.alternatives.push(source);
  assert.throws(() => normalizeProxy(source), /循环/);
  assert.throws(() => normalizeProxy(connection('http', { proxyOptions: { alternatives: Array(9).fill(connection()) } })), /8 条/);
});

test('diagnostics never include raw upstream messages or invalid parameter values', () => {
  assert.equal(safeProxyMessage(new Error('https://private-user:private-password@private-host')), '代理连接失败，请检查地址、认证信息及网络');
  for (const source of [connection('secret-protocol'), connection('vless', { username: 'secret-id' }), connection('http', { host: 'secret@host' })]) {
    assert.throws(() => normalizeProxy(source), error => !safeProxyMessage(error).includes('secret'));
  }
});

// Opt in with an explicitly selected binary. Tests never discover a legacy
// installation or download an executable on their own.
test('compiled configurations are accepted by the selected Xray binary', { skip: !process.env.SPB_XRAY_TEST_PATH }, () => {
  const cases = [connection('http'), connection('https'), connection('socks5'), connection('socks4', { password: '' }), connection('socks4a', { password: '' }), connection('ss', { encryption: 'aes-128-gcm' }), vmess(), vmess({ network: 'ws', path: '/ws', host: 'cdn.test' }), vmess({ network: 'grpc', serviceName: 'service' }), vless(), vless({ security: 'tls', network: 'grpc', flow: '', serviceName: 'service' })];
  const transit = vless(); transit.proxyOptions.transit = connection('https'); cases.push(transit);
  for (const network of ['http', 'kcp', 'quic', 'httpupgrade', 'splithttp']) cases.push(vmess({ network, securityTls: 'none' }));
  for (const source of cases) {
    const parameters = ['socks4','socks4a'].includes(source.protocol) ? {...local,helperProxy:{protocol:'socks5',host:'127.0.0.1',port:42323}} : local;
    const result = spawnSync(process.env.SPB_XRAY_TEST_PATH, ['run', '-test', '-config', 'stdin:'], { input: JSON.stringify(compileXrayConfig(source, parameters)), encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${source.protocol} configuration was rejected: ${result.stderr}`);
  }
});
