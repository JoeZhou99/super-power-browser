const fs = require('node:fs/promises');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');
const { HttpsProxyAgent } = require('https-proxy-agent');
const manifest = require('../proxy-runtime/manifest.json');

const runtimeRoot = path.resolve(__dirname, '../proxy-runtime');
const maxArchiveBytes = 80 * 1024 * 1024;
const digest = (data) => crypto.createHash('sha256').update(data).digest('hex');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function download(url, agent, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (new URL(url).protocol !== 'https:' || redirects > 5) {
      reject(new Error('Invalid Xray release download redirect'));
      return;
    }
    const request = https.get(url, {
      agent,
      headers: { 'User-Agent': 'SuperPowerBrowser-runtime-builder' },
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!response.headers.location) return reject(new Error('Missing release redirect'));
        return download(new URL(response.headers.location, url), agent, redirects + 1).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Xray release download returned HTTP ${response.statusCode}`));
        return;
      }
      let received = 0;
      const chunks = [];
      response.on('data', (chunk) => {
        received += chunk.length;
        if (received > maxArchiveBytes) {
          response.destroy(new Error('Xray release archive exceeds size limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('Xray release download interrupted')));
    });
    const deadline = setTimeout(() => request.destroy(new Error('Xray release download timed out')), 120_000);
    request.setTimeout(30_000, () => request.destroy(new Error('Xray release connection timed out')));
    request.on('close', () => clearTimeout(deadline));
    request.on('error', reject);
  });
}

async function matches(file, sha256, size) {
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || (size !== undefined && stat.size !== size)) return false;
    return digest(await fs.readFile(file)) === sha256;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function withLock(key, action) {
  const lockPath = path.join(runtimeRoot, `.${key}.lock`);
  const deadline = Date.now() + 180_000;
  let lock;
  while (!lock) {
    try {
      lock = await fs.open(lockPath, 'wx', 0o600);
      await lock.writeFile(String(process.pid));
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const pid = Number(await fs.readFile(lockPath, 'utf8'));
        if (Number.isInteger(pid) && pid > 0) {
          try { process.kill(pid, 0); } catch (probeError) {
            if (probeError.code === 'ESRCH') await fs.unlink(lockPath);
          }
        }
      } catch (readError) { if (readError.code !== 'ENOENT') throw readError; }
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for Xray resource preparation: ${key}`);
      await delay(100);
    }
  }
  try { return await action(); } finally {
    await lock.close();
    await fs.unlink(lockPath);
  }
}

async function atomicWrite(file, data, mode) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, data, { mode, flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function prepareTarget(key, options = {}) {
  const entry = manifest.platforms[key];
  if (!entry) throw new Error(`Unsupported Xray platform: ${key}`);
  const executable = path.join(runtimeRoot, entry.file);
  const target = path.dirname(executable);
  const license = path.join(target, 'LICENSE');
  const valid = async () => (await matches(executable, entry.sha256, entry.size)) &&
    (await matches(license, manifest.licenseSha256));
  const log = options.log || console.log;
  await fs.mkdir(runtimeRoot, { recursive: true });
  return withLock(key, async () => {
    if (await valid()) {
      if (process.platform !== 'win32') await fs.chmod(executable, 0o755);
      log(`Xray ${manifest.version} ${key}: verified`);
      return executable;
    }
    const cache = path.join(runtimeRoot, '.downloads');
    await fs.mkdir(cache, { recursive: true });
    const archivePath = path.join(cache, `${entry.archiveSha256}.zip`);
    let archive;
    if (await matches(archivePath, entry.archiveSha256)) archive = await fs.readFile(archivePath);
    else {
      log(`Xray ${manifest.version} ${key}: downloading official release`);
      const proxy = options.proxy ?? process.env.SPB_PROXY_DOWNLOAD_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
      const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
      try { archive = await download(entry.archive, agent); } finally { agent?.destroy(); }
      if (digest(archive) !== entry.archiveSha256) throw new Error(`Xray archive SHA256 mismatch: ${key}`);
      await atomicWrite(archivePath, archive, 0o600);
    }
    const zip = new AdmZip(archive);
    // Extract only these exact root entries, never paths supplied by the archive.
    const binaryEntry = zip.getEntry(path.basename(entry.file));
    const licenseEntry = zip.getEntry('LICENSE');
    if (!binaryEntry || !licenseEntry || binaryEntry.isDirectory || licenseEntry.isDirectory) {
      throw new Error(`Xray archive is missing required files: ${key}`);
    }
    const binary = binaryEntry.getData();
    const licenseData = licenseEntry.getData();
    if (binary.length !== entry.size || digest(binary) !== entry.sha256 || digest(licenseData) !== manifest.licenseSha256) {
      throw new Error(`Xray extracted resource SHA256 mismatch: ${key}`);
    }
    await fs.mkdir(target, { recursive: true });
    await atomicWrite(license, licenseData, 0o644);
    await atomicWrite(executable, binary, 0o755);
    log(`Xray ${manifest.version} ${key}: ready`);
    return executable;
  });
}

async function prepareTargets(targets, options) {
  for (const target of [...new Set(targets)]) await prepareTarget(target, options);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let targets;
  if (args.length === 0) targets = [`${process.platform}-${process.arch}`];
  else if (args.length === 2 && args[0] === '--targets') targets = args[1].split(',').map((value) => value.trim());
  else if (args.length === 1 && args[0] === '--all') targets = Object.keys(manifest.platforms);
  else {
    console.error('Usage: node scripts/prepare-proxy-runtime.cjs [--targets win32-x64,darwin-x64,darwin-arm64 | --all]');
    process.exitCode = 1;
  }
  if (targets) prepareTargets(targets).catch((error) => {
    console.error(`Xray resource preparation failed: ${error.message.replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/g, 'https://[redacted]@')}`);
    process.exitCode = 1;
  });
}

module.exports = { prepareTarget, prepareTargets, manifest, download, matches, atomicWrite, withLock, digest };
