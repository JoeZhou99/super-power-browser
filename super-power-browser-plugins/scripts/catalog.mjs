import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { files } from '../lib/zip.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const api = await readFile(path.join(root, 'src/mall/js/api.js'), 'utf8');
const methods = [...api.matchAll(/async (\w+)\([^)]*\) \{/g)];
const catalog = methods.map((match, i) => {
  const body = api.slice(match.index, methods[i + 1]?.index ?? api.length);
  let endpoint = body.match(/\$\{o\}(\/[\w/-]+)/)?.[1];
  if (match[1] === 'savePasskey') endpoint = '/bindMall/savePasskey';
  if (match[1] === 'listPasskey') endpoint = '/bindMall/listPasskey';
  const requestPath = match[1] === 'getWhiteList' ? '/services/cyt-browser-oss/whiteList_data.json' : '/api/v1' + endpoint;
  return { plugin: 'RXMallHelper', method: match[1], httpMethod: /method: "POST"/.test(body) ? 'POST' : 'GET', path: requestPath, encryptedRequest: /a\.encryption = 1/.test(body), source: 'src/mall/js/api.js' };
});
for (const [method, endpoint, httpMethod] of [
  ['createAccountData', 'bindMall/createBindMallsAccountFilling', 'POST'],
  ['editAccountData', 'bindMall/updateBindMallsAccountFilling', 'POST'],
  ['removeAccountData', 'bindMall/delBindMallsAccountFilling', 'POST'],
  ['getMallsAccountFillingList', 'bindMall/getBindMallsAccountFillingList', 'GET'],
  ['addCustomSiteInfo', 'siteInfo/addCustomSiteInfo', 'POST'],
  ['getSiteTreeByCategories', 'siteInfo/getSiteTreeByCategoriesV2', 'GET'],
  ['delCustomSiteInfo', 'siteInfo/delCustomSiteInfo', 'POST'],
]) catalog.push({ plugin: 'RXAccountManage', method, httpMethod, path: '/api/v1/' + endpoint, source: 'src/account/static/background/index.js' });
if (catalog.some(item => item.path.includes('undefined'))) throw new Error('API 地址解析不完整');
const extraPaths = new Set(), nativeMethods = new Set();
for (const family of ['mall', 'account']) for (const file of await files(path.join(root, 'src', family))) {
  if (!file.endsWith('.js')) continue;
  const text = await readFile(path.join(root, 'src', family, file), 'utf8');
  for (const m of text.matchAll(/\/api\/v1\/[\w/-]+/g)) extraPaths.add(m[0]);
  for (const m of text.matchAll(/chrome\.superbrowser\.(\w+)/g)) nativeMethods.add(m[1]);
}
const common = await import('../src/mall/js/common.js');
const contract = { protocol: 'super-power-browser-extension/1', methods: catalog, additionalStaticPaths: [...extraPaths].sort(), nativeMethods: [...nativeMethods].sort(), events: common.c.event_type, webSocketModules: common.c.module, ipcModules: common.c.ipcModule };
await writeFile(path.join(root, 'docs/api-contract.json'), JSON.stringify(contract, null, 2) + '\n');
console.log(`Catalogued ${catalog.length} named API methods and ${nativeMethods.size} direct native API names`);
