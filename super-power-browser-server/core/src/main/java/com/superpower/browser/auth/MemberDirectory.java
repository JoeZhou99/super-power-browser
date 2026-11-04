package com.superpower.browser.auth;

import java.util.List;
import java.util.Map;

/** 仅暴露跨域需要的成员查询，不暴露角色修改或会话实现。 */
public interface MemberDirectory {
    void requireActive(String tenantId, String userId);
    List<Map<String,Object>> describe(String tenantId, List<String> userIds);
}
