package com.superpower.browser.auth;

import com.superpower.browser.billing.WalletAccounts;
import com.superpower.browser.shared.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class AuthService implements MemberDirectory {
    public static final Set<String> PERMISSIONS = Set.of("ai.use","ai.purchase","shop.view","shop.create","shop.edit","shop.open","shop.delete","shop.export","shop.grant","device.view","device.edit","device.buy","device.renew","device.export","wallet.view","wallet.recharge","order.view","order.export","member.manage","role.manage");
    private final AuthRepository repository;
    private final AuditRepository audit;
    private final WalletAccounts wallets;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    public AuthService(AuthRepository repository, AuditRepository audit, WalletAccounts wallets) { this.repository=repository; this.audit=audit; this.wallets=wallets; }

    static Set<String> defaultPermissions(int type) {
        if(type==3) return PERMISSIONS;
        if(type==2) return Set.of("shop.view","shop.open","shop.create","shop.edit","shop.delete","shop.grant","device.view","device.edit","member.manage","role.manage");
        return Set.of("shop.view","shop.open","device.view");
    }

    @Transactional
    public Map<String,Object> register(Map<String,Object> request,String client,String address) {
        String username=username(request), name=displayName(request,username);
        require(!repository.usernameExists(username),409,"用户名已被使用");
        String passwordHash=encodePassword(text(request,"password")),tenantId=id(),userId=id();
        repository.createTenant(tenantId);
        repository.company(tenantId,name.substring(0,Math.min(name.length(),116))+"的团队");
        repository.initializeDepartment(tenantId,tenantId,"默认部门",true);
        repository.createUser(userId,tenantId,username,passwordHash,name,true,tenantId);
        wallets.open(tenantId);
        audit.record(authorizedUser(userId),"account.register",userId,Map.of());
        return newSession(userId,client,address);
    }
    @Transactional
    public Map<String,Object> login(Map<String,Object> request) { return login(request,"",""); }
    @Transactional
    public Map<String,Object> login(Map<String,Object> request,String client,String address) {
        String username=required(request,"username",80),password=text(request,"password");
        var user=repository.loginUser(username).orElseThrow(()->new BusinessException(401,"用户名或密码错误"));
        require(password.getBytes(StandardCharsets.UTF_8).length<=72 && encoder.matches(password,text(user,"passwordHash")),401,"用户名或密码错误");
        return newSession(text(user,"id"),client,address);
    }
    private Map<String,Object> newSession(String userId,String client,String address) {
        String token=randomToken(); Instant expires=Instant.now().plusSeconds(8*3600);
        repository.createSession(hash(token),userId,expires,client.substring(0,Math.min(client.length(),300)),address.substring(0,Math.min(address.length(),100)));
        return Map.of("token",token,"expiresAt",expires.toString(),"user",authenticate(token));
    }
    public Actor authenticate(String token) {
        return actor(repository.sessionUser(hash(token)).orElseThrow(()->new BusinessException(401,"登录已失效，请重新登录")));
    }
    private Actor actor(Map<String,Object> user) {
        boolean owner=flag(user,"owner");
        var permissions=owner?PERMISSIONS:repository.permissions(text(user,"tenantId"),text(user,"id"));
        return new Actor(text(user,"id"),text(user,"tenantId"),text(user,"username"),owner,permissions,repository.memberType(user),text(user,"departmentId"));
    }
    public void logout(String token) { repository.deleteSession(hash(token)); }
    public Map<String,Object> profile(Actor actor) {
        var result=repository.profile(actor.id());
        result.put("roles",actor.owner()?List.of("企业所有者"):repository.roleNames(actor.id()));
        result.put("memberType",actor.memberType());
        if(actor.owner()||actor.memberType()==3) result.put("memberCount",repository.memberCount(actor.tenantId()));
        else if(actor.memberType()==2) result.put("memberCount",repository.departmentMembers(actor.departmentId()));
        return result;
    }
    @Transactional
    public void updateProfile(Actor actor,Map<String,Object> request) {
        var user=repository.lockUser(actor.id());
        String username=required(request,"username",80),name=required(request,"displayName",120);
        if(!username.equals(text(user,"username"))) {
            username(request);
            verifyPassword(user,text(request,"currentPassword"));
            require(!repository.usernameExists(username),409,"用户名已被使用");
        }
        repository.profile(actor.id(),name,username);
        if(actor.owner()&&request.containsKey("companyName")) repository.company(actor.tenantId(),required(request,"companyName",120));
        audit.record(actor,"account.profile",actor.id(),Map.of());
    }
    private void verifyPassword(Map<String,Object> user,String password) {
        require(password.getBytes(StandardCharsets.UTF_8).length<=72&&encoder.matches(password,text(user,"passwordHash")),400,"当前密码不正确");
    }
    @Transactional
    public void changePassword(Actor actor,Map<String,Object> request) {
        var user=repository.lockUser(actor.id()); verifyPassword(user,text(request,"currentPassword"));
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
    /** Worker and extension requests re-read current membership and permissions. */
    public Actor authorizedUser(String userId) { return actor(repository.activeUser(userId)); }

    public List<Map<String,Object>> members(Actor actor) {
        require(actor.permissions().contains("member.manage")||actor.permissions().contains("shop.grant")||actor.permissions().contains("role.manage"),403,"没有成员查询权限");
        return repository.members(actor.tenantId()).stream().filter(m->visibleDepartment(actor,text(m,"departmentId"))&&(actor.owner()||actor.memberType()>=2||actor.id().equals(text(m,"id")))).toList();
    }
    @Override public void requireActive(String tenantId,String userId) { require(flag(repository.member(tenantId,userId),"enabled"),400,"成员已停用"); }
    @Override public List<Map<String,Object>> describe(String tenantId,List<String> userIds) { return userIds.stream().map(userId->repository.member(tenantId,userId)).toList(); }

    /** Every mutation rechecks the actor after taking the tenant lock, including hierarchy changes. */
    private Actor manager(Actor provided,String permission) {
        repository.lockTenant(provided.tenantId());
        Actor actor=authorizedUser(provided.id());
        require(actor.tenantId().equals(provided.tenantId()),403,"无权操作该企业");
        actor.allow(permission);
        require(actor.owner()||actor.memberType()>=2,403,"仅管理员可管理企业成员和角色");
        return actor;
    }
    private boolean visibleDepartment(Actor actor,String departmentId) { return actor.owner()||actor.memberType()==3||actor.departmentId().equals(departmentId); }
    private Map<String,Object> scopedDepartment(Actor actor,String departmentId) {
        var department=repository.department(actor.tenantId(),departmentId);
        require(visibleDepartment(actor,departmentId),403,"只能管理本部门"); return department;
    }
    private void lowerType(Actor actor,int type) {
        require(type>=1&&type<=3,400,"成员类型不合法");
        require(actor.owner()||actor.memberType()>type,403,"只能管理低于自己级别的成员和角色");
    }
    private Map<String,Object> managedMember(Actor actor,String memberId) {
        var member=repository.member(actor.tenantId(),memberId);
        require(!flag(member,"owner"),403,"不能修改企业所有者");
        require(!actor.id().equals(memberId),403,"不能修改自己的成员权限、状态或删除自己");
        scopedDepartment(actor,text(member,"departmentId")); lowerType(actor,(int)number(member,"memberType")); return member;
    }
    private void assignableRoles(Actor actor,String departmentId,List<String> roles) {
        require(!roles.isEmpty(),400,"请至少选择一个角色");
        for(String roleId:roles) {
            var role=repository.role(actor.tenantId(),roleId);
            require(departmentId.equals(text(role,"departmentId")),400,"成员只能绑定所属部门的角色");
            require(flag(role,"enabled"),400,"不能分配已停用的角色");
            lowerType(actor,(int)number(role,"memberType"));
            require(actor.permissions().containsAll(repository.rolePermissions(roleId)),403,"不能授予自身范围外的权限");
        }
    }
    @Transactional
    public String saveMember(Actor actor,String memberId,Map<String,Object> request) {
        actor=manager(actor,"member.manage");
        String displayName=required(request,"displayName",120);
        Map<String,Object> current=memberId==null?Map.of():managedMember(actor,memberId);
        String departmentId=request.containsKey("departmentId")?required(request,"departmentId",36):(memberId==null?actor.departmentId():text(current,"departmentId"));
        if(departmentId.isEmpty()) departmentId=repository.defaultDepartment(actor.tenantId());
        scopedDepartment(actor,departmentId);
        boolean changedDepartment=memberId!=null&&!departmentId.equals(text(current,"departmentId"));
        List<String> roles=request.containsKey("roleIds")?strings(request,"roleIds"):(memberId==null||changedDepartment?List.of(repository.defaultRole(departmentId)):null);
        boolean sameRoles=memberId!=null&&!changedDepartment&&roles!=null&&new HashSet<>(roles).equals(new HashSet<>(repository.memberRoles(memberId)));
        if(roles!=null&&!sameRoles) assignableRoles(actor,departmentId,roles);
        if(memberId==null) {
            String username=username(request); require(!repository.usernameExists(username),409,"用户名已被使用");
            memberId=id(); repository.createUser(memberId,actor.tenantId(),username,encodePassword(text(request,"password")),displayName,false,departmentId);
            if(request.containsKey("enabled")&&!flag(request,"enabled")) repository.updateMember(actor.tenantId(),memberId,displayName,false);
        } else {
            boolean enabled=request.containsKey("enabled")?flag(request,"enabled"):flag(current,"enabled");
            repository.updateMember(actor.tenantId(),memberId,displayName,enabled);
            if(!enabled||changedDepartment) { repository.deleteUserSessions(memberId); repository.revokeUserInvitations(memberId); }
            if(!text(request,"password").isEmpty()) repository.password(memberId,encodePassword(text(request,"password")));
            repository.memberDepartment(memberId,departmentId);
        }
        if(request.containsKey("phone")) repository.phone(memberId,phone(request));
        if(roles!=null) repository.replaceRoles(memberId,roles);
        audit.record(actor,"member.save",memberId,Map.of("displayName",displayName,"departmentId",departmentId)); return memberId;
    }
    public Map<String,Object> departure(Actor actor,String memberId) {
        actor.allow("member.manage"); require(actor.owner()||actor.memberType()>=2,403,"仅管理员可删除成员");
        managedMember(actor,memberId); return repository.departure(actor.tenantId(),memberId);
    }
    @Transactional
    public void deleteMember(Actor actor,String memberId,Map<String,Object> request) {
        actor=manager(actor,"member.manage"); managedMember(actor,memberId);
        require(!flag(repository.lockUser(memberId),"enabled"),409,"请先停用成员后再删除");
        var resources=repository.lockDeparture(actor.tenantId(),memberId); String transferTo=text(request,"transferTo").trim();
        boolean hasResources=number(resources,"environmentCount")>0||number(resources,"deviceCount")>0;
        require(!hasResources||!transferTo.isEmpty(),409,"该成员有店铺或设备，请选择接收成员后再删除");
        if(!transferTo.isEmpty()) {
            require(!transferTo.equals(memberId),400,"接收成员不能是待删除成员");
            var receiver=repository.member(actor.tenantId(),transferTo);
            require(flag(receiver,"enabled"),400,"接收成员必须处于启用状态");
            scopedDepartment(actor,text(receiver,"departmentId"));
        }
        repository.deleteMember(actor.tenantId(),memberId,transferTo);
        audit.record(actor,"member.delete",memberId,Map.of("transferTo",transferTo,"resources",resources));
    }

    public List<Map<String,Object>> roles(Actor actor) {
        require(actor.permissions().contains("role.manage")||actor.permissions().contains("member.manage"),403,"没有角色查询权限");
        return repository.roles(actor.tenantId()).stream().filter(r->visibleDepartment(actor,text(r,"departmentId"))).toList();
    }
    private Map<String,Object> managedRole(Actor actor,String roleId) {
        var role=repository.role(actor.tenantId(),roleId); scopedDepartment(actor,text(role,"departmentId")); lowerType(actor,(int)number(role,"memberType")); return role;
    }
    @Transactional
    public String saveRole(Actor actor,String roleId,Map<String,Object> request) {
        actor=manager(actor,"role.manage");
        var permissions=strings(request,"permissions");
        require(PERMISSIONS.containsAll(permissions),400,"包含不支持的功能权限");
        require(actor.permissions().containsAll(permissions),403,"不能授予自身范围外的权限");
        boolean create=roleId==null; var current=create?Map.<String,Object>of():managedRole(actor,roleId);
        String departmentId=request.containsKey("departmentId")?required(request,"departmentId",36):(create?actor.departmentId():text(current,"departmentId"));
        if(departmentId.isEmpty()) departmentId=repository.defaultDepartment(actor.tenantId());
        scopedDepartment(actor,departmentId);
        int type=request.containsKey("memberType")?(int)number(request,"memberType"):(create?1:(int)number(current,"memberType")); lowerType(actor,type);
        String description=text(request,"description"); require(description.length()<=200,400,"角色描述最多 200 字");
        if(!create) {
            require(departmentId.equals(text(current,"departmentId")),400,"角色不能跨部门移动，请在目标部门新建角色");
            require(!flag(current,"builtin")||type==(int)number(current,"memberType"),400,"预置角色的成员类型不可修改");
            for(String userId:repository.roleMembers(roleId)) managedMember(actor,userId);
        } else roleId=id();
        boolean enabled=request.containsKey("enabled")?flag(request,"enabled"):(create||flag(current,"enabled"));
        repository.saveRole(roleId,actor.tenantId(),required(request,"name",100),enabled,create);
        repository.roleDetails(roleId,description,type); repository.roleDepartment(roleId,departmentId,!create&&flag(current,"builtin"));
        repository.replacePermissions(roleId,permissions);
        audit.record(actor,"role.save",roleId,Map.of("permissions",permissions,"enabled",enabled,"departmentId",departmentId,"memberType",type)); return roleId;
    }
    @Transactional
    public void bindRoles(Actor actor,String memberId,List<String> roleIds) {
        actor=manager(actor,"role.manage"); var member=managedMember(actor,memberId);
        assignableRoles(actor,text(member,"departmentId"),roleIds); repository.replaceRoles(memberId,roleIds);
        audit.record(actor,"member.roles",memberId,Map.of("roles",roleIds));
    }
    @Transactional
    public void deleteRole(Actor actor,String roleId) {
        actor=manager(actor,"role.manage"); var role=managedRole(actor,roleId);
        require(!flag(role,"builtin"),400,"部门预置角色不能删除");
        require(repository.roleMembers(roleId).isEmpty(),409,"该角色仍绑定成员，请先调整成员角色");
        repository.deleteRole(roleId); audit.record(actor,"role.delete",roleId,Map.of());
    }
    @Transactional
    public void bindRoleMembers(Actor actor,String roleId,List<String> memberIds) {
        actor=manager(actor,"role.manage"); var role=managedRole(actor,roleId);
        assignableRoles(actor,text(role,"departmentId"),List.of(roleId));
        Set<String> next=new HashSet<>(memberIds); List<String> previous=repository.roleMembers(roleId);
        Set<String> affected=new HashSet<>(previous); affected.addAll(next);
        for(String memberId:affected) {
            var member=managedMember(actor,memberId);
            require(text(role,"departmentId").equals(text(member,"departmentId")),400,"成员只能绑定所属部门的角色");
            if(next.contains(memberId)) require(flag(member,"enabled"),400,"成员已停用");
            else require(repository.memberRoles(memberId).size()>1,409,"成员至少需要一个角色，请先分配其他角色");
        }
        repository.replaceRoleMembers(roleId,memberIds); audit.record(actor,"role.members",roleId,Map.of("members",memberIds));
    }

    public List<Map<String,Object>> departments(Actor actor) {
        require(actor.permissions().contains("member.manage")||actor.permissions().contains("role.manage")||actor.permissions().contains("shop.grant"),403,"没有部门查询权限");
        return repository.departments(actor.tenantId()).stream().filter(d->visibleDepartment(actor,text(d,"id"))).toList();
    }
    @Transactional
    public String saveDepartment(Actor actor,String departmentId,Map<String,Object> request) {
        actor=manager(actor,"member.manage"); require(actor.owner()||actor.memberType()==3,403,"仅企业所有者和超级管理员可管理部门");
        String name=required(request,"name",100);
        require(!repository.departmentNameExists(actor.tenantId(),name,departmentId==null?"":departmentId),409,"部门名称已存在");
        if(departmentId==null) { departmentId=id(); repository.initializeDepartment(departmentId,actor.tenantId(),name,false); }
        else { repository.department(actor.tenantId(),departmentId); repository.renameDepartment(departmentId,name); }
        audit.record(actor,"department.save",departmentId,Map.of("name",name)); return departmentId;
    }
    @Transactional
    public void deleteDepartment(Actor actor,String departmentId) {
        actor=manager(actor,"member.manage"); require(actor.owner()||actor.memberType()==3,403,"仅企业所有者和超级管理员可管理部门");
        var department=repository.department(actor.tenantId(),departmentId);
        require(!flag(department,"isDefault"),400,"默认部门不能删除");
        require(repository.departmentMembers(departmentId)==0,409,"部门下仍有成员，请先转移或删除成员");
        require(repository.departmentPending(departmentId)==0,409,"部门下仍有待审核申请，请先处理");
        repository.deleteDepartment(departmentId); audit.record(actor,"department.delete",departmentId,Map.of());
    }

    public List<Map<String,Object>> invitations(Actor actor) {
        actor.allow("member.manage"); require(actor.owner()||actor.memberType()>=2,403,"仅管理员可查看邀请");
        return repository.invitations(actor.tenantId()).stream().filter(i->visibleDepartment(actor,text(i,"departmentId"))).toList();
    }
    @Transactional
    public Map<String,Object> createInvitation(Actor actor,Map<String,Object> request) {
        actor=manager(actor,"member.manage"); String departmentId=required(request,"departmentId",36); scopedDepartment(actor,departmentId);
        String invitationId=id(),token=randomToken(); Instant expires=Instant.now().plusSeconds(7*24*3600);
        repository.createInvitation(invitationId,actor.tenantId(),departmentId,token,actor.id(),expires);
        audit.record(actor,"member.invitation.create",invitationId,Map.of("departmentId",departmentId));
        return Map.of("id",invitationId,"token",token,"expiresAt",expires.toString(),"departmentId",departmentId);
    }
    @Transactional
    public void revokeInvitation(Actor actor,String invitationId) {
        actor=manager(actor,"member.manage"); var invitation=repository.invitation(actor.tenantId(),invitationId); scopedDepartment(actor,text(invitation,"departmentId"));
        repository.revokeInvitation(invitationId); audit.record(actor,"member.invitation.revoke",invitationId,Map.of());
    }
    private Map<String,Object> validInvitation(String token) {
        require(token.length()>=32&&token.length()<=64,404,"邀请链接已失效，请联系管理员重新邀请");
        var invitation=repository.publicInvitation(token).orElseThrow(()->new BusinessException(404,"邀请链接已失效，请联系管理员重新邀请"));
        Actor creator=authorizedUser(text(invitation,"createdBy"));
        require((creator.owner()||creator.memberType()>=2)&&creator.permissions().contains("member.manage")&&visibleDepartment(creator,text(invitation,"departmentId")),404,"邀请链接已失效，请联系管理员重新邀请");
        return invitation;
    }
    public Map<String,Object> invitationInfo(String token) {
        var invitation=validInvitation(token);
        return Map.of("companyName",text(invitation,"companyName"),"departmentName",text(invitation,"departmentName"));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Map<String,Object> applyInvitation(String token,Map<String,Object> request) {
        // Resolve only the immutable tenant before locking; validate expiry/revocation and the inviter
        // afterwards. This avoids an earlier MyBatis cache / repeatable-read snapshot accepting a revoked link.
        require(token.length()>=32&&token.length()<=64,404,"邀请链接已失效，请联系管理员重新邀请");
        String targetTenant=repository.invitationTenant(token).orElseThrow(()->new BusinessException(404,"邀请链接已失效，请联系管理员重新邀请"));
        repository.lockTenant(targetTenant); var invitation=validInvitation(token);
        String username=username(request),name=displayName(request,username),phone=phone(request),tenantId=text(invitation,"tenantId");
        require(!repository.usernameExists(username),409,"用户名已被使用");
        require(!repository.pendingUsername(tenantId,username),409,"该用户名已有待审核申请，请等待管理员处理");
        String passwordHash=encodePassword(text(request,"password")),applicationId=id();
        repository.createApplication(applicationId,invitation,username,name,passwordHash,phone);
        return Map.of("id",applicationId,"status","PENDING");
    }
    public List<Map<String,Object>> applications(Actor actor,String status) {
        actor.allow("member.manage"); require(actor.owner()||actor.memberType()>=2,403,"仅管理员可审核成员");
        require(status.isEmpty()||Set.of("PENDING","APPROVED","REJECTED").contains(status),400,"申请状态不合法");
        return repository.applications(actor.tenantId(),status).stream().filter(a->visibleDepartment(actor,text(a,"departmentId"))).toList();
    }
    @Transactional
    public void reviewApplication(Actor actor,String applicationId,Map<String,Object> request) {
        actor=manager(actor,"member.manage"); var application=repository.application(actor.tenantId(),applicationId);
        String departmentId=text(application,"departmentId"); scopedDepartment(actor,departmentId);
        require("PENDING".equals(text(application,"status")),409,"该申请已处理，请刷新列表");
        require(request.get("approved") instanceof Boolean,400,"请明确选择通过或拒绝");
        String reason=text(request,"reason").trim(); require(reason.length()<=500,400,"审核说明最多 500 字");
        String userId=null;
        if(flag(request,"approved")) {
            List<String> roles=request.containsKey("roleIds")?strings(request,"roleIds"):List.of(repository.defaultRole(departmentId));
            assignableRoles(actor,departmentId,roles);
            require(!repository.usernameExists(text(application,"username")),409,"该用户名已被使用，请拒绝申请后让申请人更换用户名");
            userId=id(); repository.createUser(userId,actor.tenantId(),text(application,"username"),text(application,"passwordHash"),text(application,"displayName"),false,departmentId);
            repository.phone(userId,text(application,"phone")); repository.replaceRoles(userId,roles);
        }
        String status=flag(request,"approved")?"APPROVED":"REJECTED";
        repository.reviewApplication(applicationId,status,reason,actor.id(),userId);
        audit.record(actor,"member.application.review",applicationId,Map.of("status",status,"reason",reason));
    }

    private static String username(Map<String,Object> request) {
        String value=required(request,"username",80); require(value.length()>=3&&!value.chars().anyMatch(Character::isWhitespace),400,"用户名需为 3 至 80 个非空白字符"); return value;
    }
    private static String displayName(Map<String,Object> request,String fallback) { return text(request,"displayName").trim().isEmpty()?fallback:required(request,"displayName",120); }
    private static String phone(Map<String,Object> request) { String value=text(request,"phone").trim(); require(value.length()<=40,400,"联系电话最多 40 字"); return value; }
    static String encodePassword(String password) {
        require(password.length()>=12&&password.getBytes(StandardCharsets.UTF_8).length<=72,400,"密码至少 12 位且 UTF-8 编码不超过 72 字节"); return new BCryptPasswordEncoder().encode(password);
    }
    private static String randomToken() { byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
