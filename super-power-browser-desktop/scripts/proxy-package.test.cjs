const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hooks = require('./proxy-package.cjs');
const { resolveProxyBinary } = require('../src/main/services/ProxyProcess');

const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function fixture(t, platform = 'win32', arch = 'x64') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spb-proxy-package-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const projectDir = path.join(root, 'source'), source = path.join(projectDir, 'proxy-runtime');
  const appOutDir = path.join(root, 'dist'), app = path.join(appOutDir, 'Synthetic.app');
  const resources = platform === 'darwin' ? path.join(app, 'Contents', 'Resources') : path.join(appOutDir, 'resources');
  const packaged = path.join(resources, 'proxy-runtime'), key = `${platform}-${arch}`;
  fs.mkdirSync(source, { recursive: true });
  const files = [];
  for (const name of ['manifest.json', 'ssr-manifest.json']) {
    const ssr = name.startsWith('ssr'), relative = ssr ? `ssr/${key}/ssr-client${platform === 'win32' ? '.exe' : ''}` : `${key}/xray${platform === 'win32' ? '.exe' : ''}`;
    const manifest = { schemaVersion: 1, version: 'synthetic', platforms: {} };
    if (!(ssr && key === 'darwin-arm64')) {
      const file = path.join(source, relative), bytes = Buffer.from(`verified upstream ${relative}`);
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); files.push(relative);
      const entry = { file: relative, size: bytes.length, sha256: hash(bytes) };
      if (ssr && platform === 'win32') {
        const dependency = path.join(path.dirname(relative), 'synthetic.dll'), contents = Buffer.from('verified dependency');
        fs.writeFileSync(path.join(source, dependency), contents); files.push(dependency);
        entry.dependencies = { 'synthetic.dll': hash(contents) };
      }
      manifest.platforms[key] = entry;
    }
    fs.writeFileSync(path.join(source, name), JSON.stringify(manifest, null, 2) + '\n');
  }
  const packager = {
    projectDir,
    getResourcesDir: () => resources,
    sign: async file => { fs.appendFileSync(file, '\nSYNTHETIC SIGNATURE'); return true; },
    doSign: async () => { throw new Error('test did not supply a signer'); },
  };
  return { root, source, app, resources, packaged, files, key, packager,
    context: { appOutDir, packager, electronPlatformName: platform, arch },
    copy: () => fs.cpSync(source, packaged, { recursive: true }),
  };
}

test('electron-builder resolves all three hooks from their configured named exports', async () => {
  const { resolveFunction } = require('app-builder-lib/out/platformPackager');
  const configuration = require('../package.json').build;
  for (const hook of ['beforePack', 'afterPack', 'afterSign']) {
    const resolved = await resolveFunction('commonjs', path.resolve(__dirname, '..', configuration[hook]), hook);
    assert.equal(resolved, hooks[hook]);
  }
});

test('packaging rejects a modified upstream runtime before copying or signing', async t => {
  const f = fixture(t); fs.appendFileSync(path.join(f.source, f.files[0]), 'tampered');
  await assert.rejects(hooks.beforePack(f.context), /unexpected bytes/);
});

test('Windows manifests use actual signed exe and DLL bytes without changing upstream pins', async t => {
  const f = fixture(t), upstream = fs.readFileSync(path.join(f.source, 'manifest.json'), 'utf8');
  await hooks.beforePack(f.context); f.copy();
  const { WinPackager } = require('app-builder-lib/out/winPackager');
  f.packager.platformSpecificBuildOptions = { signDlls: true };
  f.packager.shouldSignFile = WinPackager.prototype.shouldSignFile;
  const transform = WinPackager.prototype.createTransformerForExtraFiles.call(f.packager, f.context);
  for (const file of f.files) await transform(path.join(f.source, file)).afterCopyTransformer(path.join(f.packaged, file));
  await assert.rejects(resolveProxyBinary(f.resources), /不完整|校验失败/);
  await hooks.afterPack(f.context);
  await hooks.afterSign(f.context);
  assert.equal(await resolveProxyBinary(f.resources), path.join(f.packaged, f.files[0]));
  await resolveProxyBinary(f.resources, 'ssr');
  const original = JSON.parse(upstream).platforms[f.key], packaged = read(path.join(f.packaged, 'manifest.json')).platforms[f.key];
  assert.notEqual(packaged.sha256, original.sha256);
  assert.notEqual(packaged.size, original.size);
  assert.equal(packaged.upstreamSha256, original.sha256);
  assert.equal(fs.readFileSync(path.join(f.source, 'manifest.json'), 'utf8'), upstream);
  fs.appendFileSync(path.join(f.packaged, f.files[0]), 'post-sign corruption');
  await assert.rejects(resolveProxyBinary(f.resources), /不完整|校验失败/);
  await assert.rejects(hooks.afterSign(f.context), /unexpected bytes/);
});

