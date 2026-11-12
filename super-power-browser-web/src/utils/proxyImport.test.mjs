import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProxyLine, parseProxyImport, validateProxyAddress, validateChangeIpUrl } from './proxyImport.mjs';
import { prepareProxyOptions, validateProxyOptions } from './proxyOptions.mjs';

test('plain and prefixed gateways use the selected or explicit protocol', () => {
  assert.equal(parseProxyLine('gateway.example:1080', 'socks5').protocol, 'socks5');
  assert.equal(parseProxyLine('HTTPS://gateway.example:443', 'socks5').protocol, 'https');
  assert.equal(parseProxyLine('ssh://gateway.example:22:user:pass').protocol, 'ssh');
});
test('supports colon credentials and preserves colons in passwords', () => {
  const proxy = parseProxyLine('socks5://gateway.example:1080:customer-session-1:p:a:ss');
  assert.equal(proxy.username, 'customer-session-1'); assert.equal(proxy.password, 'p:a:ss');
  assert.equal(parseProxyLine('gateway.example:80:user:p@ss:word').password, 'p@ss:word');
});
test('URI credentials decode reserved characters once', () => {
  const proxy = parseProxyLine('http://user%40company:p%3Aa%40ss%2525@gateway.example:8080');
  assert.equal(proxy.username, 'user@company'); assert.equal(proxy.password, 'p:a@ss%25');
  const withoutScheme = parseProxyLine('user:password@gateway.example:1080', 'socks5');
  assert.equal(withoutScheme.username, 'user'); assert.equal(withoutScheme.password, 'password');
  assert.equal(withoutScheme.protocol, 'socks5'); assert.equal(withoutScheme.host, 'gateway.example');
});
test('bracketed IPv6 works with either authentication format', () => {
  assert.equal(parseProxyLine('[2001:db8::1]:8080:user:pass').host, '2001:db8::1');
  assert.equal(parseProxyLine('socks5://user:pass@[::1]:1080').host, '::1');
  assert.throws(() => parseProxyLine('2001:db8::1:8080'));
});
test('remark and change-IP URL suffixes are accepted in either order', () => {
  for (const suffix of ['{店铺 A}[https://provider.example/rotate?key=abc]', '[https://provider.example/rotate?key=abc]{店铺 A}']) {
    const result = parseProxyLine('gateway.example:8080:user:pass' + suffix);
    assert.equal(result.remark, '店铺 A'); assert.equal(result.name, '店铺 A');
    assert.equal(result.changeIpUrl, 'https://provider.example/rotate?key=abc');
  }
});
test('invalid protocol, host, port and credentials produce safe messages', () => {
  for (const value of ['ftp://gateway.example:21', 'gateway.example:0', 'gateway.example:65536', 'gateway.example:8080:', 'http://user%ZZ:SECRET@gateway.example:80', 'gateway.example:80::SECRET', 'http://user:SECRET@gateway.example:80/path']) {
    assert.throws(() => parseProxyLine(value), error => !error.message.includes('SECRET'));
  }
});
test('address validation permits bare IPv6 form input and rejects URLs', () => {
  assert.deepEqual(validateProxyAddress('2001:db8::1', 1080), {host: '2001:db8::1', port: 1080});
  assert.throws(() => validateProxyAddress('https://gateway.example', 443));
  assert.throws(() => validateProxyAddress('gateway.example/path', 443));
  assert.throws(() => validateProxyAddress('999.999.999.999', 443));
  assert.throws(() => validateProxyAddress('gateway.example', 80.5));
});
test('rotation links must be HTTP(S) and cannot contain embedded credentials', () => {
  assert.equal(validateChangeIpUrl(''), '');
  for (const value of ['file:///a', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/#token']) assert.throws(() => validateChangeIpUrl(value));
});
test('import keeps original line numbers and keeps same-gateway sessions separate', () => {
  const result = parseProxyImport('\n gateway.example:80:session-a:secret\r\n\r\ngateway.example:80:session-b:secret\ninvalid');
  assert.equal(result.total, 3); assert.deepEqual(result.rows.map(row => row.line), [2, 4, 5]);
  assert.notEqual(result.rows[0].proxy.username, result.rows[1].proxy.username);
  assert.ok(result.rows[2].error); assert.equal(result.rows[2].proxy, undefined);
});
test('import limit accepts 500 records and rejects 501 before parsing', () => {
  assert.equal(parseProxyImport(Array(500).fill('gateway.example:80').join('\n')).rows.length, 500);
  const result = parseProxyImport(Array(501).fill('gateway.example:80').join('\n'));
  assert.equal(result.rows.length, 0); assert.match(result.error, /501/);
});

const uuid = '11111111-2222-3333-4444-555555555555';
const publicKey = Buffer.alloc(32, 7).toString('base64url');
const encoded = value => Buffer.from(value).toString('base64url');

test('SS share imports preserve method, reserved password characters, UTF-8 remark and IPv6', () => {
  const password = 'p@ss:密码\\"';
  const link = `ss://${encoded(`aes-256-gcm:${password}`)}@[2001:db8::1]:80#${encodeURIComponent('供应商 A')}`;
  const row = parseProxyLine(link);
  assert.equal(row.protocol, 'ss'); assert.equal(row.host, '2001:db8::1'); assert.equal(row.port, 80);
  assert.equal(row.password, password); assert.equal(row.name, '供应商 A'); assert.equal(row.proxyOptions.encryption, 'aes-256-gcm');
  const legacy = parseProxyLine(`ss://${encoded('chacha20-ietf-poly1305:pass@gateway.test:8388')}`);
  assert.equal(legacy.proxyOptions.encryption, 'chacha20-ietf-poly1305');
  assert.throws(() => parseProxyLine(`ss://${encoded('aes-128-gcm:PRIVATE')}@gateway.test:8388?plugin=v2ray-plugin`), error => !error.message.includes('PRIVATE'));
});

test('SSR shares include password, protocol/obfs parameters and the original remark', () => {
  const source = `gateway.test:8388:auth_aes128_sha1:aes-256-cfb:tls1.2_ticket_auth:${encoded('p:a@ss')}/?protoparam=${encoded('123:token')}&obfsparam=${encoded('cdn.test')}&remarks=${encoded('SSR 节点')}`;
  const row = parseProxyLine(`ssr://${encoded(source)}`);
  assert.equal(row.password, 'p:a@ss'); assert.equal(row.name, 'SSR 节点');
  assert.equal(row.proxyOptions.transportProtocol, 'auth_aes128_sha1');
  assert.equal(row.proxyOptions.protocolParameter, '123:token');
  assert.equal(row.proxyOptions.obfs, 'tls1.2_ticket_auth');
  assert.equal(row.proxyOptions.obfsParameter, 'cdn.test');
});

test('SS Base64 credentials preserve literal percent escapes while URL userinfo decodes exactly once', () => {
  const password = ' p%40ss%ZZ:%@ ';
  for (const link of [
    `ss://${encoded(`aes-128-gcm:${password}`)}@gateway.test:8388`,
    `ss://${encoded(`aes-128-gcm:${password}@gateway.test:8388`)}`,
    `ss://aes-128-gcm:${encodeURIComponent(password)}@gateway.test:8388`,
    `ss://${encodeURIComponent(`aes-128-gcm:${password}`)}@gateway.test:8388`,
  ]) assert.equal(parseProxyLine(link).password, password);
});

test('VMess shares preserve UUID and WS/TLS settings without confusing host and server address', () => {
  const source = {v:'2', ps:'VMess 节点', add:'gateway.test', port:'443', id:uuid, aid:'0', scy:'auto', net:'ws', type:'none', host:'cdn.test', path:'/socket?ed=2048', tls:'tls', sni:'certificate.test'};
  const row = parseProxyLine(`vmess://${encoded(JSON.stringify(source))}`);
  assert.equal(row.host, 'gateway.test'); assert.equal(row.proxyOptions.vmessUser.host, 'cdn.test');
  assert.equal(row.proxyOptions.vmessUser.id, uuid); assert.equal(row.proxyOptions.vmessUser.path, '/socket?ed=2048');
  assert.equal(row.proxyOptions.vmessUser.securityTls, 'tls'); assert.equal(row.proxyOptions.tls.allowInsecure, false);
  assert.throws(() => parseProxyLine(`vmess://${encoded(JSON.stringify({...source, tls:'unsupported'}))}`));
});

test('VLESS Reality shares retain all key fields and reject unsupported transports', () => {
  const row = parseProxyLine(`vless://${uuid}@gateway.test:443?type=tcp&security=reality&flow=xtls-rprx-vision&sni=certificate.test&fp=firefox&pbk=${publicKey}&sid=aabb&spx=%2Fpage&headerType=none#${encodeURIComponent('Reality 节点')}`);
  assert.equal(row.proxyOptions.vlessUser.id, uuid); assert.equal(row.proxyOptions.vlessUser.publicKey, publicKey);
  assert.equal(row.proxyOptions.vlessUser.fingerprint, 'firefox'); assert.equal(row.proxyOptions.vlessUser.spiderX, '/page');
  assert.equal(row.proxyOptions.vlessUser.shortId, 'aabb'); assert.equal(row.name, 'Reality 节点');
  assert.throws(() => parseProxyLine(`vless://${uuid}@gateway.test:443?type=xhttp&security=none`));
  assert.throws(() => parseProxyLine(`vless://${uuid}@gateway.test:443?type=ws&security=reality&sni=certificate.test&pbk=${publicKey}`));
  const plain = parseProxyLine(`vless://${uuid}@gateway.test:80?security=none`);
  assert.equal(plain.port, 80); assert.equal(plain.proxyOptions.vlessUser.flow, '');
});

test('editing protocol options excludes retired custom routes and never mutates the record', () => {
  const saved = {vlessUser:{id:uuid, network:'tcp', security:'reality', flow:'xtls-rprx-vision', encryption:'none', serverName:'certificate.test', publicKey, shortId:'aabb'}, transit:{protocol:'https',host:'relay.test',port:443,username:'relay-user',password:'relay-password',proxyOptions:{tls:{serverName:'relay.test',allowInsecure:false}}}, alternatives:[{protocol:'socks5',host:'backup.test',port:1080,username:'backup-user',password:'backup-password'}]};
  const options = prepareProxyOptions('vless', saved);
  options.vlessUser.serverName = 'updated.test';
  const result = validateProxyOptions('vless', options);
  assert.equal(result.transit, undefined); assert.equal(result.alternatives, undefined);
  assert.equal(saved.vlessUser.serverName, 'certificate.test');
  const changedProtocol = prepareProxyOptions('vmess', options, true);
  assert.equal(changedProtocol.vlessUser, undefined); assert.equal(changedProtocol.transit, undefined);
  assert.equal(changedProtocol.alternatives, undefined); assert.equal(changedProtocol.tls.allowInsecure, false);
});

test('mixed batches retain each protocol settings and sanitize malformed links', () => {
  const rows = parseProxyImport(`http://gateway.test:8080:user:pass\nss://${encoded('aes-128-gcm:pass')}@gateway.test:8388\nvless://${uuid}@gateway.test:443?security=tls&type=grpc&serviceName=my-service&sni=certificate.test\nvmess://PRIVATE-INVALID`).rows;
  assert.deepEqual(rows.slice(0,3).map(row => row.proxy.protocol), ['http','ss','vless']);
  assert.equal(rows[2].proxy.proxyOptions.vlessUser.serviceName, 'my-service');
  assert.equal(rows[3].line, 4); assert.ok(rows[3].error); assert.equal(rows[3].error.includes('PRIVATE'), false);
});

test('SSR imports canonicalize supported aliases and reject SS-only 2022 ciphers', () => {
  const link = method => `ssr://${encoded(`gateway.test:8388:origin:${method}:plain:${encoded('synthetic-password')}/?`)}`;
  for (const [method, expected] of Object.entries({plain: 'none', 'chacha20-poly1305': 'chacha20-ietf-poly1305', 'xchacha20-poly1305': 'xchacha20-ietf-poly1305'})) assert.equal(parseProxyLine(link(method)).proxyOptions.encryption, expected);
  for (const method of ['2022-blake3-aes-128-gcm','2022-blake3-aes-256-gcm','2022-blake3-chacha20-poly1305']) assert.throws(() => parseProxyLine(link(method)), /不支持/);
});

test('transport Host imports and editor validation preserve ports and IPv6, rejecting URL injection', () => {
  for (const host of ['cdn.example.com:443','[2001:db8::1]:8443']) {
    const row = parseProxyLine(`vless://${uuid}@gateway.test:443?type=ws&security=tls&host=${encodeURIComponent(host)}&sni=certificate.test`);
    assert.equal(row.proxyOptions.vlessUser.host, host);
    assert.equal(validateProxyOptions('vless', row.proxyOptions).vlessUser.host, host);
  }
  for (const host of ['example.com:0','example.com:65536','example.com:','http://example.com','user:secret@example.com','2001:db8::1','example.com/path']) assert.throws(() => validateProxyOptions('vmess', {vmessUser:{id:uuid,host}}));
});
