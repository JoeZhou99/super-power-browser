package com.superpower.browser.auth;

import java.util.Set;
import static com.superpower.browser.shared.BusinessException.require;

public record Actor(String id, String tenantId, String username, boolean owner, Set<String> permissions) {
    public void allow(String permission) { require(permissions.contains(permission),403,"没有该操作权限"); }
}