test('Windows rejects mutations not produced by its real signing call boundary', async t => {
  const f = fixture(t); await hooks.beforePack(f.context); f.copy();
  fs.appendFileSync(path.join(f.packaged, f.files[0]), 'untracked modification');
  await assert.rejects(hooks.afterPack(f.context), /unexpected bytes/);
});

test('Windows rejects mutation after a successful signer instead of blessing a new hash', async t => {
  const f = fixture(t); await hooks.beforePack(f.context); f.copy();
  await f.packager.sign(path.join(f.packaged, f.files[0]));
  fs.appendFileSync(path.join(f.packaged, f.files[0]), 'tampered after signer');
  await assert.rejects(hooks.afterPack(f.context), /unexpected bytes/);
});

test('unsigned Windows packaging keeps upstream checks and does not require a certificate', async t => {
  const f = fixture(t); f.packager.sign = async () => false;
  await hooks.beforePack(f.context); f.copy();
  for (const file of f.files) assert.equal(await f.packager.sign(path.join(f.packaged, file)), false);
  await hooks.afterPack(f.context); await hooks.afterSign(f.context);
  const entry = read(path.join(f.packaged, 'manifest.json')).platforms[f.key];
  assert.equal(entry.sha256, entry.upstreamSha256);
});

for (const arch of ['x64', 'arm64']) {
  test(`macOS ${arch} refreshes helper hashes before the outer app is sealed`, async t => {
    const f = fixture(t, 'darwin', arch), calls = [], snapshots = new Map();
    f.packager.doSign = async function (options, customOptions) {
      assert.equal(this, f.packager); assert.equal(options.identity, 'synthetic identity');
      assert.deepEqual(customOptions, { hardenedRuntime: true });
      for (const relative of f.files) {
        const file = path.join(f.packaged, relative);
        assert.deepEqual(options.optionsForFile(file), { hardenedRuntime: true });
        fs.appendFileSync(file, '\nSYNTHETIC MACH-O SIGNATURE'); calls.push('helper');
      }
      options.optionsForFile(f.app);
      for (const name of ['manifest.json', 'ssr-manifest.json']) snapshots.set(name, fs.readFileSync(path.join(f.packaged, name), 'utf8'));
      for (const item of Object.values(read(path.join(f.packaged, 'manifest.json')).platforms)) {
        assert.equal(item.sha256, hash(fs.readFileSync(path.join(f.packaged, item.file))));
      }
      calls.push('outer-app-seal');
    };
    await hooks.beforePack(f.context); f.copy(); await hooks.afterPack(f.context);
    await f.packager.doSign({ app: f.app, identity: 'synthetic identity', optionsForFile: () => ({ hardenedRuntime: true }) }, { hardenedRuntime: true });
    await hooks.afterSign(f.context);
    assert.equal(calls.at(-1), 'outer-app-seal'); assert.equal(calls.length, f.files.length + 1);
    for (const [name, text] of snapshots) assert.equal(fs.readFileSync(path.join(f.packaged, name), 'utf8'), text);
    if (arch === 'arm64') assert.deepEqual(read(path.join(f.packaged, 'ssr-manifest.json')).platforms, {});
    fs.appendFileSync(path.join(f.packaged, 'manifest.json'), ' ');
    await assert.rejects(hooks.afterSign(f.context), /manifest changed/);
  });
}

