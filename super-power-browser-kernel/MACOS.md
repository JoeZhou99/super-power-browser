# Windows / macOS 内核发布与安装

用户操作流程与旧版一致：登录 → 选择内核版本 → 打开店铺 → 缺少内核时自动下载、校验和解压 → 打开有界面的店铺浏览器。再次打开复用已校验的本地文件；损坏时修复，同一内核的并发下载合并。数据库管理版本和资源元数据，安装包放在本地资源目录或私有 S3，不把 ZIP 存入数据库。

## 平台选择

| 桌面程序 | 内核记录 | 本地 Core 子目录 |
| --- | --- | --- |
| Windows x64 | `win32 / x64` | `{version}`，沿用已有目录 |
| Mac Intel | `darwin / x64` | `darwin-x64-{version}` |
| Mac Apple Silicon | `darwin / arm64` | `darwin-arm64-{version}` |

运行中的 Electron 向页面提供真实系统和架构。版本列表和客户端下载都按这一信息筛选。店铺“操作系统”字段控制网页看到的指纹，与安装包平台无关。在 Rosetta 下运行 x64 桌面程序会选择 x64 内核；Apple Silicon 用户应安装 arm64 桌面程序。

同一个版本可登记三条记录，推荐状态也按平台、架构独立管理。新接口为 `/api/runtime/kernels/{version}/{platform}/{arch}/download` 和对应的 `/archive`。Windows 继续兼容原来的 `{version}/download` 和 `{version}/archive`，旧 Windows 客户端仍收到旧格式地址。未发布或停用的资源不会提供给客户端，不会用其他系统包代替。

Windows 的 profile 路径不变；Mac 使用 `{profiles}/{shopId}/darwin-{arch}-{version}`，避免跨平台或架构共享同一份本地身份文件。已有店铺不会自动升级内核，也不会自动复制 Windows 的登录数据到 Mac。

## 当前资源状态（2026-11-06）

Windows 已锁定并验证的是 144.0.7559.132。上游的这个发布中没有 Mac 包。[148.0.7778.215 发布](https://github.com/adryfish/fingerprint-chromium/releases/tag/148.0.7778.215) 提供一个 macOS DMG，下载地址、源码提交和发布摘要记录在 `upstream.mac.lock.json`。

该锁文件只表示已核对发布元数据，并不代表已经验证其 Intel/Apple Silicon 架构、签名、插件和指纹行为。本次在 Windows 上完成分发和安装逻辑验证，未运行 Mac 原生内核，也未生成 Mac 桌面安装包。Mac 资源必须完成以下步骤后才发布到数据库。不能因为文件名包含 macOS 就为两个架构都登记一条可用记录；脚本会检查实际 Mach-O 架构。

## 准备 Mac 内核（在 Mac 上执行）

需要 Python 3.11+、Node、Xcode Command Line Tools，以及桌面项目的 npm 依赖。在仓库根目录运行：

```sh
python3 super-power-browser-kernel/scripts/fetch-upstream.py .local-preview/upstream \
  --lock super-power-browser-kernel/upstream.mac.lock.json

# Apple Silicon；Intel 将 arm64 改为 x64。
python3 super-power-browser-kernel/scripts/prepare-macos.py \
  .local-preview/upstream/fingerprint-chromium-148-mac.dmg \
  .local-preview/mac-prepared --arch arm64

node super-power-browser-kernel/scripts/publish-runtime.cjs \
  .local-preview/mac-prepared/kernel-148-mac-arm64.zip \
  .local-preview/runtime \
  .local-preview/mac-prepared/kernel-148-mac-arm64.lock.json
```

准备工具验证 DMG 摘要及大小，用只读挂载读取 `.app`，检查完整版本、代码签名、主程序及辅助程序的架构，再生成保留执行权限和内部符号链接的 ZIP。工具不会修改系统安全设置、移除隔离属性或篡改签名。归档不包含 DMG 的 `/Applications` 链接。发布工具累计合并已有的版本清单，不覆盖其他平台和版本；同一版本、系统、架构的已登记资源不可替换。

如果上游 DMG 不包含所需架构，准备步骤会失败。需要按上游对应源码与补丁构建该架构的资源，固定新的来源与摘要，并使用 `--lock` 指定经审查的锁文件；不能把 x64 包标注为 arm64，也不能使用普通 Chromium 代替指纹内核。148 的原生指纹实现与 144 有变化，已有真实店铺不得静默切换到 148。

Mac 实机验收包括：首次安装、再次打开、损坏修复；框架链接、主程序和 helper 的执行权限；有界面的店铺窗口；代理出口、双插件通信、Cookie 保存和关闭；固定 seed 的指纹稳定性。使用隔离测试店铺，不迁移真实店铺数据。

## 发布给其他用户

正式后端需配置 HTTPS API、数据库与内核存储，见 [PRODUCTION.md](PRODUCTION.md)。发布账号的 API 地址和令牌放入 `SPB_API_URL`、`SPB_RELEASE_TOKEN` 环境变量；验证完 Mac 资源后执行：

```sh
python3 super-power-browser-kernel/scripts/release.py publish \
  .local-preview/runtime/kernels.json --version 148 --platform darwin --arch arm64 --recommended
# Intel 包单独准备、验证后，再以 --arch x64 发布。
```

用户安装配置了正式 API 的桌面程序并登录后，打开店铺会自动获取适合当前电脑的版本和下载地址，无需手工去 GitHub 找内核。只把代码提交 GitHub不会使本机 `.local-preview` 包自动对外可用；需要执行上传和发布。生产资源来自自己的存储，不依赖站斧授权或下载域名。

已打包 Mac 客户端从 `~/Library/Application Support/super-power-browser/runtime.config.json` 读取部署配置，例如 `{"apiUrl":"https://api.example.com"}`；也可以通过 `SPB_API_URL` 环境变量提供地址。无需修改已签名的 `.app`。未配置时仍使用本地开发 API。

## Mac 桌面安装包

在 Mac 上安装各子项目依赖并完成 Web 构建后，从 `super-power-browser-desktop` 运行：

```sh
npm run build:mac
```

构建脚本生成应用图标，并分别输出 x64、arm64 的 DMG 和 ZIP。`build` 仍按现有脚本编译 AI、插件与桌面资源。面向外部用户的正式安装包还需在发布环境配置 Apple Developer 签名及 notarization；本次没有生成或签发这些凭据。内核本身的签名也要单独验收，不能用桌面包签名代替。

## 本次验证

客户端临时测试覆盖同版本多架构筛选、Windows 缓存复用及损坏修复、Mac 目录隔离、跨域不发送登录令牌、符号链接越界与循环、错误 CPU/下载地址拒绝，以及发布清单合并和不可变校验。原生 Mac 的符号链接落盘与执行位测试在 Windows 上明确跳过，需在 Mac 验收。后端另以隔离 H2 数据库验证平台记录、停用隔离、下载路由和描述符校验。按项目要求，测试夹具与临时构建产物不随本次源码变更保留。
