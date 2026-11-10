const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

// These hooks rely on the pinned builder's extra-resource signing order and
// osx-sign's synchronous optionsForFile callback, with the outer app last.
const supportedVersions = { builder: '24.13.3', signer: '1.0.5' };
const builds = new WeakMap();
const wrapped = Symbol('proxy-runtime-signing');
const windowsWrapped = Symbol('proxy-runtime-windows-signing');
const digest = data => createHash('sha256').update(data).digest('hex');
const fail = message => { throw new Error('Proxy runtime package integrity: ' + message); };

function assertVersions() {
  if (require('app-builder-lib/package.json').version !== supportedVersions.builder ||
      require('@electron/osx-sign/package.json').version !== supportedVersions.signer) {
    fail('builder/signing dependencies changed; review signing order before packaging');
  }
}
function contained(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) fail('invalid resource path');
  const file = path.resolve(root, relative);
  if (!file.startsWith(path.resolve(root) + path.sep)) fail('resource path escapes proxy-runtime');
  return file;
}
function fileInfo(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) fail('runtime must be a regular file: ' + path.basename(file));
  return { size: stat.size, sha256: digest(fs.readFileSync(file)) };
}
function verifyFile(file, expected) {
  const actual = fileInfo(file);
  if (actual.sha256 !== expected.sha256 || (expected.size !== undefined && actual.size !== expected.size)) {
    fail('unexpected bytes in ' + path.basename(file));
  }
  return actual;
}
function replaceFile(file, contents, mode) {
  const temporary = file + '.spb-' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, contents, { flag: 'wx', mode });
    fs.renameSync(temporary, file);
  } finally { fs.rmSync(temporary, { force: true }); }
}
function entries(manifest, platformKey, directory) {
  const entry = manifest.platforms?.[platformKey];
  if (!entry) return [];
  const executable = contained(directory, entry.file);
  return [{ file: executable, sha256: entry.sha256, size: entry.size },
    ...Object.entries(entry.dependencies || {}).map(([name, sha256]) => {
      if (path.basename(name) !== name || name.includes('\\')) fail('invalid dependency path');
      return { file: contained(directory, path.join(path.dirname(entry.file), name)), sha256 };
    })];
}
function stateFor(context) {
  const state = builds.get(context.packager)?.get(path.resolve(context.appOutDir));
  if (!state) fail('beforePack validation did not run');
  return state;
}
function verifySource(state) {
  for (const item of state.manifests) {
    if (digest(fs.readFileSync(path.join(state.source, item.name))) !== item.sourceHash) fail('source manifest changed during packaging');
    for (const entry of entries(item.sourceManifest, state.platformKey, state.source)) verifyFile(entry.file, entry);
  }
}
function writeDistribution(state, allowSignedChanges) {
  for (const item of state.manifests) {
    const original = item.sourceManifest.platforms?.[state.platformKey];
    const manifest = { ...item.sourceManifest, platforms: {}, distribution: {
      platform: state.platformKey, upstreamManifestSha256: item.sourceHash,
    } };
    if (original) {
      const packagedFiles = entries(item.sourceManifest, state.platformKey, state.directory);
      const info = packagedFiles.map(entry => allowSignedChanges === true ? fileInfo(entry.file) :
        verifyFile(entry.file, allowSignedChanges?.get?.(path.resolve(entry.file)) || entry));
      const entry = { ...original, ...info[0], upstreamSha256: original.sha256, upstreamSize: original.size };
      if (original.dependencies) {
        entry.upstreamDependencies = { ...original.dependencies };
        entry.dependencies = Object.fromEntries(Object.keys(original.dependencies).map((name, index) => [name, info[index + 1].sha256]));
      }
      manifest.platforms[state.platformKey] = entry;
    }
    item.distribution = manifest;
    item.distributionText = JSON.stringify(manifest, null, 2) + '\n';
    // Builder may use hard links on CI. Replacing the inode keeps upstream
    // manifests immutable even when their packaged copy was hard-linked.
    replaceFile(path.join(state.directory, item.name), item.distributionText, 0o644);
  }
}
function verifyDistribution(state) {
  for (const item of state.manifests) {
    if (fs.readFileSync(path.join(state.directory, item.name), 'utf8') !== item.distributionText) fail('packaged manifest changed after finalization');
    for (const entry of entries(item.distribution, state.platformKey, state.directory)) verifyFile(entry.file, entry);
  }
}