test('the pinned real osx-sign loop seals refreshed manifests after signing all helpers', async t => {
  const f = fixture(t, 'darwin');
  const signer = require('@electron/osx-sign');
  const util = require(path.join(path.dirname(require.resolve('@electron/osx-sign')), 'util.js'));
  const signed = [], sealed = new Map();
  t.mock.method(util, 'execFileAsync', async (command, args) => {
    assert.equal(command, 'codesign');
    if (!args.includes('--sign')) return '';
    const target = args.at(-1);
    if (target === f.app) {
      assert.equal(signed.length, f.files.length);
      for (const name of ['manifest.json', 'ssr-manifest.json']) {
        sealed.set(name, fs.readFileSync(path.join(f.packaged, name), 'utf8'));
        for (const entry of Object.values(read(path.join(f.packaged, name)).platforms)) {
          assert.equal(entry.sha256, hash(fs.readFileSync(path.join(f.packaged, entry.file))));
        }
      }
    } else {
      fs.appendFileSync(target, '\nSIMULATED CODESIGN BYTES'); signed.push(target);
    }
    return '';
  });
  f.packager.doSign = options => signer.signAsync(options);
  await hooks.beforePack(f.context); f.copy(); await hooks.afterPack(f.context);
  await f.packager.doSign({ app: f.app, platform: 'darwin', identity: 'synthetic test identity',
    identityValidation: false, preEmbedProvisioningProfile: false, preAutoEntitlements: false,
    binaries: f.files.map(file => path.join(f.packaged, file)), optionsForFile: () => ({ hardenedRuntime: true }),
  }, {});
  await hooks.afterSign(f.context);
  assert.equal(sealed.size, 2);
  for (const [name, text] of sealed) assert.equal(fs.readFileSync(path.join(f.packaged, name), 'utf8'), text);
});

test('macOS helper signing failure never reaches outer seal or refreshes the manifest', async t => {
  const f = fixture(t, 'darwin');
  f.packager.doSign = async options => {
    options.optionsForFile(path.join(f.packaged, f.files[0]));
    throw new Error('synthetic signer failure');
  };
  await hooks.beforePack(f.context); f.copy(); await hooks.afterPack(f.context);
  const before = fs.readFileSync(path.join(f.packaged, 'manifest.json'), 'utf8');
  await assert.rejects(f.packager.doSign({ app: f.app }, {}), /synthetic signer failure/);
  assert.equal(fs.readFileSync(path.join(f.packaged, 'manifest.json'), 'utf8'), before);
});

test('macOS refuses to seal when a proxy helper was skipped', async t => {
  const f = fixture(t, 'darwin'); f.packager.doSign = async options => options.optionsForFile(f.app);
  await hooks.beforePack(f.context); f.copy(); await hooks.afterPack(f.context);
  await assert.rejects(f.packager.doSign({ app: f.app }, {}), /helper was skipped/);
});

test('macOS unsigned packaging preserves the original bytes without invoking the signer', async t => {
  const f = fixture(t, 'darwin'); await hooks.beforePack(f.context); f.copy(); await hooks.afterPack(f.context);
  const entry = read(path.join(f.packaged, 'manifest.json')).platforms[f.key];
  assert.equal(entry.sha256, entry.upstreamSha256);
  await hooks.afterSign(f.context);
});

test('CI hard-linked resources are detached before manifest writes and macOS signing', async t => {
  const f = fixture(t, 'darwin');
  const originalManifest = fs.readFileSync(path.join(f.source, 'manifest.json'), 'utf8');
  f.packager.doSign = async options => {
    for (const relative of f.files) {
      const file = path.join(f.packaged, relative); options.optionsForFile(file);
      assert.equal(fs.statSync(file).nlink, 1); fs.appendFileSync(file, '\nSYNTHETIC SIGNATURE');
    }
    options.optionsForFile(f.app);
  };
  await hooks.beforePack(f.context); f.copy();
  for (const relative of [...f.files, 'manifest.json', 'ssr-manifest.json']) {
    const file = path.join(f.packaged, relative); fs.unlinkSync(file); fs.linkSync(path.join(f.source, relative), file);
    assert.equal(fs.statSync(file).nlink, 2);
  }
  await hooks.afterPack(f.context); await f.packager.doSign({ app: f.app }, {}); await hooks.afterSign(f.context);
  assert.equal(fs.readFileSync(path.join(f.source, 'manifest.json'), 'utf8'), originalManifest);
});
