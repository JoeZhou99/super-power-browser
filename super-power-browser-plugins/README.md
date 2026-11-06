# SuperPower Browser 内置插件

包含环境助手和账号助手，提供店铺环境检查、代理配置、Cookie 与账号同步、书签、Passkey、访问规则和表单辅助。插件随桌面部署，在店铺浏览器中运行，通过本机通信和后端 API 工作。

## 构建与检查

Node.js 20+。构建和发布资源检查不需要安装 npm 依赖。

```powershell
npm run build
npm run verify
node scripts/catalog.mjs
```

产物位于 `dist/superpower/`。`RXMallHelper/` 和 `RXAccountManage/` 是展开的插件目录，`Plugin/*.zip` 是桌面安装资源。目录名属于桌面通信契约。

使用部署配置构建：

```powershell
node scripts/build.mjs --config examples/build.example.json
```

服务地址由构建配置和桌面启动配置提供。本机开发允许 HTTP，远程服务必须使用 HTTPS。配置缺失、校验失败或后台能力不足时，插件显示明确原因并停止初始化。

## 桌面接入

桌面构建自动生成插件 ZIP，启动店铺时写入当前账号、店铺、代理和通信配置，无需手动安装。命令行准备工具供开发和运维使用：

```powershell
node scripts/prepare-profile.mjs --distribution dist/superpower --profile D:\test-profiles\shop --bootstrap D:\private\bootstrap.json
```

示例配置必须替换为实际环境值。已有目录默认拒绝覆盖；`--replace` 会备份原目录并在安装失败时回滚。不要替换正在运行的店铺目录。

启动配置采用 AES-256-CBC 和 HMAC-SHA256。配置密钥与密文位于同一用户目录，由桌面和文件权限保护；不得提交到 Git 或打入发布包。

## 目录

| 目录 | 内容 |
| --- | --- |
| `src/mall` | 环境助手、检测页、Cookie 工具、访问规则、翻译和 Passkey |
| `src/account` | 账号助手后台、弹窗、账号管理和自动填充 |
| `runtime` | 启动验证、后台能力检查和状态页面 |
| `lib` | 配置编码、品牌资源、构建校验和 ZIP 工具 |
| `scripts` | 构建、资源检查、配置准备和接口契约生成 |
| `docs` | 功能、接入和验证范围说明 |

更多内容见 [接入说明](docs/integration.md)、[功能说明](docs/features.md) 和 [验证范围](docs/validation.md)。
