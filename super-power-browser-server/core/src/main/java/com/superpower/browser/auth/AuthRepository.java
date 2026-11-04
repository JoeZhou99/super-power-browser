package com.superpower.browser.auth;

import com.superpower.browser.shared.Db;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
class AuthRepository {
    private final Db db;
    AuthRepository(Db db) { this.db = db; }
    boolean hasUsers() { return !db.select("SELECT id FROM app_user LIMIT 1").isEmpty(); }
    void createTenant(String tenantId) { db.execute("INSERT INTO tenant(id,name) VALUES(?,?)", tenantId, "默认企业"); }
    void createUser(String userId, String tenantId, String username, String hash, String name, boolean owner) {
        db.execute("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name,owner) VALUES(?,?,?,?,?,?)", userId, tenantId, username, hash, name, owner);
    }
    Optional<Map<String,Object>> loginUser(String username) {
        return rows(db.select("SELECT * FROM app_user WHERE username=? AND enabled=TRUE", username)).stream().findFirst();
    }
    Optional<Map<String,Object>> sessionUser(String hash) {
        return rows(db.select("SELECT u.* FROM auth_session s JOIN app_user u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.enabled=TRUE", hash)).stream().findFirst();
    }
    void createSession(String hash, String userId, Instant expiry, String client, String address) { db.execute("INSERT INTO auth_session(id,token_hash,user_id,expires_at,client_name,remote_address) VALUES(?,?,?,?,?,?)", id(),hash,userId,Timestamp.from(expiry),client,address); }
    Map<String,Object> profile(String userId) {
        return one(db.select("SELECT u.id,u.username,u.display_name,u.owner,u.tenant_id,u.created_at,t.name AS company_name FROM app_user u JOIN tenant t ON t.id=u.tenant_id WHERE u.id=?",userId));
    }
    long memberCount(String tenantId) { return number(one(db.select("SELECT COUNT(*) AS total FROM app_user WHERE tenant_id=? AND enabled=TRUE",tenantId)),"total"); }
    List<String> roleNames(String userId) { return rows(db.select("SELECT r.name FROM member_role m JOIN role r ON r.id=m.role_id WHERE m.user_id=? AND r.enabled=TRUE ORDER BY r.name",userId)).stream().map(r->text(r,"name")).toList(); }
    Map<String,Object> lockUser(String userId) { return one(db.select("SELECT * FROM app_user WHERE id=? FOR UPDATE",userId)); }
    void profile(String userId,String name,String username) { db.execute("UPDATE app_user SET display_name=?,username=? WHERE id=?",name,username,userId); }
    void company(String tenantId,String name) { db.execute("UPDATE tenant SET name=? WHERE id=?",name,tenantId); }
    List<Map<String,Object>> sessions(String userId,String currentHash) {
        return rows(db.select("SELECT id,created_at,expires_at,client_name,remote_address,(token_hash=?) AS current_session FROM auth_session WHERE user_id=? AND expires_at>CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 100",currentHash,userId));
    }
    int revokeSession(String userId,String sessionId) { return db.execute("DELETE FROM auth_session WHERE user_id=? AND id=?",userId,sessionId); }
    void deleteSession(String hash) { db.execute("DELETE FROM auth_session WHERE token_hash=?", hash); }
    void deleteUserSessions(String userId) { db.execute("DELETE FROM auth_session WHERE user_id=?", userId); }
    Set<String> permissions(String tenantId, String userId) {
        var result = new HashSet<String>();
        rows(db.select("SELECT DISTINCT p.permission FROM member_role m JOIN role r ON m.role_id=r.id JOIN role_permission p ON p.role_id=r.id WHERE m.user_id=? AND r.enabled=TRUE AND r.tenant_id=?", userId, tenantId)).forEach(p -> result.add(text(p,"permission")));
        return Set.copyOf(result);
    }
    Map<String,Object> member(String tenantId, String userId) { return one(db.select("SELECT id,username,display_name,owner,enabled FROM app_user WHERE id=? AND tenant_id=?", userId, tenantId)); }
    Map<String,Object> activeUser(String userId) { return one(db.select("SELECT id,tenant_id,username,owner FROM app_user WHERE id=? AND enabled=TRUE",userId)); }
    List<Map<String,Object>> members(String tenantId) {
        var result = rows(db.select("SELECT id,username,display_name,phone,enabled,owner,created_at FROM app_user WHERE tenant_id=? ORDER BY created_at", tenantId));
        var assignments = rows(db.select("SELECT m.user_id,m.role_id FROM member_role m JOIN app_user u ON u.id=m.user_id WHERE u.tenant_id=?", tenantId));
        result.forEach(u -> u.put("roles", assignments.stream().filter(r -> r.get("userId").equals(u.get("id"))).map(r -> r.get("roleId")).toList()));
        return result;
    }
    void updateMember(String tenantId, String userId, String name, boolean enabled) { db.execute("UPDATE app_user SET display_name=?,enabled=? WHERE id=? AND tenant_id=?", name, enabled, userId, tenantId); }
    void phone(String userId,String phone) { db.execute("UPDATE app_user SET phone=? WHERE id=?",phone,userId); }
    void password(String userId, String hash) { db.execute("UPDATE app_user SET password_hash=? WHERE id=?", hash, userId); deleteUserSessions(userId); }
    List<Map<String,Object>> roles(String tenantId) {
        var result = rows(db.select("SELECT * FROM role WHERE tenant_id=? ORDER BY name", tenantId));
        var permissions = rows(db.select("SELECT p.role_id,p.permission FROM role_permission p JOIN role r ON r.id=p.role_id WHERE r.tenant_id=?", tenantId));
        result.forEach(r -> r.put("permissions", permissions.stream().filter(p -> p.get("roleId").equals(r.get("id"))).map(p -> p.get("permission")).toList()));
        return result;
    }
    void requireRole(String tenantId, String roleId) { one(db.select("SELECT id FROM role WHERE id=? AND tenant_id=?", roleId, tenantId)); }
    List<String> rolePermissions(String roleId) { return rows(db.select("SELECT permission FROM role_permission WHERE role_id=?", roleId)).stream().map(p -> text(p,"permission")).toList(); }
    void saveRole(String roleId, String tenantId, String name, boolean enabled, boolean create) {
        if (create) db.execute("INSERT INTO role(id,tenant_id,name,enabled) VALUES(?,?,?,?)", roleId, tenantId, name, enabled);
        else db.execute("UPDATE role SET name=?,enabled=? WHERE id=? AND tenant_id=?", name, enabled, roleId, tenantId);
    }
    void roleDetails(String roleId,String description,int memberType) { db.execute("UPDATE role SET description=?,member_type=? WHERE id=?",description,memberType,roleId); }
    void deleteRole(String roleId) {
        db.execute("DELETE FROM member_role WHERE role_id=?",roleId);
        db.execute("DELETE FROM role_permission WHERE role_id=?",roleId);
        db.execute("DELETE FROM role WHERE id=?",roleId);
    }
    void replaceRoleMembers(String roleId,List<String> members) {
        db.execute("DELETE FROM member_role WHERE role_id=?",roleId);
        for(String userId:new HashSet<>(members))db.execute("INSERT INTO member_role(user_id,role_id) VALUES(?,?)",userId,roleId);
    }
    void replacePermissions(String roleId, List<String> permissions) {
        db.execute("DELETE FROM role_permission WHERE role_id=?", roleId);
        for (String permission : permissions) db.execute("INSERT INTO role_permission(role_id,permission) VALUES(?,?)", roleId, permission);
    }
    void replaceRoles(String userId, List<String> roles) {
        db.execute("DELETE FROM member_role WHERE user_id=?", userId);
        for (String role : new HashSet<>(roles)) db.execute("INSERT INTO member_role(user_id,role_id) VALUES(?,?)", userId, role);
    }
}
