# SuperPower AI 使用说明

SuperPower AI 是 SuperPower Browser 的 AI 工作区，提供聊天、附件、技能、店铺任务、执行审批、本地定时任务、模型管理及用量查询。

## 组成

- `super-power-browser-web/src/ai`：AI 工作区页面。
- `super-power-browser-ai`：本机执行引擎、工具、审批、技能及会话存储。
- `super-power-browser-desktop/src/main/services/AiHost.js`：桌面通信、账号及店铺权限校验。
- `super-power-browser-server/ai`：模型配置、官方模型网关、套餐、额度及技能商店，通过现有 API 服务部署。

## 数据与权限

会话和消息保存在桌面数据目录的 `ai/conversations.sqlite`，按登录用户 UUID 隔离。账号设置和本地任务位于 `ai/accounts/<企业UUID>/<用户UUID>`，技能和生成文件位于用户选择的工作区。支持会话备份导出、导入和存储目录转移。

AI 使用权限为 `ai.use`，套餐购买权限为 `ai.purchase`。店铺执行使用当前账号已获授权的浏览器连接；退出登录、切换账号或撤销权限时会停止相关执行。模型凭据由服务端加密保存，官方上游密钥不下发页面。

消息通道配置和任务、结果的云端管理不启用。

## 安装和启动

1. `super-power-browser-ai`：`npm ci --ignore-scripts`。
2. `super-power-browser-web`：`npm ci`，`npm run build`。
3. `super-power-browser-desktop`：`npm ci`，`npm run build`。桌面构建包含 AI 和插件构建，并装入 Web 资源。
4. `super-power-browser-server`：`mvn package`。本机 JDK 17 使用 `mvn '-Djava.version=17' package`。生产目标仍为 JDK 21 / MySQL 8.4。
5. 沿用根目录 `start-preview.ps1` 或既有正式启动方式。AI 不需要独立前端端口；客户端页面通过本机页面服务嵌入。

备份现有业务数据库和 APP_DATA_KEY 后再部署数据库更新。SQLite 与账号任务目录须一并备份；会话数据库运行期间应使用页面导出或 SQLite 在线备份，不单独复制可能未合并 WAL 的文件。

## 官方模型与技能商店运营

环境配置：

```dotenv
AI_PUBLIC_URL=https://your-api.example.com
AI_SKILL_STORAGE=/var/lib/superpower/ai-skills
AI_PUBLISHER_IDS=<运营用户UUID，多个用逗号分隔>
```

本机预览由启动脚本设置 `AI_PUBLIC_URL=http://127.0.0.1:18080`，技能包放在 `.local-preview/ai-skills`。生产 URL 必须能被客户端访问，并支持长时间 SSE 转发。账号、加密密钥和数据库连接沿用现有配置。

运营接口统一位于 `/api/ai/admin`，必须使用 `AI_PUBLISHER_IDS` 中账号的现有登录 Bearer token：

| 接口 | 内容 |
| --- | --- |
| `PUT /models` | `id,name,description,upstreamModel,baseUrl,apiKey,protocol,enabled,sortOrder`；协议 `chat` / `responses` |
| `PUT /plans` | `id,name,price,displayPrice,discount,tokenLimit,durationMonths,trialDays,enabled,unlimited`；金额单位分，额度单位 token |
| `DELETE /plans/{id}` | 停售套餐，已发放权益仍有效 |
| `POST /coupons` | `userId,name,amountCents,minimumCents,expiresAt`，可选 `planId`；有效期 ISO UTC |
| `GET /skills` | 待审核技能分页列表 |
| `POST /skills/{id}/review` | `approved` 布尔值、`reason` 审核说明 |

可用 `super-power-browser-server/scripts/ai-admin.mjs` 调用以上接口。套餐发布后如已有订单，价格和额度快照禁止修改，应建立新套餐并停用旧套餐。试用每个用户只能领取一次；续费从同套餐现有权益结束时起算。限量套餐额度覆盖整个套餐有效期，不做周期重置；`unlimited=true` 表示不限量套餐，仍记录实际调用量。页面按实际套餐显示额度和试用时长。优惠券在创建订单时占用，支付成功核销，过期取消释放；客户端报价不能改变实际扣款。

上游地址、密钥、价格及营销活动由运营配置。模型套餐支持支付宝和微信支付。支付复用现有 `PaymentGateway`；未安装正式支付适配器时扫码渠道不可用，不允许提交支付订单。没有真实支付或模型供应商配置时，不能把本地测试视为线上服务已接通。

公共技能提交需要审核；私有技能可以生成口令，其他账号凭口令绑定后安装。ZIP 拒绝越界路径、重复文件和过大解压内容；下载票据短期有效，用户注销后立即失效。分享撤销阻止新的口令兑换；已经下载到工作区的文件不会远程删除。
