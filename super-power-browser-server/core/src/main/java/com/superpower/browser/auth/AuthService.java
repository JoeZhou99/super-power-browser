package com.superpower.browser.auth;

import com.superpower.browser.shared.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class AuthService implements MemberDirectory {
    public static final Set<String> PERMISSIONS = Set.of("ai.use","ai.purchase","shop.view","shop.create","shop.edit","shop.open","shop.delete","shop.export","shop.grant","device.view","device.edit","device.buy","device.renew","device.export","wallet.view","wallet.recharge","order.view","order.export","member.manage","role.manage");
    private final AuthRepository repository;
    private final AuditRepository audit;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    public AuthService(AuthRepository repository, AuditRepository audit) { this.repository = repository; this.audit = audit; }

    @Transactional
    public Map<String,Object> login(Map<String,Object> request) {
        return login(request,"","");
    }
    @Transactional
    public Map<String,Object> login(Map<String,Object> request,String client,String address) {
        String username = required(request,"username",80);
        String password = text(request,"password");
        var user = repository.loginUser(username).orElseThrow(() -> new BusinessException(401,"用户名或密码错误"));
        require(password.getBytes(StandardCharsets.UTF_8).length <= 72 && encoder.matches(password, text(user,"passwordHash")), 401, "用户名或密码错误");
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = Instant.now().plusSeconds(8*3600);
        repository.createSession(hash(token), text(user,"id"), expires,client.substring(0,Math.min(client.length(),300)),address.substring(0,Math.min(address.length(),100)));
        return Map.of("token", token, "expiresAt", expires.toString(), "user", authenticate(token));
    }

    public Actor authenticate(String token) {
        var user = repository.sessionUser(hash(token)).orElseThrow(() -> new BusinessException(401,"登录已失效，请重新登录"));
        boolean owner = flag(user,"owner");
        var permissions = owner ? PERMISSIONS : repository.permissions(text(user,"tenantId"), text(user,"id"));
        return new Actor(text(user,"id"), text(user,"tenantId"), text(user,"username"), owner, permissions);
    }
    public void logout(String token) { repository.deleteSession(hash(token)); }
    public Map<String,Object> profile(Actor actor) {
        var result=repository.profile(actor.id());
        result.put("roles",actor.owner()?List.of("企业所有者"):repository.roleNames(actor.id()));
        if(actor.permissions().contains("member.manage")||actor.permissions().contains("role.manage"))result.put("memberCount",repository.memberCount(actor.tenantId()));
        return result;
    }
    @Transactional
    public void updateProfile(Actor actor,Map<String,Object> request) {
        var user=repository.lockUser(actor.id());
        String username=required(request,"username",80),name=required(request,"displayName",120);
        if(!username.equals(text(user,"username")))verifyPassword(user,text(request,"currentPassword"));
        repository.profile(actor.id(),name,username);
        if(actor.owner()&&request.containsKey("companyName"))repository.company(actor.tenantId(),required(request,"companyName",120));
        audit.record(actor,"account.profile",actor.id(),Map.of());
    }
    private void verifyPassword(Map<String,Object> user,String password) {
        require(password.getBytes(StandardCharsets.UTF_8).length<=72&&encoder.matches(password,text(user,"passwordHash")),400,"当前密码不正确");
    }
    @Transactional
    public void changePassword(Actor actor,Map<String,Object> request) {
        var user=repository.lockUser(actor.id());
        verifyPassword(user,text(request,"currentPassword"));
        String next=text(request,"newPassword");
        require(!next.equals(text(request,"currentPassword")),400,"新密码不能与当前密码相同");
        repository.password(actor.id(),encodePassword(next));
        audit.record(actor,"account.password",actor.id(),Map.of());
    }
    public List<Map<String,Object>> sessions(Actor actor,String token) { return repository.sessions(actor.id(),hash(token)); }
    @Transactional
    public void revokeSession(Actor actor,String sessionId) {
        require(repository.revokeSession(actor.id(),sessionId)==1,404,"登录会话不存在");
        audit.record(actor,"account.session.revoke",actor.id(),Map.of("sessionId",sessionId));
    }
    /** Worker 依据已保存的自动续费授权重新加载成员状态和权限。 */
    public Actor authorizedUser(String userId) {
        var user=repository.activeUser(userId);boolean owner=flag(user,"owner");
        return new Actor(userId,text(user,"tenantId"),text(user,"username"),owner,owner?PERMISSIONS:repository.permissions(text(user,"tenantId"),userId));
    }

    public List<Map<String,Object>> members(Actor actor) {
        require(actor.permissions().contains("member.manage") || actor.permissions().contains("shop.grant") || actor.permissions().contains("role.manage"),403,"没有成员查询权限");
        return repository.members(actor.tenantId());
    }
    @Override public void requireActive(String tenantId, String userId) { require(flag(repository.member(tenantId,userId),"enabled"),400,"成员已停用"); }
    @Override public List<Map<String,Object>> describe(String tenantId, List<String> userIds) {
        return userIds.stream().map(userId -> repository.member(tenantId,userId)).toList();
    }

    @Transactional
    public String saveMember(Actor actor, String memberId, Map<String,Object> request) {
        actor.allow("member.manage");
        String displayName = required(request,"displayName",120);
        if (memberId == null) {
            memberId = id();
            repository.createUser(memberId, actor.tenantId(), required(request,"username",80), encodePassword(text(request,"password")), displayName, false);
        } else {
            require(!flag(repository.member(actor.tenantId(), memberId),"owner"),400,"不能通过成员接口修改企业所有者");
            repository.updateMember(actor.tenantId(), memberId, displayName, flag(request,"enabled"));
            if (!text(request,"password").isEmpty()) repository.password(memberId, encodePassword(text(request,"password")));
        }
        if(request.containsKey("phone")) {
            require(text(request,"phone").length()<=40,400,"联系电话最多 40 字");
            repository.phone(memberId,text(request,"phone"));
        }
        audit.record(actor,"member.save",memberId,Map.of("displayName",displayName));
        return memberId;
    }

    public List<Map<String,Object>> roles(Actor actor) {
        require(actor.permissions().contains("role.manage") || actor.permissions().contains("member.manage"),403,"没有角色查询权限");
        return repository.roles(actor.tenantId());
    }
    @Transactional
    public String saveRole(Actor actor, String roleId, Map<String,Object> request) {
        actor.allow("role.manage");
        var permissions = strings(request,"permissions");
        require(actor.permissions().containsAll(permissions),403,"不能授予自身范围外的权限");
        boolean create = roleId == null;
        if (create) roleId = id(); else repository.requireRole(actor.tenantId(),roleId);
        repository.saveRole(roleId,actor.tenantId(),required(request,"name",100),flag(request,"enabled"),create);
        if(create||request.containsKey("description")||request.containsKey("memberType")) {
            String description=text(request,"description");
            int memberType=request.containsKey("memberType")?(int)number(request,"memberType"):1;
            require(description.length()<=200&&Set.of(1,2,3).contains(memberType),400,"角色描述或成员类型不合法");
            // 成员类型用于角色分类；有效权限仍仅来自勾选的功能权限，不隐式提权。
            repository.roleDetails(roleId,description,memberType);
        }
        repository.replacePermissions(roleId,permissions);
        audit.record(actor,"role.save",roleId,Map.of("permissions",permissions,"enabled",flag(request,"enabled")));
        return roleId;
    }
    @Transactional
    public void bindRoles(Actor actor, String memberId, List<String> roleIds) {
        actor.allow("role.manage");
        require(!flag(repository.member(actor.tenantId(),memberId),"owner"),400,"企业所有者无需绑定角色");
        for (String roleId : roleIds) {
            repository.requireRole(actor.tenantId(),roleId);
            require(actor.permissions().containsAll(repository.rolePermissions(roleId)),403,"不能授予自身范围外的角色");
        }
        repository.replaceRoles(memberId,roleIds);
        audit.record(actor,"member.roles",memberId,Map.of("roles",roleIds));
    }
    @Transactional
    public void deleteRole(Actor actor,String roleId) {
        actor.allow("role.manage"); repository.requireRole(actor.tenantId(),roleId);
        repository.deleteRole(roleId);
        audit.record(actor,"role.delete",roleId,Map.of());
    }
    @Transactional
    public void bindRoleMembers(Actor actor,String roleId,List<String> memberIds) {
        actor.allow("role.manage"); repository.requireRole(actor.tenantId(),roleId);
        require(actor.permissions().containsAll(repository.rolePermissions(roleId)),403,"不能授予自身范围外的角色");
        for(String memberId:memberIds) {
            var member=repository.member(actor.tenantId(),memberId);
            require(!flag(member,"owner"),400,"企业所有者无需绑定角色");
            require(flag(member,"enabled"),400,"成员已停用");
        }
        repository.replaceRoleMembers(roleId,memberIds);
        audit.record(actor,"role.members",roleId,Map.of("members",memberIds));
    }
    static String encodePassword(String password) {
        require(password.length()>=12 && password.getBytes(StandardCharsets.UTF_8).length<=72,400,"密码至少 12 位且 UTF-8 编码不超过 72 字节");
        return new BCryptPasswordEncoder().encode(password);
    }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
