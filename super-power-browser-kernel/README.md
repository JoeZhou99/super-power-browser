# 独立 Chromium 144

版本分发已升级为数据库目录管理与可选私有 S3 存储，生产配置、发布工具和现有本地包的迁移步骤见 [生产分发说明](PRODUCTION.md)。本地清单只作首次导入入口，不再作为 API 每次查询的数据源。

2026-11-04：新项目使用 `adryfish/fingerprint-chromium` 发布的 Windows x64 `144.0.7559.132`，不使用站斧二进制、helper DLL、旧客户端或旧授权服务。当前使用上游预编译包，没有自行编译 Chromium。

旧站斧当前 Windows 清单包含 126、130、137、140、144、150，默认推荐 137。依据为已登录旧客户端对应的 `chromium_list_v5` 响应，以及旧 Web 的最低客户端版本、UID 和推荐版本筛选代码；未完成“修改内核”页面点击核对。146 是 137 的 UA 选项。新项目先发布其中有公开补丁源码的 144，其他版本不显示为可用内核。

## 固定来源与发布

[upstream.lock.json](upstream.lock.json) 固定下载地址、源码提交、源码包和二进制 SHA-256。源码提交为 `831623f2965e34554304caabfc3a1e4e3741db1f`。源码包是上游构建仓库与补丁集，完整 Chromium 源码还需按其构建流程获取；保留 Chromium 和上游许可证、第三方声明。

在项目根目录执行（Python 3.11+、Node，桌面依赖已安装）：

```powershell
python super-power-browser-kernel/scripts/fetch-upstream.py .local-preview/upstream
# 需要网络代理时追加 --proxy http://127.0.0.1:7897
node super-power-browser-kernel/scripts/publish-runtime.cjs .local-preview/upstream/fingerprint-chromium-144-win-x64.zip .local-preview/runtime
```

开发后端配置 `KERNEL_MANIFEST_PATH` 为生成的 `kernels.json` 绝对路径，本机 `start-preview.ps1` 自动设置，启动时导入数据库中尚不存在的版本。生产使用发布工具将 ZIP 上传私有 S3 并发布数据库记录。发布脚本生成逐文件 SHA-256；客户端从鉴权 API 获取下载信息，支持续传、并发安装锁、损坏修复、解压路径检查和原子发布。内核包与源代码包不提交 Git。

`corePath` 默认是新客户端数据目录的 `Core`，必须可写。店铺使用 `{dataPath}/UserFile/independent/{shopId}/{version}`，不复用旧原生内核的 profile。每店身份文件绑定 seed、配置协议和二进制摘要，更新构建不能静默覆盖已有指纹身份。旧记录不会自动改版本，需在店铺环境配置中主动选择已发布版本。

## 启动链路

2026-11-05：启动期间可点击“取消打开”。取消一家店铺不会中止另一家正在共享的内核下载；全部取消时停止传输并保留断点，重新打开可续传。退出客户端会取消待启动任务并关闭已启动店铺。窗口闪烁与提示音使用自有 Windows 实现并遵循消息开关；注销、退出、重启和单店关闭分别处理。任务栏颜色及编号配置已移除。新建或改版本须选择已发布版本，现有旧版本店铺不会自动改写。

店铺权限与设备检查 → 自有内核清单 → 本地校验/下载 → 每店代理与插件会话 → 固定公钥的插件 ID → 启动配置与原生指纹参数 → Chromium → 两个插件校验后台能力并连接鉴权 WebSocket → IP/UA 环境检查 → 店铺页面。关闭撤销会话并回收代理、WebSocket、图标句柄，保留 profile。

桌面只打包自己的 Electron、标准 Windows 窗口 API 和插件；历史 `ipcserver`、`zhanfubrowser`、helper 加载器与 `win/x64` DLL 不进入运行产物。历史导入脚本仅用于对照，不是独立启动入口。后端已移除旧凭据接口。

## 能力与差异

| 项目 | 当前实现 |
| --- | --- |
| UA / UA-CH、平台、CPU、语言、时区 | 上游原生参数；启动前校验配置一致性 |
| Canvas、Audio、ClientRects、字体、WebGL 噪声 | 上游原生补丁；同店固定 seed；不保证与旧内核算法相同 |
| Canvas、字体测量、WebGL 噪声开关 | 上游共用开关，界面同步切换，服务端和桌面拒绝冲突配置 |
| WebRTC 隐私 | Chromium 禁止非代理 UDP |
| WebRTC 禁用 | 上述策略加扩展限制网页 PeerConnection 接口；不是原生完全禁用 |
| SpeechVoices 隐私 | 扩展隐藏网页语音列表，不模拟旧版语音数组 |
| 访问范围 | 扩展 session DNR 规则，含主框架；与旧助手 dynamic rules 分离 |
| 窗口大小 | 设置窗口尺寸，不伪装网页读取的显示器尺寸 |
| Android、指定 WebRTC IP、自定义 GPU 字符串/字体列表 | 不支持，启动前明确拒绝 |
| 第三方插件市场、完整缓存云同步、备用线路 | 仍需相应服务实现；内置两个插件支持自动加载和更新 |

不能将 IP/UA 检测通过等同于所有原生指纹等价。Canvas、Audio、字体、WebGL、Worker/iframe 场景的跨重启稳定性与差异，仍需在可连接的浏览器中专门实测。未在完全没有旧安装的干净 Windows 虚拟机验收，也未自行编译此版本。

## 本次验证

- Web 类型检查和构建、桌面构建、Java 17 后端 clean package 通过；插件资源检查无缺失。
- 资源安装并发去重、损坏修复、Range 被忽略时安全重下、错误续传位置拒绝、坏校验与 ZIP 路径越界拒绝通过。
- 后端内核清单只发布 144，无旧授权；鉴权下载与 HTTP 206 通过，未登录下载返回 401。
- “SPB 插件链路联调”改为 144：独立二进制启动、窗口显示、双插件启用、重复打开去重、WebSocket 握手、GetNetworkInfo 与 CheckCompleted、正常关闭通过。
- “真实亚马逊店铺”记录仍存在且未回收，没有更改版本、绑定设备或 profile。

上游：[公开补丁与发布](https://github.com/adryfish/fingerprint-chromium/tree/144.0.7559.132)。标准 Google Chrome 安装包及 [Chrome for Testing](https://developer.chrome.com/docs/automation-and-testing/chrome-for-testing) 不包含旧站斧原生接口或这些指纹补丁；它们不能直接替换旧授权协议。
