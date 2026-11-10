package com.superpower.browser.auth;

import java.util.Set;
import static com.superpower.browser.shared.BusinessException.require;

public record Actor(String id, String tenantId, String username, boolean owner, Set<String> permissions, int memberType, String departmentId) {
    /** Existing internal callers retain ordinary-member scope unless explicitly supplied a department role. */
    public Actor(String id, String tenantId, String username, boolean owner, Set<String> permissions) {
        this(id, tenantId, username, owner, permissions, owner ? 3 : 1, "");
    }
    public void allow(String permission) { require(permissions.contains(permission),403,"没有该操作权限"); }
}
