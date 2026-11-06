# SuperPower Browser 内核

当前 Windows x64 使用 `adryfish/fingerprint-chromium` 的 `144.0.7559.132` 预编译包。版本元数据由数据库管理，ZIP 可放在本地或私有 S3。生产配置与发布流程见 [生产分发说明](PRODUCTION.md)。

Windows / Mac Intel / Apple Silicon 的版本筛选、自动安装、资源准备与发布步骤见 [跨平台内核说明](MACOS.md)。当前 Mac 的原生验证和正式资源发布仍需在 Mac 上完成。

## 来源与构建资源

[upstream.lock.json](upstream.lock.json) 固定上游地址、源码提交、源码包和二进制 SHA-256。源码提交为 `831623f2965e34554304caabfc3a1e4e3741db1f`。源码包包含构建仓库与补丁集；完整 Chromium 源码需按上游流程获取。Chromium、上游及第三方许可证和声明须随对应资源保留。

在项目根目录执行（Python 3.11+、Node，桌面依赖已安装）：

```powershell
python super-power-browser-kernel/scripts/fetch-upstream.py .local-preview/upstream
# 需要代理时追加 --proxy http://127.0.0.1:7897
node super-power-browser-kernel/scripts/publish-runtime.cjs .local-preview/upstream/fingerprint-chromium-144-win-x64.zip .local-preview/runtime
```

开发环境将 `KERNEL_MANIFEST_PATH` 指向生成的 `kernels.json`；根目录启动脚本会自动设置。清单只用于首次导入未登记的版本，日常查询读取数据库。生产通过发布工具上传私有 S3 并发布版本记录。

客户端下载及解压时校验包摘要、逐文件 SHA-256 和路径，支持续传、并发安装锁、损坏修复和原子发布。内核包与源码包不提交 Git。

## 启动与身份

`corePath` 默认为客户端数据目录下的 `Core`，必须可写。每个店铺使用 `{dataPath}/UserFile/independent/{shopId}/{version}`。身份文件绑定 seed、配置协议和二进制摘要；更换构建不能静默覆盖指纹身份。已有店铺不会自动改版本。

启动期间支持“取消打开”。共享下载按使用者计数，取消一家店铺不影响其他店铺；全部取消时保留断点。退出客户端会取消待启动任务并关闭运行实例。

店铺权限和设备校验 → 内核目录及资源安装 → 本机代理和插件会话 → 固定扩展 ID → 启动参数和指纹配置 → Chromium → 插件鉴权通信 → IP/UA 检查 → 店铺页面。关闭时回收代理、WebSocket 和窗口资源，撤销会话并保留浏览数据。

## 能力范围

| 项目 | 当前实现 |
| --- | --- |
| UA / UA-CH、平台、CPU、语言、时区 | 上游原生参数，启动前检查配置一致性 |
| Canvas、Audio、ClientRects、字体、WebGL 噪声 | 上游补丁及每店固定 seed |
| Canvas、字体测量、WebGL 噪声开关 | 共用开关，前后端拒绝冲突配置 |
| WebRTC 隐私 | 禁止非代理 UDP |
| WebRTC 禁用 | 网络策略加扩展限制网页 PeerConnection 接口，非原生完全禁用 |
| SpeechVoices 隐私 | 扩展隐藏网页语音列表 |
| 访问范围 | 扩展 session DNR 规则覆盖主框架，与动态规则分别管理 |
| 窗口尺寸 | 控制窗口大小，不伪装网页读取的显示器尺寸 |
| Android、指定 WebRTC IP、自定义 GPU 字符串及字体列表 | 尚不支持，启动前明确拒绝 |

IP/UA 检查不能替代完整指纹验收。Canvas、Audio、字体、WebGL 及 Worker/iframe 场景的跨重启稳定性仍需专项实测。尚未完成干净 Windows 虚拟机验收，也未自行编译当前 Chromium 版本。

已验证 Windows x64 的资源安装、鉴权下载、独立二进制启动、双插件加载、桌面握手、环境检查及关闭。真实平台业务与生产发布范围见 [功能与部署状态](../docs/功能与部署状态.md)。

上游来源：[公开补丁与发布](https://github.com/adryfish/fingerprint-chromium/tree/144.0.7559.132)。
