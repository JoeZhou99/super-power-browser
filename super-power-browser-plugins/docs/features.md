# 旧插件功能覆盖与依赖

以下“已保留”指相关程序与资源完整纳入源码，并经过语法、依赖和打包检查；不等于已在新后端完成逐项业务验收。对应代码以 RXMallHelper 5.1.78、RXAccountManage 1.0.12 为准。

| 功能 | 主要入口 | 当前实现与必要依赖 |
| --- | --- | --- |
| 店铺初始化、语言、品牌、登录状态同步 | mall/background/service-worker.js | 已保留；需要当前店铺配置、用户接口和桌面通信 |
| 设备/IP 检测、动态 IP 警告 | mall/contentPage/contentPage.js、content/dynamicIpWarning.js | 已保留；静态/动态检测规则来自后台；新模式自有设备也必须通过真实公网出口检测；保留失败重试 |
| 环境检测 | mall/contentPage/contentPage.js | 已保留；主要校验 UA 与配置 UA，不能解释为全面安全扫描 |
| 线路延迟检测、节点切换、自动择优 | mall/contentPage/contentPage.js | 已保留当前 5.1.78 的节点指标和 VLESS 兼容逻辑；需要桌面 Ping / StartProxy 和后台线路接口 |
| 首页顶部线路状态 | mall/contentPage/contentPage.js | 新模式顶部结果与实际公网检测联动；当前代理 TCP Ping 可用，供应商备用线路没有服务时明确拒绝切换 |
| 代理 PAC、直连列表、翻译/CDN 分流 | mall/background/service-worker.js | 已保留；新模式禁止初始化阶段先设 DIRECT；正式 PAC 仍需代理和后台规则 |
| Cookie 导入、导出、格式转换、同步 | mall/cookieTool、js/cookies.js、background/service-worker.js | 已保留；本地 Cookie 工具与后台同步/桌面存储为不同依赖 |
| Cookie 持续更新与隐私模式 | mall/background/service-worker.js | 已保留；需要 UpdateMallCookie 与隐私启动参数 |
| 店铺打开、首页跳转、固定页、多标签行为 | mall/contentPage、background/service-worker.js | 已保留；依赖店铺详情和初始化完成事件 |
| 常用网站、时钟、汇率、推荐网站 | mall/contentPage、newtab | 已保留；数据接口及品牌资源需新后台接入 |
| 云书签同步、目录维护、推广书签 | mall/background/service-worker.js | 已接新后台，0.2.7 实测嵌套书签和其他书签恢复，并修复初始化覆盖新书签的竞争 |
| 防火墙、黑白名单、审核申请、网页限制 | mall/visitRules、warning、background/service-worker.js | 店铺域名黑白名单已接原生内核并实测；员工元素规则与审批工作流仍未完整接通 |
| 网页限制元素观察、员工访问控制 | mall/content/element.js、content/Collection.js | 已保留；需要页面规则和采集/上报接口 |
| 标签 URL 收集与批量上报 | mall/background/service-worker.js | 已保留；需要 domainUrl/batchSave 和定时任务 |
| 账号验证、强制下线、令牌刷新 | mall/background/service-worker.js | 已保留；需要会话、验证和刷新接口 |
| 二次验证码读取/填写 | mall/content/twoStep.js | 已保留；需要验证码接口及账号信息 |
| Amazon 登录拦截及 Passkey | mall/content/amazon_*.js、background/service-worker.js | 通过 chrome.debugger WebAuthn 虚拟认证器实现；本地响应夹具验证注册、保存、重开认证及本地 Passkey 开关，未提交真实平台登录 |
| 平台登录自动化 | mall/content/platform/siteLoginAutomation.js | 已保留；运行条件由店铺和账号配置控制 |
| TikTok / Tokopedia 翻译 | mall/content/translate.js | 实测解除页面翻译限制；脚本保护非翻译节点，实际翻译仍依赖浏览器与网络服务 |
| 插件安装、更新、移除 | mall/js/desktop-bridge.js | 两个内置助手部署与升级可用；第三方市场分发尚缺服务 |
| 网络修复、通知、右键菜单、客户端提醒 | mall/background/service-worker.js | 已保留；部分动作依赖桌面 IPC/音频/窗口能力 |
| 账号列表、新增、编辑、删除 | account/popup.*.js、static/background/index.js | 已保留；需要账号填充 CRUD 服务及授权 |
| 主账号/子账号选择与一键重新填充 | account/static/background/index.js | 已保留；需要指定店铺账号列表和扩展间消息 |
| 账号/密码选择器、目标锁定、表单规则 | account/popup.*.js、auto-fill.*.js | 已保留；需后台规则存储 |
| iframe 页面填充与页面增强 | account/auto-fill.*.js、page-enhance.*.js | 已保留；需要内容脚本与后台规则 |
| 自定义站点与站点树 | account/static/background/index.js | 已保留；需要站点新增、删除、分类接口 |

新增实现：独立构建、53 个命名接口契约、新服务 URL 配置、启动 HMAC 校验、安装前配置校验、失败状态页、扩展 ID 生成、备份与回滚、静态资源检查、实际内核中的临时安装/卸载验证。
