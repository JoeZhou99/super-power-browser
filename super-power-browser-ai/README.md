# SuperPower AI 本地运行服务

为 SuperPower Browser 提供模型调用、工具执行、审批、并发队列、技能、本机定时任务和 SQLite 会话存储。AI 页面位于 Web 项目的 `src/ai`；桌面通过 `AiHost` 启动运行服务并校验账号与店铺权限。

```powershell
npm ci --ignore-scripts
npm run build
```

桌面项目的 `npm run build` 会自动构建本服务，运行时使用桌面的 Electron。服务随客户端启动，无需单独窗口或前端端口。

会话保存于桌面数据目录的 `ai/conversations.sqlite`，按登录用户 UUID 分区。账号设置、任务和技能开关位于 `ai/accounts/<tenant>/<user>`。工作区的 `.agents/skills` 保存已安装技能。

桌面适配层校验请求来源、登录账号、`ai.use` 权限及店铺授权。退出登录或切换账号时停止任务并释放连接。

安装、配置和运营方式见 [AI 使用说明](../docs/AI使用说明.md)。
