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
        createUser(userId,tenantId,username,hash,name,owner,defaultDepartment(tenantId));
    }
    void createUser(String userId, String tenantId, String username, String hash, String name, boolean owner, String departmentId) {
        db.execute("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name,owner,department_id) VALUES(?,?,?,?,?,?,?)", userId, tenantId, username, hash, name, owner,departmentId);
    }
    Optional<Map<String,Object>> loginUser(String username) {
        return rows(db.select("SELECT * FROM app_user WHERE username=? AND enabled=TRUE AND deleted=FALSE", username)).stream().findFirst();
    }
    Optional<Map<String,Object>> sessionUser(String hash) {
        return rows(db.select("SELECT u.* FROM auth_session s JOIN app_user u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.enabled=TRUE AND u.deleted=FALSE", hash)).stream().findFirst();
    }
    void createSession(String hash, String userId, Instant expiry, String client, String address) { db.execute("INSERT INTO auth_session(id,token_hash,user_id,expires_at,client_name,remote_address) VALUES(?,?,?,?,?,?)", id(),hash,userId,Timestamp.from(expiry),client,address); }
    Map<String,Object> profile(String userId) {
        return one(db.select("SELECT u.id,u.username,u.display_name,u.owner,u.tenant_id,u.department_id,d.name AS department_name,u.created_at,t.name AS company_name FROM app_user u JOIN tenant t ON t.id=u.tenant_id LEFT JOIN department d ON d.id=u.department_id WHERE u.id=? AND u.deleted=FALSE",userId));
    }
    long memberCount(String tenantId) { return number(one(db.select("SELECT COUNT(*) AS total FROM app_user WHERE tenant_id=? AND enabled=TRUE AND deleted=FALSE",tenantId)),"total"); }
    List<String> roleNames(String userId) { return rows(db.select("SELECT r.name FROM member_role m JOIN role r ON r.id=m.role_id JOIN app_user u ON u.id=m.user_id AND u.department_id=r.department_id WHERE m.user_id=? AND r.enabled=TRUE ORDER BY r.name",userId)).stream().map(r->text(r,"name")).toList(); }
    Map<String,Object> lockUser(String userId) { return one(db.select("SELECT * FROM app_user WHERE id=? FOR UPDATE",userId)); }
    void profile(String userId,String name,String username) { db.execute("UPDATE app_user SET display_name=?,username=? WHERE id=?",name,username,userId); }
    void company(String tenantId,String name) { db.execute("UPDATE tenant SET name=? WHERE id=?",name,tenantId); }
    List<Map<String,Object>> sessions(String userId,String currentHash) {
        return rows(db.select("SELECT id,created_at,expires_at,client_name,remote_address,(token_hash=?) AS current_session FROM auth_session WHERE user_id=? AND expires_at>CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 100",currentHash,userId));
    }
    int revokeSession(String userId,String sessionId) { return db.execute("DELETE FROM auth_session WHERE user_id=? AND id=?",userId,sessionId); }
    void deleteSession(String hash) { db.execute("DELETE FROM auth_session WHERE token_hash=?", hash); }
    void deleteUserSessions(String userId) { db.execute("DELETE FROM auth_session WHERE user_id=?", userId); db.execute("DELETE FROM extension_session WHERE user_id=?",userId); }
    Set<String> permissions(String tenantId, String userId) {
        var result = new HashSet<String>();
        rows(db.select("SELECT DISTINCT p.permission FROM member_role m JOIN role r ON m.role_id=r.id JOIN app_user u ON u.id=m.user_id AND u.department_id=r.department_id JOIN role_permission p ON p.role_id=r.id WHERE m.user_id=? AND u.deleted=FALSE AND r.enabled=TRUE AND r.tenant_id=?", userId, tenantId)).forEach(p -> result.add(text(p,"permission")));
        return Set.copyOf(result);
    }
    Map<String,Object> member(String tenantId, String userId) {
        var member=one(db.select("SELECT id,tenant_id,username,display_name,phone,owner,enabled,department_id FROM app_user WHERE id=? AND tenant_id=? AND deleted=FALSE", userId, tenantId));
        member.put("memberType",memberType(member)); return member;
    }
    Map<String,Object> activeUser(String userId) { return one(db.select("SELECT id,tenant_id,username,owner,department_id FROM app_user WHERE id=? AND enabled=TRUE AND deleted=FALSE",userId)); }
    int memberType(Map<String,Object> user) {
        if(flag(user,"owner")) return 3;
        return (int)number(one(db.select("SELECT COALESCE(MAX(r.member_type),1) AS member_type FROM member_role m JOIN role r ON r.id=m.role_id WHERE m.user_id=? AND r.tenant_id=? AND r.department_id=? AND r.enabled=TRUE",text(user,"id"),text(user,"tenantId"),text(user,"departmentId"))),"memberType");
    }
    List<Map<String,Object>> members(String tenantId) {
        var result = rows(db.select("SELECT u.id,u.tenant_id,u.username,u.display_name,u.phone,u.enabled,u.owner,u.department_id,d.name AS department_name,u.created_at FROM app_user u LEFT JOIN department d ON d.id=u.department_id WHERE u.tenant_id=? AND u.deleted=FALSE ORDER BY u.created_at", tenantId));
        var assignments = rows(db.select("SELECT m.user_id,m.role_id FROM member_role m JOIN app_user u ON u.id=m.user_id WHERE u.tenant_id=?", tenantId));
        result.forEach(u -> { u.put("roles", assignments.stream().filter(r -> r.get("userId").equals(u.get("id"))).map(r -> r.get("roleId")).toList()); u.put("memberType",memberType(u)); });
        return result;
    }
    void updateMember(String tenantId, String userId, String name, boolean enabled) { db.execute("UPDATE app_user SET display_name=?,enabled=? WHERE id=? AND tenant_id=?", name, enabled, userId, tenantId); }
    void phone(String userId,String phone) { db.execute("UPDATE app_user SET phone=? WHERE id=?",phone,userId); }
    void memberDepartment(String userId,String departmentId) { db.execute("UPDATE app_user SET department_id=? WHERE id=?",departmentId,userId); }
    void password(String userId, String hash) { db.execute("UPDATE app_user SET password_hash=? WHERE id=?", hash, userId); deleteUserSessions(userId); }
    List<Map<String,Object>> roles(String tenantId) {
        var result = rows(db.select("SELECT r.* FROM role r JOIN department d ON d.id=r.department_id WHERE r.tenant_id=? AND d.deleted=FALSE ORDER BY r.department_id,r.builtin DESC,r.member_type DESC,r.name", tenantId));
        var permissions = rows(db.select("SELECT p.role_id,p.permission FROM role_permission p JOIN role r ON r.id=p.role_id WHERE r.tenant_id=?", tenantId));
        result.forEach(r -> r.put("permissions", permissions.stream().filter(p -> p.get("roleId").equals(r.get("id"))).map(p -> p.get("permission")).toList()));
        return result;
    }
    void requireRole(String tenantId, String roleId) { role(tenantId,roleId); }
    Map<String,Object> role(String tenantId,String roleId) { return one(db.select("SELECT r.* FROM role r JOIN department d ON d.id=r.department_id WHERE r.id=? AND r.tenant_id=? AND d.deleted=FALSE",roleId,tenantId)); }
    List<String> rolePermissions(String roleId) { return rows(db.select("SELECT permission FROM role_permission WHERE role_id=?", roleId)).stream().map(p -> text(p,"permission")).toList(); }
    void saveRole(String roleId, String tenantId, String name, boolean enabled, boolean create) {
        if (create) db.execute("INSERT INTO role(id,tenant_id,name,enabled) VALUES(?,?,?,?)", roleId, tenantId, name, enabled);
        else db.execute("UPDATE role SET name=?,enabled=? WHERE id=? AND tenant_id=?", name, enabled, roleId, tenantId);
    }
    void roleDetails(String roleId,String description,int memberType) { db.execute("UPDATE role SET description=?,member_type=? WHERE id=?",description,memberType,roleId); }
    void roleDepartment(String roleId,String departmentId,boolean builtin) { db.execute("UPDATE role SET department_id=?,builtin=? WHERE id=?",departmentId,builtin,roleId); }
    List<String> roleMembers(String roleId) { return rows(db.select("SELECT m.user_id FROM member_role m JOIN app_user u ON u.id=m.user_id WHERE m.role_id=? AND u.deleted=FALSE",roleId)).stream().map(r->text(r,"userId")).toList(); }
    List<String> memberRoles(String userId) { return rows(db.select("SELECT role_id FROM member_role WHERE user_id=?",userId)).stream().map(r->text(r,"roleId")).toList(); }
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

    // Serialize enterprise mutations so a concurrent role/member change cannot bypass the hierarchy checks.
    void lockTenant(String tenantId) { one(db.select("SELECT id FROM tenant WHERE id=? FOR UPDATE",tenantId)); }
    boolean usernameExists(String username) { return !db.select("SELECT id FROM app_user WHERE username=?",username).isEmpty(); }
    String defaultDepartment(String tenantId) { return text(one(db.select("SELECT id FROM department WHERE tenant_id=? AND is_default=TRUE AND deleted=FALSE",tenantId)),"id"); }
    Map<String,Object> department(String tenantId,String departmentId) { return one(db.select("SELECT * FROM department WHERE id=? AND tenant_id=? AND deleted=FALSE",departmentId,tenantId)); }
    List<Map<String,Object>> departments(String tenantId) {
        return rows(db.select("SELECT d.*, (SELECT COUNT(*) FROM app_user u WHERE u.department_id=d.id AND u.deleted=FALSE) AS member_count FROM department d WHERE d.tenant_id=? AND d.deleted=FALSE ORDER BY d.is_default DESC,d.created_at",tenantId));
    }
    boolean departmentNameExists(String tenantId,String name,String except) { return !db.select("SELECT id FROM department WHERE tenant_id=? AND name=? AND id<>? AND deleted=FALSE",tenantId,name,except).isEmpty(); }
    void createDepartment(String departmentId,String tenantId,String name,boolean isDefault) { db.execute("INSERT INTO department(id,tenant_id,name,is_default) VALUES(?,?,?,?)",departmentId,tenantId,name,isDefault); }
    void initializeDepartment(String departmentId,String tenantId,String name,boolean isDefault) {
        createDepartment(departmentId,tenantId,name,isDefault);
        String[] names={"普通成员","管理员","超级管理员"};
        for(int type=1;type<=3;type++) {
            String roleId=id();
            saveRole(roleId,tenantId,names[type-1],true,true);
            roleDetails(roleId,"部门预置角色",type);
            roleDepartment(roleId,departmentId,true);
            replacePermissions(roleId,new ArrayList<>(AuthService.defaultPermissions(type)));
        }
    }
    void renameDepartment(String departmentId,String name) { db.execute("UPDATE department SET name=? WHERE id=?",name,departmentId); }
    long departmentMembers(String departmentId) { return number(one(db.select("SELECT COUNT(*) AS total FROM app_user WHERE department_id=? AND deleted=FALSE",departmentId)),"total"); }
    long departmentPending(String departmentId) { return number(one(db.select("SELECT COUNT(*) AS total FROM member_application WHERE department_id=? AND status='PENDING'",departmentId)),"total"); }
    void deleteDepartment(String departmentId) {
        db.execute("UPDATE member_invitation SET revoked=TRUE WHERE department_id=?",departmentId);
        db.execute("UPDATE role SET enabled=FALSE WHERE department_id=?",departmentId);
        db.execute("UPDATE department SET deleted=TRUE WHERE id=?",departmentId);
    }
    String defaultRole(String departmentId) { return text(one(db.select("SELECT id FROM role WHERE department_id=? AND builtin=TRUE AND member_type=1",departmentId)),"id"); }
    Map<String,Object> departure(String tenantId,String userId) {
        return Map.of("environmentCount",number(one(db.select("SELECT COUNT(*) AS total FROM environment WHERE tenant_id=? AND owner_id=?",tenantId,userId)),"total"),"deviceCount",number(one(db.select("SELECT COUNT(*) AS total FROM device WHERE tenant_id=? AND created_by=?",tenantId,userId)),"total"));
    }
    Map<String,Object> lockDeparture(String tenantId,String userId) {
        return Map.of("environmentCount",db.select("SELECT id FROM environment WHERE tenant_id=? AND owner_id=? FOR UPDATE",tenantId,userId).size(),"deviceCount",db.select("SELECT id FROM device WHERE tenant_id=? AND created_by=? FOR UPDATE",tenantId,userId).size());
    }
    void deleteMember(String tenantId,String userId,String transferTo) {
        db.execute("UPDATE app_user SET enabled=FALSE,deleted=TRUE,deleted_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?",userId,tenantId);
        deleteUserSessions(userId);
        db.execute("DELETE FROM environment_grant WHERE user_id=?",userId);
        db.execute("DELETE FROM member_role WHERE user_id=?",userId);
        revokeUserInvitations(userId);
        // Renewal consent belongs to the departing user and must not silently transfer to another account.
        db.execute("UPDATE device SET auto_renew=FALSE,auto_renew_user_id=NULL WHERE tenant_id=? AND auto_renew_user_id=?",tenantId,userId);
        if(!transferTo.isEmpty()) {
            db.execute("UPDATE environment SET owner_id=? WHERE tenant_id=? AND owner_id=?",transferTo,tenantId,userId);
            db.execute("UPDATE device SET created_by=? WHERE tenant_id=? AND created_by=?",transferTo,tenantId,userId);
        }
    }
    List<Map<String,Object>> invitations(String tenantId) {
        return rows(db.select("SELECT i.*,d.name AS department_name FROM member_invitation i JOIN department d ON d.id=i.department_id WHERE i.tenant_id=? AND d.deleted=FALSE ORDER BY i.created_at DESC",tenantId));
    }
    Map<String,Object> invitation(String tenantId,String invitationId) { return one(db.select("SELECT * FROM member_invitation WHERE id=? AND tenant_id=?",invitationId,tenantId)); }
    Optional<String> invitationTenant(String token) { return rows(db.select("SELECT tenant_id FROM member_invitation WHERE token=?",token)).stream().map(r->text(r,"tenantId")).findFirst(); }
    Optional<Map<String,Object>> publicInvitation(String token) {
        return rows(db.select("SELECT i.*,d.name AS department_name,t.name AS company_name FROM member_invitation i JOIN department d ON d.id=i.department_id JOIN tenant t ON t.id=i.tenant_id JOIN app_user u ON u.id=i.created_by WHERE i.token=? AND i.revoked=FALSE AND i.expires_at>CURRENT_TIMESTAMP AND d.deleted=FALSE AND u.deleted=FALSE AND u.enabled=TRUE",token)).stream().findFirst();
    }
    void createInvitation(String invitationId,String tenantId,String departmentId,String token,String userId,Instant expires) {
        db.execute("INSERT INTO member_invitation(id,tenant_id,department_id,token,created_by,expires_at) VALUES(?,?,?,?,?,?)",invitationId,tenantId,departmentId,token,userId,Timestamp.from(expires));
    }
    void revokeInvitation(String invitationId) { db.execute("UPDATE member_invitation SET revoked=TRUE WHERE id=?",invitationId); }
    void revokeUserInvitations(String userId) { db.execute("UPDATE member_invitation SET revoked=TRUE WHERE created_by=?",userId); }
    boolean pendingUsername(String tenantId,String username) { return !db.select("SELECT id FROM member_application WHERE tenant_id=? AND username=? AND status='PENDING'",tenantId,username).isEmpty(); }
    void createApplication(String applicationId,Map<String,Object> invitation,String username,String name,String passwordHash,String phone) {
        db.execute("INSERT INTO member_application(id,tenant_id,department_id,invitation_id,username,display_name,password_hash,phone) VALUES(?,?,?,?,?,?,?,?)",applicationId,text(invitation,"tenantId"),text(invitation,"departmentId"),text(invitation,"id"),username,name,passwordHash,phone);
    }
    List<Map<String,Object>> applications(String tenantId,String status) {
        String filter=status.isEmpty()?"":" AND a.status=?";
        String sql="SELECT a.id,a.tenant_id,a.department_id,d.name AS department_name,a.invitation_id,a.username,a.display_name,a.phone,a.status,a.reason,a.reviewed_by,a.reviewed_at,a.user_id,a.created_at FROM member_application a JOIN department d ON d.id=a.department_id WHERE a.tenant_id=?"+filter+" ORDER BY a.created_at DESC";
        return rows(status.isEmpty()?db.select(sql,tenantId):db.select(sql,tenantId,status));
    }
    Map<String,Object> application(String tenantId,String applicationId) { return one(db.select("SELECT * FROM member_application WHERE id=? AND tenant_id=? FOR UPDATE",applicationId,tenantId)); }
    void reviewApplication(String applicationId,String status,String reason,String reviewer,String userId) {
        db.execute("UPDATE member_application SET status=?,reason=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,user_id=?,password_hash=NULL WHERE id=? AND status='PENDING'",status,reason,reviewer,userId,applicationId);
    }
}
