import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

export function extensionId(directory, platform = process.platform) {
  const full = (platform === 'win32' ? path.win32 : path).resolve(directory);
  return createHash('sha256').update(Buffer.from(full, platform === 'win32' ? 'utf16le' : 'utf8'))
    .digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
}

export function validateBootstrap(config) {
  if (!config || typeof config !== 'object') throw new Error('缺少插件启动配置');
  for (const field of ['browserId', 'sysMallId', 'accessToken']) {
    if (!['string', 'number'].includes(typeof config[field]) || !String(config[field]).trim()) throw new Error(`缺少 ${field}`);
  }
  if (!Number.isInteger(config.websocketPort) || config.websocketPort < 1 || config.websocketPort > 65535) throw new Error('websocketPort 不合法');
  if (!config.proxyInfo?.proxyAuthUrl && !config.proxyInfo?.proxyUrl) throw new Error('缺少店铺代理配置');
  if (!config.staticProxy?.exchange) throw new Error('缺少翻译代理配置');
  for (const name of ['RXMallHelper', 'RXAccountManage']) {
    if (!/^[a-p]{32}$/.test(config.pluginIdMap?.[name] ?? '')) throw new Error(`缺少正确的 ${name} 扩展 ID`);
  }
  return config;
}

export function encodeBootstrap(config) {
  validateBootstrap(config);
  // The native client and the recovered browser code expect 32 ASCII bytes,
  // with little-endian offsets into a shared random string.
  const random = randomBytes(160).toString('hex');
  const configOffset = 32, socketOffset = 192;
  const key = Buffer.from(random.slice(configOffset, configOffset + 32));
  const wsKey = random.slice(socketOffset, socketOffset + 32);
  const offset = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b.toString('base64'); };
  const iv = randomBytes(16), cipher = createCipheriv('aes-256-cbc', key, iv);
  const value = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]).toString('base64');
  const ivText = iv.toString('base64');
  const mac = createHmac('sha256', key).update(ivText + value).digest('hex');
  return {
    configDat: [random, offset(configOffset), offset(socketOffset)].join('|'),
    initJson: Buffer.from(JSON.stringify({ iv: ivText, value, mac })).toString('base64'),
    wsKey,
  };
}

export function decodeBootstrap(configDat, initJson) {
  const parts = configDat.trim().split('|');
  if (parts.length !== 3) throw new Error('启动密钥格式错误');
  const offset = Buffer.from(parts[1], 'base64');
  if (offset.length !== 4) throw new Error('启动密钥偏移错误');
  const key = Buffer.from(parts[0].slice(offset.readUInt32LE(), offset.readUInt32LE() + 32));
  if (key.length !== 32) throw new Error('启动密钥长度错误');
  const envelope = JSON.parse(Buffer.from(initJson.trim(), 'base64').toString('utf8'));
  const expected = createHmac('sha256', key).update(envelope.iv + envelope.value).digest();
  const actual = Buffer.from(envelope.mac, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('启动配置校验失败');
  const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(envelope.iv, 'base64'));
  const decoded = Buffer.concat([decipher.update(Buffer.from(envelope.value, 'base64')), decipher.final()]);
  return validateBootstrap(JSON.parse(decoded.toString('utf8')));
}
