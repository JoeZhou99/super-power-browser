# Super Power Browser 核心迁移

按 `rux-core-rebuild` Skill 迁移的第一版工程，目标目录为 `D:\Joe\myself\super-power-browser`。Web、Electron、后端分别维护依赖和构建入口，尽量保留原前端的相对目录。

**已在 Windows x64 / 137 内核上接通新项目的店铺启动主流程。** 桌面自动生成店铺专属插件配置、启动通信和代理、加载两个新插件；检测完成后打开店铺。账号、Cookie、书签和通行密钥使用新后端。原来的 `10008` 启动阻塞已排除。支付商户、设备供应商及完整业务验收仍需独立联调。

```text
super-power-browser/
├─ super-power-browser-web/        Vue 管理页面
├─ super-power-browser-desktop/    Electron 本地客户端
├─ super-power-browser-server/     Java API、core、Worker
├─ super-power-browser-plugins/    店铺助手、账号助手及运行适配
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

`runtime.config.json`、`.env` 不应提交版本库。`corePath` 可指向已授权安装内核的只读位置；`dataPath` 必须是新项目专用目录，不能指向旧店铺目录。本机预览运行根目录的 `./start-preview.ps1`，随后在新客户端点击店铺的“打开”；无需手动安装插件。具体目录和通信流程见 [插件接入说明](super-power-browser-plugins/docs/integration.md)。

## 旧接口与待接入边界

仅 `LegacyRuntimeAdapter` 调用旧内核凭据和内核清单接口，代码标有 `TODO(runtime-replacement)`。插件采用可构建移植工程，在新模式下对接 `/extension` 新后端和本机通信服务。Windows 消息管道传输实现适配自原项目；插件业务主体仍是恢复的编译后 JavaScript。旧店铺、设备、成员、支付和充值接口不作为新后端的替代实现。

旧运行资源兼容配置可从已授权源项目读取：

```powershell
# 在后端目录执行，仅提取源码中的接口域名及协议加密常量，不读取已登录账号令牌：
powershell -ExecutionPolicy Bypass -File scripts/configure-legacy.ps1
```

需要填写旧账号令牌时，由管理员通过 `LEGACY_TOKEN` 配置。新支付实现 `PaymentGateway`，新设备供应实现 `DeviceSupplier`，以 `@Primary` 注册正式适配器。接入要求、已验证范围和后续工作见 [迁移状态](docs/迁移状态.md)；后端职责见 [后端架构](docs/后端架构.md)。
