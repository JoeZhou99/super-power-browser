# 平台站点目录

创建店铺时，前端通过新版的 `GET /api/platform-sites` 获取分类、平台和站点地址。接口需要登录，并具备 `shop.view`、`shop.create` 或 `shop.edit` 权限之一；查询本项目的 `platform_site` 表，不调用旧站斧接口。

初始公共目录来自 2026-11-06 读取的旧版 `GET https://api.zhanfubrowser.com/api/v1/siteInfo/getSiteTreeByCategoriesV2` 响应，由 Flyway `V17__platform_site_catalog.sql` 自动入库。包含 6 个分类、131 个平台、323 个站点，不包含任何用户店铺、账号、密码或自定义平台数据。分类“全部”由前端合并展示。

清理规则：去掉重复的“全部”分类、修剪网址两端空白；沿用旧创建店铺界面对 `seller.tiktokglobalshop.com/account/login` 的过滤，排除 3 条旧 TikTok 入口；排除依赖旧版专用扩展的 Line 入口。其余地址保留响应中的值，未逐一登录验证，平台改版时可修改下方地址或更新目录。

创建店铺时，普通平台只选择平台和国家/站点，不显示地址输入。前端提交 `platformSiteId`，后端查询目录生成 `platform` 和 `startUrl`，并保存 `environment.platform_site_id`，同一 URL 的不同国家/站点也能正确回显。仅“自定义平台”显示名称和 HTTP / HTTPS 地址输入。

编辑既有店铺、切换普通分类、加载失败不会覆盖已有地址；旧数据和导入接口仍兼容平台名称与地址。未更换站点的编辑保留原始打开地址，即使目录地址已更新或停用；新建、复制和更换站点须选择有效目录项。目录本身不限制浏览器访问范围。

后续维护应新增数据库迁移，更新 `platform_site` 的名称、地址、排序或 `enabled` 标志；不要修改已执行的 V17。目录不自动同步旧站斧。Windows 和 macOS 使用同一接口和网页目录。
