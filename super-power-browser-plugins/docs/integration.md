# 新项目插件接入

桌面已接通店铺启动主流程，不需要手动加载扩展。业务界面沿用恢复的旧助手，配置、通信和业务数据使用新项目。

## 启动

本机预览：在项目根目录运行 `./start-preview.ps1`，登录新客户端，在店铺管理点击“打开”。修改代码后先构建 Web，再到 `super-power-browser-desktop` 执行 `npm run build`；桌面构建会自动构建插件并复制 ZIP。后端修改后重新构建、重启 API，Flyway 自动应用 V9。

桌面的 `runtime.config.json` 指定 `apiUrl`、`corePath`、`dataPath`。远程 API 必须使用 HTTPS。内核仍需有效的运行资源凭据；预览私有配置位于已忽略提交的 `.local-preview`。

## 打开流程

1. 网页通过 Electron preload 调用 `openBrowser(environmentId)`。
2. 桌面获取 `/api/environments/{id}/launch-config`，校验店铺权限、设备和内核凭据。
3. `POST /api/environments/{id}/extension-sessions` 签发仅用于当前店铺的插件令牌，绑定桌面登录。
4. 启动本机 HTTP 代理、加密 WebSocket 和 Windows 消息管道。WebSocket 校验扩展来源、店铺、时间、签名和连接重放。
5. 将两份插件部署到每店 `RBP`，计算扩展 ID，写入各自 `config.dat`、`init.json`，合并 Chromium 扩展偏好。
6. 原生库写入店铺根目录的内核配置并启动内核。助手打开 `contentPage/check.html?mallId={id}`。
7. 插件校验 `/extension/capabilities`，读取新后台数据、同步账号及 Cookie，连接桌面并设置代理。
8. 页面完成 IP/UA 检测，桌面收到完成事件后才将状态设为 `running`，按打开方式进入店铺网址。
9. 关闭时释放代理、WebSocket 和管道，撤销插件会话、清除临时启动密钥，保留浏览数据。登录或店铺权限失效后，后台拒绝请求，桌面关闭对应实例。

## 目录

| 内容 | 位置 |
|---|---|
| 插件源码和适配 | `super-power-browser-plugins/src`、`runtime`、`scripts` |
| 桌面安装资源 | `super-power-browser-desktop/Plugin/*.zip` |
| 每店插件 | `{dataPath}/UserFile/{id}/RBP/RXMallHelper`、`RXAccountManage` |
| 每店插件配置 | 上述两个目录各自的 `config.dat`、`init.json` |
| 内核配置 | `{dataPath}/UserFile/{id}/init.json` |
| 本机预览数据 | `.local-preview/client/UserFile/{id}` |
| 退出诊断 | 店铺目录的 `runtime-diagnostics.json`，不记录令牌和 Cookie |

插件运行在店铺内核中，不运行在管理页面的 iframe 中。工具栏已固定两个助手入口。

## 后台与通信

兼容接口见 `api-contract.json`，统一入口 `/extension/api/v1/...`。响应保持 `{errorCode:0,data:...}`，错误返回对应 HTTP 状态和非零 errorCode。支持旧 `encryption:1` 传输格式；数据库使用 APP_DATA_KEY 的 AES-GCM 加密，协议常量不是存储密钥。

V9 新增 `extension_session` 和 `extension_document`。会话绑定店铺、用户和父登录，过期时间不超过父登录。每个请求重新校验成员状态、店铺授权和设备可用性，插件令牌不能用于管理后台。文档按店铺、集合和记录隔离，支持账号、Cookie、书签、通行密钥、打开方式、规则和报告存储。新构建保持 UUID 为字符串，修复旧 Number/parseInt 转换。

桌面 HTTP 代理转发到该店铺已配置的设备，新模式 PAC 使用 `PROXY`，本机 API 和桌面通信直连。每个实例使用独立代理端口、扩展路径、启动密钥和会话。

配置文件采用 AES-256-CBC + HMAC-SHA256，兼容旧解码格式。Cookie、心跳、检测完成通过 WebSocket；检测页 Ping 通过扩展消息转发到同一通道。Windows 原生管道处理内核生命周期消息，传输实现适配自原项目。

## 已实现与外部依赖

已接通启动、检测页、代理配置、桌面心跳/Ping、账号同步和 CRUD、Cookie 同步、书签、通行密钥存取、打开方式及关闭清理。具体实机结果见 `validation.md`。

第三方插件目录没有配置时为空，未知插件返回不存在；未配置供应商备用线路时，切换返回明确错误。完整浏览器缓存上传尚无对象存储实现，返回不支持，Cookie 可独立同步。白名单申请保存为待处理，不伪造审批结果。广告、汇率和外部平台目录未接数据源时为空。

顶部“线路优化检测成功”和自有设备的 IP 判断沿用旧助手逻辑，不能视为完整线路测速。实机额外验证的 Ping 是本机到代理端口的 TCP 延时。支付商户、设备供应商、真实平台登录及真实通行密钥注册仍需独立验收。