async function beforePack(context) {
  assertVersions();
  const architecture = typeof context.arch === 'string' ? context.arch : require('builder-util').Arch[context.arch];
  const platformKey = `${context.electronPlatformName}-${architecture}`;
  if (!['win32-x64', 'darwin-x64', 'darwin-arm64'].includes(platformKey)) fail('unsupported package architecture ' + platformKey);
  const source = path.join(context.packager.projectDir, 'proxy-runtime');
  const state = { source, platformKey, directory: path.join(context.packager.getResourcesDir(context.appOutDir), 'proxy-runtime'), signedFiles: new Map(), manifests: ['manifest.json', 'ssr-manifest.json'].map(name => {
    const bytes = fs.readFileSync(path.join(source, name));
    return { name, sourceHash: digest(bytes), sourceManifest: JSON.parse(bytes.toString('utf8')) };
  }) };
  if (!state.manifests[0].sourceManifest.platforms?.[platformKey]) fail('Xray resource missing for target');
  verifySource(state);
  let states = builds.get(context.packager);
  if (!states) { states = new Map(); builds.set(context.packager, states); }
  states.set(path.resolve(context.appOutDir), state);
  if (context.electronPlatformName === 'win32') wrapWindowsSigning(context.packager);
}

function wrapWindowsSigning(packager) {
  if (packager[windowsWrapped]) return;
  if (typeof packager.sign !== 'function') fail('Windows signer integration changed');
  const original = packager.sign;
  packager.sign = async function (file, ...args) {
    const resolved = path.resolve(file);
    const state = [...(builds.get(this)?.values() || [])].find(candidate => resolved.startsWith(candidate.directory + path.sep));
    if (!state) return original.call(this, file, ...args);
    const entry = state.manifests.flatMap(item => entries(item.sourceManifest, state.platformKey, state.directory)).find(candidate => candidate.file === resolved);
    if (!entry) fail('unlisted proxy runtime file passed to the Windows signer');
    verifyFile(file, state.signedFiles.get(resolved) || entry);
    const result = await original.call(this, file, ...args);
    if (result) state.signedFiles.set(resolved, fileInfo(file));
    else verifyFile(file, state.signedFiles.get(resolved) || entry);
    return result;
  };
  packager[windowsWrapped] = true;
}

function wrapMacSigning(packager) {
  if (packager[wrapped]) return;
  if (typeof packager.doSign !== 'function') fail('macOS signer integration changed');
  const original = packager.doSign;
  packager.doSign = async function (options, customOptions) {
    const directory = path.join(path.resolve(options.app), 'Contents', 'Resources', 'proxy-runtime');
    const state = [...(builds.get(this)?.values() || [])].find(candidate => candidate.directory === directory);
    if (!state) fail('macOS signing has no verified package');
    verifyDistribution(state);
    const expectedHelpers = new Set(state.manifests.flatMap(item => entries(item.distribution, state.platformKey, state.directory).map(entry => path.resolve(entry.file))));
    const visited = new Set();
    let sealed = false;
    const originalOptions = options.optionsForFile;
    const optionsForFile = file => {
      const resolved = path.resolve(file);
      if (expectedHelpers.has(resolved)) visited.add(resolved);
      if (resolved === path.resolve(options.app)) {
        if ([...expectedHelpers].some(helper => !visited.has(helper))) fail('a proxy helper was skipped by the macOS signer');
        // osx-sign invokes this synchronously after all nested code is signed,
        // immediately before sealing the outer app. Never mutate after sealing.
        writeDistribution(state, true);
        sealed = true;
      }
      const result = originalOptions?.(file);
      if (result?.then) fail('asynchronous optionsForFile is unsupported by the pinned signer');
      return result;
    };
    await original.call(this, { ...options, optionsForFile }, customOptions);
    if (!sealed) fail('macOS signer did not finalize the outer application');
    verifyDistribution(state);
  };
  packager[wrapped] = true;
}

async function afterPack(context) {
  const state = stateFor(context);
  verifySource(state);
  for (const item of state.manifests) {
    if (digest(fs.readFileSync(path.join(state.directory, item.name))) !== item.sourceHash) fail('copied manifest does not match verified upstream');
  }
  if (context.electronPlatformName === 'win32') {
    // In 24.13.3 extraResources are signed while copied, before afterPack;
    // signApp later touches only root executables/app.asar.unpacked/swiftshader.
    writeDistribution(state, state.signedFiles);
  } else {
    // codesign must never modify an upstream binary through a copy hard link.
    for (const item of state.manifests) for (const entry of entries(item.sourceManifest, state.platformKey, state.directory)) {
      const stat = fs.lstatSync(entry.file);
      if (stat.nlink > 1) replaceFile(entry.file, fs.readFileSync(entry.file), stat.mode & 0o777);
    }
    writeDistribution(state, false);
    wrapMacSigning(context.packager);
  }
  verifyDistribution(state);
}

async function afterSign(context) {
  // Read-only: changing an app resource here would invalidate its macOS seal.
  const state = stateFor(context);
  verifyDistribution(state);
  verifySource(state);
}

module.exports = { beforePack, afterPack, afterSign };
