# SuperPower Browser 插件接入

桌面负责插件构建、安装和店铺启动。插件通过当前项目的配置、通信和业务接口工作，无需手动加载扩展。

## 启动

本机预览：在项目根目录运行 `./start-preview.ps1`，登录客户端，在店铺管理点击“打开”。修改代码后先构建 Web，再到 `super-power-browser-desktop` 执行 `npm run build`；桌面构建会自动构建插件并复制 ZIP。后端修改后重新构建、重启 API，Flyway 自动应用尚未执行的数据库版本脚本。

桌面的 `runtime.config.json` 指定 `apiUrl`、`corePath`、`dataPath`。远程 API 必须使用 HTTPS。当前使用 Chromium 144，由后端发布运行资源；见 [内核说明](../../super-power-browser-kernel/README.md)。

## 打开流程

1. 网页通过 Electron preload 调用 `openBrowser(environmentId)`。
2. 桌面获取 `/api/environments/{id}/launch-config`，校验店铺权限、设备和内核配置，从 `/api/runtime/kernels` 获取版本及资源摘要，按需安装。
3. `POST /api/environments/{id}/extension-sessions` 签发仅用于当前店铺的插件令牌，绑定桌面登录。
4. 启动本机 HTTP 代理和加密 WebSocket。WebSocket 校验扩展来源、店铺、时间、签名和连接重放。
5. 将两份插件部署到每店 `RBP`，从固定公钥计算扩展 ID，写入各自 `config.dat`、`init.json`，由 Chromium 维护安装状态，不伪造受保护首选项。
6. 桌面编译指纹配置，写入身份和配置记录，通过原生参数启动 Chromium。助手打开 `contentPage/check.html?mallId={id}`。
7. 插件校验 `/extension/capabilities`，读取后台数据、同步账号及 Cookie，连接桌面并设置代理。
8. 插件连接并开始环境检测后，桌面将浏览器状态设为 `running`；检测成功另由 `CheckCompleted` 确认，助手按打开方式进入店铺网址。浏览器正在运行不等于网络检查成功。
9. 关闭时释放代理、WebSocket 和图标句柄，撤销插件会话、清除临时启动密钥，保留浏览数据。登录或店铺权限失效后，后台拒绝请求，桌面关闭对应实例。

## 目录

| 内容 | 位置 |
|---|---|
| 插件源码和适配 | `super-power-browser-plugins/src`、`runtime`、`scripts` |
| 桌面安装资源 | `super-power-browser-desktop/Plugin/*.zip` |
| 每店插件 | `{dataPath}/UserFile/independent/{id}/{version}/RBP/RXMallHelper`、`RXAccountManage` |
| 每店插件配置 | 上述两个目录各自的 `config.dat`、`init.json` |
| 内核配置 | 店铺版本目录内 `startup-config.json`、`spb-identity.json` |
| 本机预览数据 | `.local-preview/client/UserFile/independent/{id}/{version}` |
| 退出诊断 | 店铺目录的 `runtime-diagnostics.json`，不记录令牌和 Cookie |

插件运行在店铺内核中，不运行在管理页面的 iframe 中。工具栏已固定两个助手入口。

## 后台与通信

兼容接口见 `api-contract.json`，统一入口 `/extension/api/v1/...`。响应保持 `{errorCode:0,data:...}`，错误返回对应 HTTP 状态和非零 errorCode。支持 `encryption:1` 传输格式；数据库使用 APP_DATA_KEY 的 AES-GCM 加密，协议常量不是存储密钥。

数据库包含 `extension_session` 和 `extension_document`。会话绑定店铺、用户和父登录，过期时间不超过父登录。每个请求重新校验成员状态、店铺授权和设备可用性，插件令牌不能用于管理后台。文档按店铺、集合和记录隔离，支持账号、Cookie、书签、通行密钥、打开方式、规则和报告存储。UUID 在页面、桌面及后端之间始终使用字符串。

桌面 HTTP 代理转发到该店铺已配置的设备，PAC 使用 `PROXY`，本机 API 和桌面通信直连。每个实例使用独立代理端口、扩展路径、启动密钥和会话。

插件配置采用 AES-256-CBC + HMAC-SHA256。Cookie、心跳、检测完成通过 WebSocket；检测页 Ping 通过扩展消息转发到同一通道。内核生命周期由桌面进程和浏览器调试接口管理。

## 已实现与外部依赖

已接通启动、检测页、代理配置、桌面心跳/Ping、账号同步和 CRUD、Cookie 同步、书签、通行密钥存取、打开方式及关闭清理。具体实机结果见 `validation.md`。

第三方插件目录没有配置时为空，未知插件返回不存在；未配置供应商备用线路时，切换返回明确错误。完整浏览器缓存上传尚无对象存储实现，返回不支持，Cookie 可独立同步。白名单申请保存为待处理，不伪造审批结果。广告、汇率和外部平台目录未接数据源时为空。

顶部线路状态与实际公网出口检查联动；IP 检查不等同于完整线路测速。Ping 展示本机到代理端口的 TCP 延时。支付商户、设备供应商、真实平台登录及真实通行密钥注册仍需独立验收。
