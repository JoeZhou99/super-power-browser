// Test-only server from the pinned upstream archive; excluded from product resources.
const fs = require('node:fs/promises');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { prepareTarget, manifest } = require('./prepare-ssr-runtime.cjs');
const { download, matches, atomicWrite, digest } = require('./prepare-proxy-runtime.cjs');
const root = path.resolve(__dirname, '../proxy-runtime');
const servers = {
  'win32-x64': { name: 'ssr-server.exe', sha256: '48f49ca7eb3a641cfcda2cdee7a4326b6ebce781d96191bc4d6f99acb71b6aa4' },
  'darwin-x64': { name: 'ssr-server', sha256: 'ddbe46ca93c462842e035c10c5de9cf1e37cf7b6de0fb998a2af9263fcd39550' },
};

async function prepareServerFixture(key = `${process.platform}-${process.arch}`) {
  const server = servers[key];
  if (!server) throw new Error(`No pinned SSR server fixture for ${key}`);
  await prepareTarget(key);
  const entry = manifest.platforms[key];
  const cache = path.join(root, '.downloads', `${entry.archiveSha256}.zip`);
  if (!await matches(cache, entry.archiveSha256)) {
    const proxy = process.env.SPB_PROXY_DOWNLOAD_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
    const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
    try {
      const bytes = await download(entry.archive, agent);
      if (digest(bytes) !== entry.archiveSha256) throw new Error('SSR fixture archive SHA256 mismatch');
      await fs.mkdir(path.dirname(cache), { recursive: true });
      await atomicWrite(cache, bytes, 0o600);
    } finally { agent?.destroy(); }
  }
  const zip = new AdmZip(await fs.readFile(cache));
  const target = path.join(root, '.test-fixtures', `ssr-${key}`);
  const files = { [server.name]: server.sha256, ...entry.dependencies };
  const prepared = Object.entries(files).map(([name, sha256]) => {
    const item = zip.getEntry(name);
    if (!item || item.isDirectory) throw new Error(`Missing SSR test fixture: ${name}`);
    const data = item.getData();
    if (digest(data) !== sha256) throw new Error(`SSR test fixture SHA256 mismatch: ${name}`);
    return [name, data];
  });
  await fs.mkdir(target, { recursive: true });
  for (const [name, data] of prepared) await atomicWrite(path.join(target, name), data, name === server.name ? 0o755 : 0o644);
  return path.join(target, server.name);
}

if (require.main === module) prepareServerFixture(process.argv[2]).then(console.log).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { prepareServerFixture };
