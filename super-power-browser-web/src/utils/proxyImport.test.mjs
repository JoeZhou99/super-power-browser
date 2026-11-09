import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProxyLine, parseProxyImport, validateProxyAddress, validateChangeIpUrl } from './proxyImport.mjs';

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
