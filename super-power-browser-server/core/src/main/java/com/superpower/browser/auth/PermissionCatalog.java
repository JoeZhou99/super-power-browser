package com.superpower.browser.auth;

import java.util.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Shared menu metadata and the server-side boundary for assigning functional permissions. */
public final class PermissionCatalog {
    public record Permission(String code, String label, int minMemberType, List<String> dependencies) {}
    public record Group(String code, String label, String menuPath, List<Permission> children) {}

    private static Permission permission(String code, String label, int minMemberType, String... dependencies) {
        return new Permission(code, label, minMemberType, List.of(dependencies));
    }

    private static final List<Group> GROUPS = List.of(
        new Group("shop", "店铺管理", "/mall/mallManage", List.of(
            permission("shop.view", "查看店铺", 1),
            permission("shop.create", "创建店铺", 1, "shop.view"),
            permission("shop.edit", "编辑店铺", 1, "shop.view"),
            permission("shop.open", "打开店铺", 1, "shop.view"),
            permission("shop.delete", "删除、恢复店铺", 1, "shop.view"),
            permission("shop.export", "导出店铺", 2, "shop.view"),
            permission("shop.grant", "授权店铺", 2, "shop.view"))),
        new Group("device", "设备管理", "/agentIp/all", List.of(
            permission("device.view", "查看平台设备", 1),
            permission("device.edit", "管理平台设备", 2, "device.view"),
            permission("device.buy", "购买平台设备", 3, "device.view"),
            permission("device.renew", "续费平台设备", 3, "device.view"),
            permission("device.export", "导出平台设备", 2, "device.view"))),
        new Group("proxy", "代理管理", "/proxy/list", List.of(
            permission("proxy.view", "查看自有代理", 1),
            permission("proxy.edit", "添加、编辑、删除代理", 1, "proxy.view"),
            permission("proxy.export", "导出代理", 2, "proxy.view"))),
        new Group("ai", "SuperPower AI", "/zhifuAgent", List.of(
            permission("ai.use", "使用 AI", 1),
            permission("ai.purchase", "购买 AI 套餐", 3, "ai.use"))),
        new Group("wallet", "账户充值", "/money/recharge", List.of(
            permission("wallet.view", "查看账户余额", 3),
            permission("wallet.recharge", "账户充值", 3, "wallet.view"))),
        new Group("order", "订单管理", "/money/order", List.of(
            permission("order.view", "查看订单", 3),
            permission("order.export", "导出订单", 3, "order.view"))),
        new Group("member", "成员与授权", "/companyManage/membersMamanger", List.of(
            permission("member.manage", "管理部门、成员与审核", 2))),
        new Group("role", "角色与权限", "/companyManage/roles", List.of(
            permission("role.manage", "管理角色与权限", 2)))
    );
    private static final Map<String, Permission> NODES;
    static {
        var nodes = new LinkedHashMap<String, Permission>();
        GROUPS.forEach(group -> group.children().forEach(node -> nodes.put(node.code(), node)));
        NODES = Collections.unmodifiableMap(nodes);
    }

    private PermissionCatalog() {}

    public static Set<String> codes() { return NODES.keySet(); }

    /** A permission is assignable only when the operator also holds its prerequisites. */
    public static List<Group> assignableGroups(Set<String> operatorPermissions) {
        return GROUPS.stream().map(group -> new Group(group.code(), group.label(), group.menuPath(),
            group.children().stream().filter(node -> operatorPermissions.contains(node.code())
                && operatorPermissions.containsAll(dependenciesOf(node.code()))).toList()))
            .filter(group -> !group.children().isEmpty()).toList();
    }

    public static List<String> normalize(Collection<String> requested, int memberType, Set<String> operatorPermissions) {
        require(memberType >= 1 && memberType <= 3, 400, "成员类型不合法");
        require(!requested.isEmpty(), 400, "请至少选择一项功能权限");
        require(codes().containsAll(requested), 400, "包含不支持的功能权限");
        var selected = new LinkedHashSet<>(requested);
        requested.forEach(code -> selected.addAll(dependenciesOf(code)));
        require(selected.stream().allMatch(code -> NODES.get(code).minMemberType() <= memberType),
            400, "包含当前成员类型不可用的功能权限，请调整角色类型或权限");
        require(operatorPermissions.containsAll(selected), 403, "不能授予自身范围外的权限或依赖权限");
        // Stable menu order also deduplicates repeated request values before the unique-key insert.
        return NODES.keySet().stream().filter(selected::contains).toList();
    }

    private static Set<String> dependenciesOf(String code) {
        var result = new LinkedHashSet<String>();
        var pending = new ArrayDeque<>(NODES.get(code).dependencies());
        while (!pending.isEmpty()) {
            String dependency = pending.removeFirst();
            if (result.add(dependency)) pending.addAll(NODES.get(dependency).dependencies());
        }
        return result;
    }
}
