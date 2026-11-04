# Super Power Browser 插件工程

当前交付是旧插件的可构建移植工程：恢复业务程序、拆出有语义的模块名，并重写构建、配置生成、启动校验和新服务地址适配。业务部分来自用户提供的编译后 JavaScript，**不是原始 Vue/TypeScript 源码，也不是已完成的全量独立重写**。

基线为用户指定目录中的 RXMallHelper 5.1.75 / RXAccountManage 1.0.12；实机比对后已更新到当前店铺使用的 RXMallHelper **5.1.78**。保留全部 84 个程序与资源文件，未复制任何真实店铺的 `config.dat`、`init.json`、Token、Cookie 或代理密码。逐文件来源和哈希见 [source-provenance.json](docs/source-provenance.json)。

## 当前可用范围

- 两个完整插件的可编辑业务程序、页面、样式及资源。
- 新项目构建与旧平台兼容构建，分别输出解压目录和 ZIP 安装包。
- 桌面侧启动配置生成、扩展 ID 计算、AES-CBC + HMAC 协议兼容、目录备份与回滚。
- 启动前校验：配置缺失、校验失败、内核接口缺失或新后台未就绪时显示明确原因，不执行原助手的代理重置。
- 已在「真实亚马逊店铺（勿删）」临时安装两个新插件，验证未配置时的阻断提示与代理保护；测试插件已卸载，原插件及代理保持不变。

**新项目的启动主链路已接通。** 同级桌面会自动构建和部署两份插件、生成独立启动配置、建立本机通信；同级服务端实现插件会话和兼容 API，账号、Cookie、书签、通行密钥存到新数据库。已用独立联调店铺完成 137 内核实机启动、检测页、桌面 Ping 和 Cookie 同步验证。第三方插件分发、完整浏览器缓存上传、供应商备用线路仍需相应服务支持，未声明旧版全部功能完成验收。见 [接入说明](docs/integration.md) 和 [验证记录](docs/validation.md)。

## 构建与检查

Node.js 20+，构建和发布资源检查不需要安装 npm 依赖。

```powershell
npm run build
npm run verify
node scripts/build.mjs --legacy
node scripts/verify.mjs dist/legacy
node scripts/catalog.mjs
```

默认产物在 `dist/superpower/`，旧平台兼容产物在 `dist/legacy/`。各目录内 `RXMallHelper/`、`RXAccountManage/` 为解压后的插件，`Plugin/*.zip` 对应桌面加载包。

定制新后台地址：

```powershell
node scripts/build.mjs --config examples/build.example.json
```

新项目构建不会使用旧平台的服务 URL；静态接口、认证、统计、推荐等旧服务地址都映射到配置的新服务。HTTP 只允许本机地址，远程服务必须为 HTTPS。旧平台兼容包明确保留原服务，供迁移对照使用。

## 为关闭状态的店铺准备插件

桌面启动时应从当前会话和店铺配置组织启动对象，再调用 `prepareProfile`。命令行方式主要供开发验证，配置中的示例值必须替换为当前环境的数据。

```powershell
node scripts/prepare-profile.mjs --distribution dist/superpower --profile D:\test-profiles\shop --bootstrap D:\private\bootstrap.json
```

`examples/bootstrap.example.json` 仅说明结构。已有插件目录默认拒绝覆盖；明确传入 `--replace` 后会保留带时间戳的原目录，并在安装失败时回滚。不要对正在运行的店铺直接执行替换。

配置中的加密格式用于兼容客户端协议和检测篡改；密钥与密文位于同一用户目录，不构成独立的凭据保险库。运行配置应由桌面按用户目录权限管理，不应提交到代码仓库或打进发布包。

## 目录

| 目录 | 内容 |
| --- | --- |
| `src/mall` | 店铺助手业务程序、检测页、Cookie 工具、访问规则、翻译、Passkey 等 |
| `src/account` | 账号助手后台、弹窗、账号 CRUD、自动填充、页面增强 |
| `runtime` | 新写的配置验证、后台能力检查、启动状态页面 |
| `lib` | 桌面配置编码、构建配置校验、ZIP 写入 |
| `scripts` | 构建、发布资源检查、配置准备、契约生成 |
| `docs` | 来源、功能清单、接入契约、验证记录 |

测试代码、实机验收脚本及截图报告已按要求清理，文档保留此前的验证结论。`npm run verify` 用于检查发布包的脚本语法及资源完整性。
