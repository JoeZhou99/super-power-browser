const fs = require('node:fs/promises');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { download, matches, atomicWrite, withLock, digest } = require('./prepare-proxy-runtime.cjs');
const manifest = require('../proxy-runtime/ssr-manifest.json');
const root = path.resolve(__dirname, '../proxy-runtime');

async function prepareTarget(key, options = {}) {
  const entry = manifest.platforms[key];
  if (!entry) throw new Error(`No pinned native SSR release is available for ${key}`);
  const target = path.dirname(path.join(root, entry.file));
  const noticesPath = path.join(root, 'licenses/ssr');
  const files = { [path.basename(entry.file)]: entry.sha256, ...entry.dependencies };
  const log = options.log || console.log;
  await fs.mkdir(root, { recursive: true });
  return withLock(`ssr-${key}`, async () => {
    const valid = (await Promise.all(Object.entries(files).map(([name, hash]) => matches(path.join(target, name), hash)))).every(Boolean) &&
      await matches(path.join(target, 'LICENSE'), manifest.licenseSha256) &&
      (await Promise.all(Object.entries(manifest.notices).map(([name, notice]) => matches(path.join(noticesPath, name), notice.sha256)))).every(Boolean);
    if (valid) {
      if (process.platform !== 'win32') await fs.chmod(path.join(root, entry.file), 0o755);
      log(`SSR ${manifest.version} ${key}: verified`);
      return path.join(root, entry.file);
    }
    const proxy = options.proxy ?? process.env.SPB_PROXY_DOWNLOAD_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
    const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
    const cache = path.join(root, '.downloads');
    await fs.mkdir(cache, { recursive: true });
    const cachedDownload = async (url, sha256, extension) => {
      const cached = path.join(cache, `${sha256}.${extension}`);
      if (await matches(cached, sha256)) return fs.readFile(cached);
      const data = await download(url, agent);
      if (digest(data) !== sha256) throw new Error(`SSR download SHA256 mismatch: ${key}`);
      await atomicWrite(cached, data, 0o600);
      return data;
    };
    log(`SSR ${manifest.version} ${key}: preparing official release`);
    try {
      const archive = await cachedDownload(entry.archive, entry.archiveSha256, 'zip');
      const license = await cachedDownload(manifest.licenseUrl, manifest.licenseSha256, 'license');
      const notices = await Promise.all(Object.entries(manifest.notices).map(async ([name, notice]) =>
        [name, await cachedDownload(notice.url, notice.sha256, 'license')]));
      const zip = new AdmZip(archive);
      const prepared = [];
      // Use the pinned root-entry allowlist; never extract the whole archive.
      for (const [name, hash] of Object.entries(files)) {
        const item = zip.getEntry(name);
        if (!item || item.isDirectory) throw new Error(`SSR archive is missing ${name}`);
        const data = item.getData();
        if (digest(data) !== hash) throw new Error(`SSR extracted resource SHA256 mismatch: ${name}`);
        prepared.push([name, data]);
      }
      await fs.mkdir(target, { recursive: true });
      await fs.mkdir(noticesPath, { recursive: true });
      for (const [name, data] of notices) await atomicWrite(path.join(noticesPath, name), data, 0o644);
      await atomicWrite(path.join(target, 'LICENSE'), license, 0o644);
      for (const [name, data] of prepared) {
        await atomicWrite(path.join(target, name), data, name === path.basename(entry.file) ? 0o755 : 0o644);
      }
      log(`SSR ${manifest.version} ${key}: ready`);
      return path.join(root, entry.file);
    } finally { agent?.destroy(); }
  });
}

async function prepareTargets(targets, options) {
  for (const key of [...new Set(targets)]) await prepareTarget(key, options);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let targets;
  if (args.length === 0) targets = [`${process.platform}-${process.arch}`];
  else if (args.length === 1 && args[0] === '--all') targets = Object.keys(manifest.platforms);
  else if (args.length === 2 && args[0] === '--targets') targets = args[1].split(',').map((value) => value.trim());
  else if (args.length === 1 && args[0] === '--host-if-supported') {
    const host = `${process.platform}-${process.arch}`;
    targets = manifest.platforms[host] ? [host] : [];
  } else {
    console.error('Usage: node scripts/prepare-ssr-runtime.cjs [--all | --targets win32-x64,darwin-x64 | --host-if-supported]');
    process.exitCode = 1;
  }
  if (targets) prepareTargets(targets).catch((error) => {
    console.error(`SSR resource preparation failed: ${error.message.replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/g, 'https://[redacted]@')}`);
    process.exitCode = 1;
  });
}

module.exports = { prepareTarget, prepareTargets, manifest };
