# Local proxy runtime

The desktop app uses **Xray-core 1.8.24** from the official
[release](https://github.com/XTLS/Xray-core/releases/tag/v1.8.24). All supported
platforms use the same version, pinned to source commit
`6baad79f9881ee2cf75bdc825b3e2e92b289477a`.

Source and build instructions are available in the
[corresponding source tree](https://github.com/XTLS/Xray-core/tree/6baad79f9881ee2cf75bdc825b3e2e92b289477a)
and [source archive](https://github.com/XTLS/Xray-core/archive/6baad79f9881ee2cf75bdc825b3e2e92b289477a.tar.gz).
Xray is licensed under MPL-2.0. Each prepared platform directory contains its
original `LICENSE`, extracted verbatim from the official release archive.
No modifications have been made to the Xray source. Prepared binaries match the
upstream release exactly; release code signing can change the packaged bytes.

## Prepare and package

Run from `super-power-browser-desktop`:

```text
npm run prepare:proxy
npm run prepare:proxy -- --all
npm run prepare:proxy -- --targets darwin-x64,darwin-arm64
```

The first command prepares the host architecture. `npm run build` prepares and
verifies the host runtime automatically. `build:win` also prepares Windows x64;
`build:mac` also prepares both macOS architectures. The installer includes only
the target platform's executable and license, plus this notice and the manifest.

Downloads honor `SPB_PROXY_DOWNLOAD_PROXY`, then `HTTPS_PROXY` or `HTTP_PROXY`.
For example, in PowerShell:

```powershell
$env:SPB_PROXY_DOWNLOAD_PROXY = 'http://127.0.0.1:7897'
npm run prepare:proxy -- --all
```

The script verifies the archive SHA256 against the checked-in manifest, extracts
only `xray[.exe]` and `LICENSE`, and verifies their pinned SHA256 values before
atomic file replacement. It retains a verified archive cache for offline repair.
Repeated builds validate local files and do not download again. Failed downloads
or bad archives do not replace usable binaries. Resources and their cache are
generated artifacts and are excluded from Git.

## Runtime contract

`manifest.json` is a require-able JSON document. Each `platforms` entry is keyed
by Node's `<process.platform>-<process.arch>` and contains `file`, `size`, and
`sha256`. Resolve the executable as:

```js
path.join(config.resources, 'proxy-runtime', manifest.platforms[platformKey].file)
```

Development `config.resources` is the desktop project root; packaged apps use
Electron's `process.resourcesPath`. No old browser installation, shell search
path, old runtime download service, or old credentials are required.

This build does not use GeoIP/GeoSite routing, so their databases and the Windows
GUI executable `wxray.exe` are intentionally not distributed. Windows 7 is not
a supported platform for the current Electron application.

macOS files receive executable permissions when prepared on macOS. The binaries
remain part of the application's normal signing/notarization flow.

### Signing and distribution hashes

`scripts/proxy-package.cjs` integrates with the builder's `beforePack`,
`afterPack`, and `afterSign` hooks. The checked-in manifests always retain the
official upstream hashes; only the manifests inside each packaged application
are finalized with that distribution's exact executable and DLL hashes/sizes.
The packaged entries also retain the upstream digests for traceability.

Before packaging, all target runtime files are verified against the upstream
pins. On Windows, electron-builder signs extra resources while copying them.
The hook verifies each input at the existing signer boundary and records its
successful output. `afterPack` accepts only those recorded signed bytes or the
unchanged upstream bytes, then writes the packaged manifest. Untracked changes
and changes after signing abort the build. No certificates, signing options,
or unsigned-development decisions are replaced.

On macOS, the hook wraps the builder's existing signing invocation without
changing its identity selection. The normal osx-sign loop signs all nested
helpers first. Its synchronous `optionsForFile` callback for the outer `.app`
then writes the final helper hashes, before the outer application seal covers
the manifests. A skipped helper or missing outer callback aborts packaging.
`afterSign` only reads and verifies; it never changes a sealed application.
The subsequent normal notarization flow is retained.

This integration explicitly supports the pinned electron-builder **24.13.3**
and @electron/osx-sign **1.0.5** call order. A dependency version change fails
packaging until the integration is reviewed and tested. Relevant upstream
implementations are [the builder packaging/signing lifecycle](https://github.com/electron-userland/electron-builder/blob/v24.13.3/packages/app-builder-lib/src/platformPackager.ts)
and [osx-sign's sequential helper/outer-app signing loop](https://github.com/electron/osx-sign/blob/v1.0.5/src/sign.ts).

The runtime continues to require exact full-file SHA256 and executable size
matches. It does not remove signatures, exempt signed files, or recover from a
mismatch by silently trusting the executable. `proxy-package.test.cjs` verifies
Windows executable/DLL signature byte changes, corruption rejection, upstream
pin preservation, and macOS signing order using the real pinned osx-sign loop
with a simulated codesign command. Real Windows certificates, macOS execution,
signature verification and notarization still need release-machine acceptance.

## SSR helper

Xray does not implement ShadowsocksR. The optional local SSR hop uses the
unmodified [ShadowsocksR-native 0.9.3 release](https://github.com/ShadowsocksR-Live/shadowsocksr-native/releases/tag/0.9.3),
with its own `ssr-manifest.json`. Corresponding source, dependency submodule
revisions, and build scripts are available at
[commit 0724abdb9b65862dc43df53d15bb979af13d4dac](https://github.com/ShadowsocksR-Live/shadowsocksr-native/tree/0724abdb9b65862dc43df53d15bb979af13d4dac).
The SSR helper is a separate GPL-3.0 program communicating over local SOCKS;
its original license is downloaded from that exact source commit and retained
alongside the binary. This application does not modify or link SSR source.

```text
npm run prepare:ssr
npm run prepare:ssr -- --all
```

Windows x64 and macOS x64 assets are pinned. The upstream release has **no macOS
arm64 asset**. An arm64 package does not silently install an Intel fallback or
claim native SSR availability. Xray and SSH proxy modes remain separate from
this optional helper. `build` prepares SSR on supported host architectures;
platform packaging scripts prepare the supported target helper explicitly.

The Windows package retains the official client and its release DLLs, including
json-c, libsodium, libuv, mbedTLS, uv-mbed, libbloom and the Microsoft Visual C++
2010 runtime. Their open-source license texts are pinned to the exact dependency
commits and retained in `licenses/ssr`; source references remain available through
the pinned upstream dependency tree. The Microsoft runtime retains its Microsoft
terms. Release distribution must preserve these notices and the corresponding
source links above. Server
executables, sample credentials/configuration files, and macOS metadata are not
installed. Both archives and every extracted executable/DLL are SHA256-checked.

Runtime SSR configuration follows upstream's snake_case JSON keys such as
`protocol_param`, `client_settings`, and `listen_port`. It must listen only on
loopback. Credentials belong to short-lived, owner-readable runtime config,
never the application resources or the command line.

## Local SSR verification

`node scripts/prepare-ssr-test-fixture.cjs` prepares the matching upstream SSR
server in `.test-fixtures/ssr-<platform>-<arch>`, using the already verified
archive and separately pinned server hash. This directory and download caches
are explicitly excluded from installer copy filters and Git.

The upstream 0.9.3 release client rejects loopback **upstream** addresses in
`src/client/client.c::can_access()`. A local test server must bind to an on-machine
non-loopback interface; the application's SOCKS listener still binds only to
`127.0.0.1`. Do not confuse this upstream rule with a failed configuration save.

Verified on Windows: Xray's version command, SSR's help command, SSR `-c` config
loading, the SOCKS5 greeting, and encrypted SSR data reaching a fake server on
the same machine without external network requests. `scripts/ssr-integration.test.cjs`
also verifies a complete Xray -> SSR client -> official SSR server -> local HTTP
round trip, authenticated local access, credential isolation, process/port
cleanup, and cancellation before and after spawning the SSR helper.
Installer resource copying
was exercised for Windows x64, macOS x64 and macOS arm64, including hash checks
and exclusion of other architectures, caches and test servers. macOS binaries
and their system-only dynamic dependencies were inspected; execution and signed
installer acceptance still require macOS validation.
