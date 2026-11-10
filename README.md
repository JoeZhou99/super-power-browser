# SuperPower Browser

SuperPower Browser 提供店铺浏览器管理、设备管理、代理管理、成员权限和 AI 工作区。Web、Electron、后端分别维护依赖和构建入口。

**使用开源 Chromium 144.0.7559.132，已在 Windows x64 验证店铺启动、插件通信和环境检测。** 内核运行资源由后端发布，当前使用上游预编译包。来源、启动方式和限制见 [独立内核说明](super-power-browser-kernel/README.md)。账号、Cookie、书签和通行密钥由后端管理，完整业务验收仍需继续。

```text
super-power-browser/
├─ super-power-browser-web/        Vue 管理页面
├─ super-power-browser-desktop/    Electron 本地客户端
├─ super-power-browser-ai/         SuperPower AI 引擎、工具、审批和 SQLite 会话
├─ super-power-browser-server/     Java API、core、Worker
├─ super-power-browser-plugins/    店铺助手、账号助手及运行适配
├─ super-power-browser-kernel/     开源内核版本锁定、校验与发布
└─ docs/                          架构、使用说明与部署状态
```

已接入新后端的页面：首页与新手引导、账户悬浮菜单、账号安全；店铺、平台设备、代理管理及各自回收站；购买／续费／加速；人民币余额充值与订单；成员、角色与双层授权；精简设置中心。店铺、设备、代理、订单支持 Excel 导出，密码不导出。店铺支持 Excel 模板导入，单次最多 200 条；代理支持单条添加和批量文本添加，单次最多 500 条。原自有设备统一展示在代理管理，ID 和店铺绑定保持不变，详见 [代理管理说明](docs/代理管理.md)。正式发布前仍需完成全部业务场景验收，范围见 [功能与部署状态](docs/功能与部署状态.md)。

自助注册可直接创建独立企业并登录。企业管理支持部门、三类角色、邀请申请与审核，以及停用、删除成员和资源移交，详见 [企业与成员管理](docs/企业与成员管理.md)。

同级 `super-power-browser-admin` 提供独立运营后台，可维护时区、语言、窗口尺寸、环境默认值及平台站点；客户端通过接口读取，详见 [运营配置后台](docs/运营配置后台.md)。

旧版近期修复与核心流程的逐项核对见 [2026-11-10 增量迁移](docs/旧版增量迁移-2026-11-10.md)，包含诊断导出、定时开店连接、手工店铺保护与桌面防休眠。

## 启动后端

生产目标使用 JDK 21、MySQL 8.4 和 Maven 3.9。当前机器只有 JDK 17，因此本次构建和测试使用了 `-Djava.version=17`；默认 POM 仍是 21，JDK 21 与 MySQL 实例尚需部署前验证。Redis 保留在选型依赖中，本版登录会话和后台任务直接使用数据库，不依赖 Redis 在线才能启动。

先由管理员建立本项目专用数据库及数据库账号。在 `super-power-browser-server` 中复制 `.env.example` 为 `.env` 并填写配置，随后执行：

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

SuperPower AI 提供聊天、店铺任务、工具执行、技能和本地 SQLite 会话。模型配置、官方模型网关、套餐和技能商店由 `super-power-browser-server/ai` 提供，使用项目统一的登录、权限和订单服务。安装与配置见 [AI 使用说明](docs/AI使用说明.md)。首次构建桌面前，在 `super-power-browser-ai` 执行 `npm ci --ignore-scripts`。

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

店铺与代理检测统一通过独立打包的本地 Xray 转发，支持账号认证、高级协议、中转和已配置的备用线路切换。构建会准备并校验代理运行组件；迁移范围、测试和平台限制见 [代理与 Xray 迁移](docs/代理与Xray迁移.md)。

内核版本由数据库管理；生产安装包通过私有 S3 兼容对象存储分发，发布、停用、推荐和本地包导入使用运维 CLI。配置步骤与真实云服务尚待验证的边界见 [生产内核分发](super-power-browser-kernel/PRODUCTION.md)。

`runtime.config.json`、`.env` 不应提交版本库。`corePath` 是新项目可写的内核缓存，留空使用独立数据目录下的 `Core`；`dataPath` 必须为新项目专用目录。先按 [内核发布步骤](super-power-browser-kernel/README.md) 配置内核清单，再运行根目录的 `./start-preview.ps1`，选择已发布的 144 内核后打开店铺；无需手动安装插件。具体目录和通信流程见 [插件接入说明](super-power-browser-plugins/docs/integration.md)。

## 待接入能力

插件通过 `/extension` 后端接口和本机鉴权 WebSocket 工作。

第三方插件市场、完整浏览器缓存上传、供应商节点购买和动态住宅资源分配尚未接入。已有节点的备用线路切换与测速已接入；正式节点来源仍需设备供应服务实现 `DeviceSupplier`，支付服务实现 `PaymentGateway`，以 `@Primary` 注册正式适配器。生产 MySQL、模型上游、支付渠道和安装包发布仍需分别验收。后端职责见 [后端架构](docs/后端架构.md)。
