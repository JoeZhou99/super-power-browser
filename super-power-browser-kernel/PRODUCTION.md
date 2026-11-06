# 内核版本与生产分发

版本元数据保存在数据库 `kernel_release`，包括版本、完整构建号、系统/架构、SHA-256、文件大小、逐文件校验清单、对象 key、对象版本号和发布状态。生产使用 MySQL；当前本机预览仍使用 H2。ZIP 不存入数据库，存放在私有 S3 兼容 bucket，客户端取得短时效地址后直接下载。

Windows 和 Mac 的分平台资源准备见 [MACOS.md](MACOS.md)。发布同一版本的不同包时，使用 `--platform win32|darwin --arch x64|arm64` 明确选择目标。

当前支持 AWS S3 与 S3 兼容协议的服务端点，例如 MinIO。其他厂商需确认其 S3 API、条件 PUT、校验头和版本读取兼容性；没有把 OSS/COS 的原生 SDK 当作已适配。私有 S3 签名链接不能直接换成任意 CDN 域名，CDN 鉴权需另行适配。

## 服务端配置

配置项见 `super-power-browser-server/.env.example`。生产数据库仍由 `DB_URL/DB_USER/DB_PASSWORD` 配置，Flyway V11 自动建表。示例：

```dotenv
# 生产不从开发目录导入清单
KERNEL_MANIFEST_PATH=
KERNEL_LOCAL_ROOT=
# 平台发布人员的 app_user.id，逗号分隔；留空禁止发布管理
KERNEL_PUBLISHER_IDS=<publisher-user-uuid>
KERNEL_S3_BUCKET=<private-kernel-bucket>
# AWS 可留空；MinIO 等服务填写可供客户端访问的 HTTPS S3 地址
KERNEL_S3_ENDPOINT=https://storage.example.com
KERNEL_S3_REGION=us-east-1
KERNEL_S3_PREFIX=kernels
KERNEL_S3_PATH_STYLE=true
KERNEL_S3_ALLOW_HTTP=false
KERNEL_URL_MINUTES=15
```

发布人员必须同时是企业所有者且被服务器 UUID 白名单指定，普通租户所有者不会自动获得全平台发布权限。用户 UUID 可从其登录响应的 `user.id` 获取；不要把用户名当作 UUID。每次创建、发布、停用和转存都记录审计事件。

后端使用 AWS SDK 默认凭据链，优先通过部署工作负载角色授予存储权限。需要静态凭据时通过密钥管理注入 `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`，临时凭据还需 `AWS_SESSION_TOKEN`；这些值只进入服务端环境，不放入 Web、Electron、清单或 Git。签发者至少需要指定前缀的 `s3:PutObject`、`s3:GetObject`、`s3:GetObjectVersion` 权限，bucket 应保持私有。若使用额外的 KMS 加密，需相应密钥权限。

建议启用 bucket 版本控制。后端发布前 HEAD 检查大小，并读取实际对象计算 SHA-256；存在版本 ID 时将其固定到数据库，后续下载使用这一版本。上传路径包含摘要，条件 PUT 禁止覆盖已有对象。禁止配置会删除仍在用内核的生命周期规则。下载链接是有效期内可使用的凭据，不应写入业务日志；接口响应使用 `Cache-Control: no-store`。

## 发布流程

先用 `fetch-upstream.py` 获取已锁定资源，用 `publish-runtime.cjs` 生成校验清单和 ZIP。然后在有 Python 3.11+ 的运维电脑或 CI 使用 `scripts/release.py`，无需给该电脑配置对象存储访问密钥。

在进程环境中设置 `SPB_API_URL=https://api.example.com` 和 `SPB_RELEASE_TOKEN`。令牌来自被允许的发布账号正常登录，不在命令行参数或版本库中保存。运行：

```powershell
python super-power-browser-kernel/scripts/release.py list
python super-power-browser-kernel/scripts/release.py publish .local-preview/runtime/kernels.json --version 144 --recommended
```

工具会校验本地 ZIP → 创建草稿 → 获取签名上传地址 → 直接上传对象存储 → 请求后台读取并验证实际对象 → 发布。中断后可以重试；对象已存在时不会覆盖，仍需通过后台摘要校验。发布、签名接口必须通过 API 鉴权，企业普通账号访问返回 403。

状态为 `DRAFT`、`PUBLISHED`、`DISABLED`。客户端仅能列出和下载 `PUBLISHED` 版本。同一版本标识的二进制和配置清单不可变；要更换构建请采用新标识，例如 `144.0.7559.133`，不要覆盖原来的 `144`。主版本仍须属于项目已适配的范围。当前发布工具锁定的版本来自 `upstream.lock.json`，增加新构建须先复核源码、资源摘要和兼容性。

```powershell
# 停用不删除对象或本地 profile
python super-power-browser-kernel/scripts/release.py disable <release-id>
# 恢复发布 / 重新选择推荐版本，仍会检查存储中的包
python super-power-browser-kernel/scripts/release.py enable <release-id> --recommended
```

推荐状态在数据库锁内修改，每个系统/架构最多一个推荐版本。停用后不再签发新的下载地址；已发出的地址可能在原有效期内继续使用，已运行的店铺不会因此被强制关闭。已配置店铺不会自动切版本；涉及真实店铺时需要单独安排 浏览数据备份和指纹配置调整。

## 本地资源转存对象存储

开发环境的 `KERNEL_MANIFEST_PATH` 仅作为显式首次导入入口。API 从数据库读取版本；已有行不会被本地文件覆盖，也不会在重启时自动恢复被停用的版本。

部署了 S3 配置并配置发布账号后，先 `list` 找到 144 的 release ID，再执行：

```powershell
python super-power-browser-kernel/scripts/release.py migrate <release-id> .local-preview/runtime/kernel-144-win-x64.zip
```

转存先上传并验证对象，成功后在事务内切换数据库的存储位置，保留版本 ID、摘要、发布状态和推荐状态。失败时仍使用本地包。确认客户端从对象存储下载后可移除 `KERNEL_MANIFEST_PATH`；不要立即删除旧包，保留运维回滚所需资源。

## 客户端接口

1. `GET /api/runtime/kernels`：数据库中的已发布版本和不可变校验信息，不携带存储密钥或长期下载链接。
2. `GET /api/runtime/kernels/{version}/{platform}/{arch}/download`（Windows 兼容 `{version}/download`）：检查登录、开店权限和发布状态，返回本地归档接口或短时效对象存储 URL。
3. 客户端直接下载；外部请求不带应用 Bearer token。链接过期时重新取地址，继续 Range 下载，最后执行包及逐文件 SHA-256 校验。

后端升级后需同步部署支持 `downloadDescriptorPath` 的桌面客户端。生产客户端的 `apiUrl` 必须指向正式 HTTPS API，而非当前开发用的 `127.0.0.1:18080`；正式后端也不会自动从这台开发电脑读取 ZIP。

## 验证范围

数据库发布流程和并发推荐、权限拒绝、不可变版本、错误文件拒绝、签名上传下载、对象版本固定、本地转存保留停用状态均有自动测试。测试使用 H2 MySQL 模式和本地 S3 HTTP 协议夹具，不等于已验证真实云厂商。客户端已验证链接过期刷新、断点续传、跨域不携带登录令牌及下载资源身份不一致时拒绝。

真实生产 bucket、IAM/密钥、HTTPS 网络、MySQL 实例和目标供应商兼容性仍需部署环境配置与验收；当前未向任何真实云 bucket 上传，也没有新建付费云资源。

参考：[AWS SDK 预签名上传与下载](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3-presign.html)、[兼容端点配置](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/endpoint-config.html)。
