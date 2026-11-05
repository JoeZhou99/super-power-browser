# Super Power Browser 核心迁移

按 `rux-core-rebuild` Skill 迁移的第一版工程，目标目录为 `D:\Joe\myself\super-power-browser`。Web、Electron、后端分别维护依赖和构建入口，尽量保留原前端的相对目录。

**已切换到独立的开源 Chromium 144.0.7559.132，完成 Windows x64 联调店铺启动、插件通信和环境检测。** 运行资源由新后端发布，桌面不再使用旧站斧内核、DLL 或授权凭据。当前使用上游预编译包，原生指纹算法与旧版不同，详细来源、启动方式和限制见 [独立内核说明](super-power-browser-kernel/README.md)。账号、Cookie、书签和通行密钥使用新后端，完整业务验收仍需继续。

```text
super-power-browser/
├─ super-power-browser-web/        Vue 管理页面
├─ super-power-browser-desktop/    Electron 本地客户端
├─ super-power-browser-server/     Java API、core、Worker
├─ super-power-browser-plugins/    店铺助手、账号助手及运行适配
├─ super-power-browser-kernel/     开源内核版本锁定、校验与发布
└─ docs/                          架构、观察依据、验证与待办
```

已接入新后端的页面：首页与新手引导、账户悬浮菜单、账号安全；店铺与三类设备管理及回收站；购买／续费／加速；人民币余额充值与订单；成员、角色与双层授权；精简设置中心。店铺、设备、订单使用 Excel 导出，店铺／自有设备支持 Excel 模板导入，单次最多 200 条；密码不导出。保留页面按原版继续还原，尚未达到所有字段、功能与 UI 完全一致，差异见迁移状态。

## 启动后端

生产目标使用 JDK 21、MySQL 8.4 和 Maven 3.9。当前机器只有 JDK 17，因此本次构建和测试使用了 `-Djava.version=17`；默认 POM 仍是 21，JDK 21 与 MySQL 实例尚需部署前验证。Redis 保留在选型依赖中，本版登录会话和后台任务直接使用数据库，不依赖 Redis 在线才能启动。

先由管理员建立独立数据库及数据库账号，勿指向旧项目数据库。在 `super-power-browser-server` 中复制 `.env.example` 为 `.env` 并填写配置，随后执行：

```powershell
mvn package
# 当前机器仅有 JDK 17 时：mvn '-Djava.version=17' package
powershell -ExecutionPolicy Bypass -File scripts/start.ps1 -Process api
# 另一个终端运行：
powershell -ExecutionPolicy Bypass -File scripts/start.ps1 -Process worker
```

`ADMIN_PASSWORD` 首次启动至少 12 位，UTF-8 不超过 72 字节，不提供默认密码。`APP_DATA_KEY` 是 32 个随机字节的 Base64 编码，API 与 Worker 必须保持一致，妥善备份；丢失后不能解密代理和店铺密码。可用 PowerShell 生成后填入 `.env`：

```powershell
$dataKeyBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($dataKeyBytes)
[Convert]::ToBase64String($dataKeyBytes)
```

Flyway 管理表结构，金额使用整数分和 `CNY`。初始企业余额为 0。不要通过页面输入支付结果或直接改库模拟真实充值。

## 启动 Web 与桌面

Web 开发端口为 `3100`，默认代理新 API 的 `8080` 端口：

```powershell
cd super-power-browser-web
npm ci
npm run dev
# 生产资源：npm run build
```

桌面先运行 Web 的 `npm run build`，然后在桌面工程执行：

```powershell
npm ci
Copy-Item runtime.config.example.json runtime.config.json
# 按本机实际情况修改 apiUrl、corePath。默认 dataPath 为空即使用新客户端独立目录。
npm run dev
```

桌面构建会自动构建相邻插件工程并复制 ZIP，同时将 Web 的 `dist` 复制到 `resources/web`。客户端通过仅监听 `127.0.0.1` 的页面服务加载。Electron 锁定 `35.7.5`。

内核版本由数据库管理；生产安装包通过私有 S3 兼容对象存储分发，发布、停用、推荐和本地包迁移使用运维 CLI。配置步骤与真实云服务尚待验证的边界见 [生产内核分发](super-power-browser-kernel/PRODUCTION.md)。

`runtime.config.json`、`.env` 不应提交版本库。`corePath` 是新项目可写的内核缓存，留空使用独立数据目录下的 `Core`；`dataPath` 必须为新项目专用目录。先按 [内核发布步骤](super-power-browser-kernel/README.md) 配置内核清单，再运行根目录的 `./start-preview.ps1`，选择已发布的 144 内核后打开店铺；无需手动安装插件。具体目录和通信流程见 [插件接入说明](super-power-browser-plugins/docs/integration.md)。

## 旧接口与待接入边界

`LegacyRuntimeAdapter` 和旧凭据入口已移除，启动不读取 `LEGACY_TOKEN` 或旧运行配置。插件是可构建移植工程，业务主体仍来自恢复的 JavaScript，通过 `/extension` 新后端和本机鉴权 WebSocket 工作。历史兼容源码保留作对照，不进入独立桌面产物。

第三方插件市场、完整浏览器缓存上传、供应商备用线路未实现；原生指纹不能声称与旧版完全等价。新支付实现 `PaymentGateway`，新设备供应实现 `DeviceSupplier`，以 `@Primary` 注册正式适配器。此前功能验收属于旧 137 基线，不能自动作为新 144 的验证结论。后端职责见 [后端架构](docs/后端架构.md)。
