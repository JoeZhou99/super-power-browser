# 插件功能与依赖

下表描述当前实现及所需接口。构建和资源检查不替代当前内核下的逐项业务验收。

| 功能 | 主要入口 | 实现与依赖 |
| --- | --- | --- |
| 店铺初始化与登录同步 | mall/background/service-worker.js | 使用店铺配置、用户接口和桌面通信 |
| 代理与公网出口检测 | mall/contentPage/contentPage.js | 所有设备均经店铺代理检测，失败可重试 |
| UA 环境检查 | mall/contentPage/contentPage.js | 比较配置与运行 UA，不等同于全面指纹扫描 |
| 线路延时及状态 | mall/contentPage/contentPage.js | TCP Ping 和实际出口检查；备用线路需供应商服务 |
| Cookie 导入、导出和同步 | mall/cookieTool、js/cookies.js | 需要浏览器权限、后台和桌面存储 |
| 店铺页面与多标签行为 | mall/contentPage、background/service-worker.js | 由店铺配置和检测完成事件决定 |
| 书签同步 | mall/background/service-worker.js | 按店铺存储并在初始化后维护目录 |
| 访问范围 | mall/visitRules、runtime/access-policy.mjs | 店铺域名规则；员工元素规则和审批流程尚需完善 |
| 页面元素与 URL 采集 | mall/content/element.js、content/Collection.js | 需要规则、采集和上报接口 |
| 账号验证和会话 | mall/background/service-worker.js | 使用当前后端授权，支持强制下线和令牌刷新 |
| 验证码辅助 | mall/content/twoStep.js | 需要验证码接口与已授权账号信息 |
| Passkey | mall/content/amazon_*.js、background/service-worker.js | 使用 WebAuthn 虚拟认证器，真实平台仍需单独验收 |
| 平台自动登录 | mall/content/platform/siteLoginAutomation.js | 由店铺、账号及站点规则控制 |
| 翻译辅助 | mall/content/translate.js | 页面处理脚本，翻译能力依赖浏览器和网络服务 |
| 内置插件安装和更新 | 桌面 PluginService | 桌面发布两个内置助手；第三方市场尚未接通 |
| 账号管理及自动填充 | account/popup.*.js、static/background/index.js | 账号 CRUD、授权、站点树及填充规则 |
| 自定义站点和页面增强 | account/auto-fill.*.js、page-enhance.*.js | 依赖内容脚本、后台规则和站点接口 |

插件构建提供配置校验、HMAC 启动验证、失败状态页、固定扩展 ID、备份回滚及资源检查。完整浏览数据云同步、供应商备用线路、第三方插件市场、员工元素规则和白名单审批尚未完整接通。
