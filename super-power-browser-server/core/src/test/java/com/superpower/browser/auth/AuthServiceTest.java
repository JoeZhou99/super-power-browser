package com.superpower.browser.auth;

import com.superpower.browser.billing.WalletAccounts;
import com.superpower.browser.shared.*;
import com.zaxxer.hikari.HikariDataSource;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import static org.junit.jupiter.api.Assertions.*;
import static com.superpower.browser.shared.Data.*;

/** Exercises real migrations, mapper SQL and transaction rollback with synthetic accounts only. */
class AuthServiceTest {
    @Configuration @EnableTransactionManagement(proxyTargetClass=true) static class Transactions {}
    private static final String PASSWORD="Synthetic123!";
    private HikariDataSource source;
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private AuthService auth;

    @BeforeEach void setup() throws Exception {
        source=source();
        Flyway.configure().dataSource(source).load().migrate();
        jdbc=new JdbcTemplate(source);
        context=new AnnotationConfigApplicationContext();
        context.register(Transactions.class);
        context.registerBean(DataSourceTransactionManager.class,()->new DataSourceTransactionManager(source));
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var sessionFactory=factory.getObject();sessionFactory.getConfiguration().addMapper(Db.class);
        var sessions=new SqlSessionTemplate(sessionFactory);
        context.registerBean(Db.class,()->sessions.getMapper(Db.class));
        context.register(AuthRepository.class,AuthService.class,AuditRepository.class,WalletAccounts.class);
        context.refresh();auth=context.getBean(AuthService.class);
    }
    private HikariDataSource source() {
        var result=new HikariDataSource();
        result.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        result.setMaximumPoolSize(4);return result;
    }
    @AfterEach void close() { if(context!=null)context.close();if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");if(source!=null)source.close(); }
    private Actor owner(String username) { return (Actor)auth.register(Map.of("username",username,"password",PASSWORD),"test","127.0.0.1").get("user"); }
    private String role(Actor owner,String department,int type) {
        return auth.roles(owner).stream().filter(r->text(r,"departmentId").equals(department)&&number(r,"memberType")==type&&flag(r,"builtin")).map(r->text(r,"id")).findFirst().orElseThrow();
    }
    private String member(Actor owner,String department,String username,int type) {
        return auth.saveMember(owner,null,Map.of("username",username,"displayName",username,"password",PASSWORD,"departmentId",department,"roleIds",List.of(role(owner,department,type))));
    }
    private Actor actor(String username) { return (Actor)auth.login(Map.of("username",username,"password",PASSWORD)).get("user"); }
    private void status(int expected,Runnable action) { assertEquals(expected,assertThrows(BusinessException.class,action::run).status); }
    private long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class); }

    @Test void registrationCreatesIndependentTenantWalletAndRolesAtomically() {
        Actor a=owner("customer_one"),b=owner("customer_two");
        assertNotEquals(a.tenantId(),b.tenantId());assertTrue(a.owner());
        assertEquals(a.tenantId(),a.departmentId());assertEquals(3,auth.roles(a).size());
        assertEquals(1,auth.departments(a).size());assertEquals(1,auth.members(a).size());
        assertEquals(2,count("wallet"));assertEquals(0L,jdbc.queryForObject("SELECT balance_cents FROM wallet WHERE tenant_id=?",Long.class,a.tenantId()));
        assertFalse(jdbc.queryForObject("SELECT password_hash FROM app_user WHERE id=?",String.class,a.id()).contains(PASSWORD));
        status(409,()->owner("customer_one"));
        status(400,()->auth.register(Map.of("username","weak_account","password","short"),"",""));
        assertEquals(2,count("tenant"));assertEquals(2,count("app_user"));assertEquals(6,count("role"));
        status(404,()->auth.saveDepartment(b,a.departmentId(),Map.of("name","foreign")));
    }

    @Test void departmentalHierarchyRejectsCrossDepartmentPeerAndSelfChanges() {
        Actor boss=owner("boss_account");
        String a=auth.saveDepartment(boss,null,Map.of("name","运营一部")),b=auth.saveDepartment(boss,null,Map.of("name","运营二部"));
        String adminId=member(boss,a,"dept_admin",2),employee=member(boss,a,"dept_worker",1),other=member(boss,b,"other_worker",1);
        String superId=member(boss,b,"super_admin",3);Actor admin=actor("dept_admin");
        assertEquals(2,admin.memberType());assertEquals(1,auth.departments(admin).size());
        assertFalse(auth.members(admin).stream().anyMatch(m->text(m,"id").equals(other)));
        auth.saveMember(admin,employee,Map.of("displayName","新姓名"));
        status(403,()->auth.saveMember(admin,other,Map.of("displayName","越界")));
        status(403,()->auth.saveMember(admin,adminId,Map.of("displayName","自己")));
        status(403,()->auth.bindRoles(admin,employee,List.of(role(boss,a,3))));
        status(400,()->auth.bindRoles(boss,employee,List.of(role(boss,b,1))));
        status(403,()->auth.saveMember(actor("super_admin"),superId,Map.of("displayName","自己")));
        status(403,()->auth.saveMember(actor("dept_worker"),null,Map.of("displayName","x")));
        auth.bindRoles(boss,adminId,List.of(role(boss,a,1)));
        status(403,()->auth.saveMember(admin,employee,Map.of("displayName","stale administrator")));
    }

    @Test void invitationApprovalCreatesUsableMemberWithoutLeakingPasswords() {
        Actor boss=owner("invitation_owner");String dept=boss.departmentId();
        var invitation=auth.createInvitation(boss,Map.of("departmentId",dept));String token=text(invitation,"token");
        assertEquals("默认部门",auth.invitationInfo(token).get("departmentName"));
        String application=text(auth.applyInvitation(token,Map.of("username","invited_worker","displayName","成员甲","password",PASSWORD)),"id");
        status(401,()->actor("invited_worker"));
        var pending=auth.applications(boss,"PENDING");assertEquals(1,pending.size());
        assertFalse(pending.toString().contains(PASSWORD));assertFalse(pending.get(0).containsKey("passwordHash"));
        status(409,()->auth.applyInvitation(token,Map.of("username","invited_worker","password",PASSWORD)));
        auth.reviewApplication(boss,application,Map.of("approved",true,"roleIds",List.of(role(boss,dept,1))));
        Actor joined=actor("invited_worker");assertEquals(boss.tenantId(),joined.tenantId());assertEquals(1,joined.memberType());
        assertNull(jdbc.queryForObject("SELECT password_hash FROM member_application WHERE id=?",String.class,application));
        status(409,()->auth.reviewApplication(boss,application,Map.of("approved",true)));
        String denied=text(auth.applyInvitation(token,Map.of("username","rejected_worker","password",PASSWORD)),"id");
        auth.reviewApplication(boss,denied,Map.of("approved",false,"reason","请联系负责人"));
        status(401,()->actor("rejected_worker"));
        assertNull(jdbc.queryForObject("SELECT password_hash FROM member_application WHERE id=?",String.class,denied));
        auth.revokeInvitation(boss,text(invitation,"id"));status(404,()->auth.invitationInfo(token));
        status(404,()->auth.applyInvitation(token,Map.of("username","too_late","password",PASSWORD)));
    }

    @Test void approvalConflictRollsBackAndExpiredOrDemotedInvitersCannotAcceptApplications() {
        Actor boss=owner("review_owner"),outsider=owner("other_owner");String dept=boss.departmentId();
        var invitation=auth.createInvitation(boss,Map.of("departmentId",dept));String token=text(invitation,"token");
        String application=text(auth.applyInvitation(token,Map.of("username","claimed_name","password",PASSWORD)),"id");
        status(404,()->auth.reviewApplication(outsider,application,Map.of("approved",true)));
        owner("claimed_name");status(409,()->auth.reviewApplication(boss,application,Map.of("approved",true)));
        assertEquals(1,auth.applications(boss,"PENDING").size());assertEquals(1,auth.members(boss).size());
        jdbc.update("UPDATE member_invitation SET expires_at=TIMESTAMP '2000-01-01 00:00:00' WHERE id=?",text(invitation,"id"));
        status(404,()->auth.invitationInfo(token));
        String adminId=member(boss,dept,"invite_admin",2);
        var delegated=auth.createInvitation(actor("invite_admin"),Map.of("departmentId",dept));
        auth.bindRoles(boss,adminId,List.of(role(boss,dept,1)));
        status(404,()->auth.invitationInfo(text(delegated,"token")));
    }

    @Test void deletionRequiresDisableAndTransferAndRevokesAllAccess() {
        Actor boss=owner("departure_owner"),foreign=owner("foreign_owner");String dept=boss.departmentId();
        String departing=member(boss,dept,"departing_worker",1),receiver=member(boss,dept,"receiving_worker",1);
        String session=text(auth.login(Map.of("username","departing_worker","password",PASSWORD)),"token");
        jdbc.update("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port,auto_renew,auto_renew_user_id) VALUES('device',?,?,'proxy',2,'http','example.invalid',8080,TRUE,?)",boss.tenantId(),departing,departing);
        jdbc.update("INSERT INTO environment(id,tenant_id,owner_id,name,start_url,fingerprint_seed,fingerprint,device_id) VALUES('shop',?,?,'shop','https://example.com','seed','{}','device')",boss.tenantId(),departing);
        jdbc.update("INSERT INTO environment_grant(environment_id,user_id,granted_by) VALUES('shop',?,?)",departing,boss.id());
        status(409,()->auth.deleteMember(boss,departing,Map.of("transferTo",receiver)));
        auth.saveMember(boss,departing,Map.of("displayName","离职成员","enabled",false));
        status(401,()->auth.authenticate(session));
        status(409,()->auth.deleteMember(boss,departing,Map.of()));
        status(404,()->auth.deleteMember(boss,departing,Map.of("transferTo",foreign.id())));
        assertEquals(departing,jdbc.queryForObject("SELECT owner_id FROM environment WHERE id='shop'",String.class));
        assertEquals(1L,number(auth.departure(boss,departing),"environmentCount"));
        auth.deleteMember(boss,departing,Map.of("transferTo",receiver));
        assertEquals(receiver,jdbc.queryForObject("SELECT owner_id FROM environment WHERE id='shop'",String.class));
        assertEquals(receiver,jdbc.queryForObject("SELECT created_by FROM device WHERE id='device'",String.class));
        assertFalse(jdbc.queryForObject("SELECT auto_renew FROM device WHERE id='device'",Boolean.class));
        assertEquals(0L,jdbc.queryForObject("SELECT COUNT(*) FROM member_role WHERE user_id=?",Long.class,departing));
        assertEquals(0L,jdbc.queryForObject("SELECT COUNT(*) FROM environment_grant WHERE user_id=?",Long.class,departing));
        assertFalse(auth.members(boss).stream().anyMatch(m->text(m,"id").equals(departing)));
        assertTrue(jdbc.queryForObject("SELECT deleted FROM app_user WHERE id=?",Boolean.class,departing));
        status(401,()->actor("departing_worker"));status(404,()->auth.saveMember(boss,departing,Map.of("displayName","resurrect","enabled",true)));
        assertTrue(count("audit_event")>0);assertEquals(1,count("environment"));
    }

    @Test void movingDepartmentsReassignsRolesAndRevokesSessionAndInvitation() {
        Actor boss=owner("move_owner");String first=boss.departmentId(),second=auth.saveDepartment(boss,null,Map.of("name","新部门"));
        String adminId=member(boss,first,"moving_admin",2);var login=auth.login(Map.of("username","moving_admin","password",PASSWORD));
        var invitation=auth.createInvitation((Actor)login.get("user"),Map.of("departmentId",first));
        auth.saveMember(boss,adminId,Map.of("displayName","转部成员","departmentId",second,"roleIds",List.of(role(boss,second,1))));
        status(401,()->auth.authenticate(text(login,"token")));status(404,()->auth.invitationInfo(text(invitation,"token")));
        Actor moved=actor("moving_admin");assertEquals(second,moved.departmentId());assertEquals(1,moved.memberType());assertFalse(moved.permissions().contains("member.manage"));
        status(409,()->auth.deleteDepartment(boss,second));status(400,()->auth.deleteDepartment(boss,first));
        String empty=auth.saveDepartment(boss,null,Map.of("name","空部门"));auth.deleteDepartment(boss,empty);
        assertFalse(auth.departments(boss).stream().anyMatch(d->text(d,"id").equals(empty)));
    }

    @Test void newUsernamesAreValidatedForRegistrationMembersInvitationsAndProfileChanges() {
        Actor boss=owner("validation_owner");
        String invitation=text(auth.createInvitation(boss,Map.of("departmentId",boss.departmentId())),"token");
        for(String username:List.of("", "ab", "a".repeat(81), "中文账号", "member-name", "member.name", "member@name", "member name", "member\tname", "éclair", "Ａbc", "user１")) {
            status(400,()->auth.register(Map.of("username",username,"password",PASSWORD),"",""));
            status(400,()->auth.saveMember(boss,null,Map.of("username",username,"displayName","中文姓名","password",PASSWORD)));
            status(400,()->auth.applyInvitation(invitation,Map.of("username",username,"password",PASSWORD)));
            status(400,()->auth.updateProfile(boss,Map.of("username",username,"displayName","不应保存","currentPassword",PASSWORD)));
        }
        assertEquals(1,count("tenant"));assertEquals(1,count("app_user"));assertEquals(0,count("member_application"));
        assertEquals("validation_owner",auth.profile(boss).get("displayName"));
        Actor shortest=owner("A_1"),longest=owner("A_1"+"z".repeat(77));
        assertEquals(3,shortest.username().length());assertEquals(80,longest.username().length());
        String memberId=auth.saveMember(boss,null,Map.of("username","member_123","displayName","张三","password",PASSWORD));
        assertEquals("张三",auth.profile(auth.authorizedUser(memberId)).get("displayName"));
        auth.updateProfile(shortest,Map.of("username","Renamed_123","displayName","李四","currentPassword",PASSWORD));
        assertEquals(shortest.id(),actor("Renamed_123").id());
    }

    @Test void passwordRulesApplyToEveryNewPasswordAndFailedResetsRollBackMemberEdits() {
        Actor boss=owner("password_owner");String memberId=member(boss,boss.departmentId(),"password_member",1);
        String invitation=text(auth.createInvitation(boss,Map.of("departmentId",boss.departmentId())),"token");
        for(String password:List.of("", "Abcde12", "Ab"+"c".repeat(13)+"12", "abcdefgh1", "ABCDEFGH1", "Abcdefghi", "Ａbcdefg1", "Abcdefg１", "Ab1"+"🙂".repeat(7))) {
            status(400,()->auth.register(Map.of("username","invalid_password","password",password),"",""));
            status(400,()->auth.saveMember(boss,null,Map.of("username","invalid_password","displayName","中文姓名","password",password)));
            status(400,()->auth.applyInvitation(invitation,Map.of("username","invalid_password","password",password)));
            status(400,()->auth.changePassword(boss,Map.of("currentPassword",PASSWORD,"newPassword",password)));
            // An empty member password means "leave unchanged", as before.
            if(!password.isEmpty()) status(400,()->auth.saveMember(boss,memberId,Map.of("displayName","不应保存","password",password,"enabled",false)));
        }
        assertEquals(1,count("tenant"));assertEquals(2,count("app_user"));assertEquals(0,count("member_application"));
        assertEquals("password_member",auth.profile(actor("password_member")).get("displayName"));
        assertEquals(boss.id(),actor("password_owner").id());
    }

    @Test void legacyPasswordLengthAndExtraCharacterSemanticsArePreservedForNewPasswords() {
        int index=0;
        for(String password:List.of("Abcdef12", "Ab"+"c".repeat(12)+"12", "Ab1!#_??", "Ab1\ncdef", "Ab1中文密码!", "Ab1"+"🙂".repeat(6))) {
            String username="boundary_"+index++;
            Actor created=(Actor)auth.register(Map.of("username",username,"password",password),"","").get("user");
            Actor loggedIn=(Actor)auth.login(Map.of("username",username,"password",password)).get("user");
            assertEquals(created.id(),loggedIn.id());
        }
    }

    @Test void existingChineseAndHyphenatedAccountsKeepLoginProfilePasswordAndStatusManagement() {
        Actor boss=owner("legacy_owner");String legacyPassword="Synthetic-legacy-password";
        int index=0;
        for(String username:List.of("旧中文成员", "legacy-member")) {
            String memberId=member(boss,boss.departmentId(),"legacy_seed_"+index++,1);
            jdbc.update("UPDATE app_user SET username=?,password_hash=? WHERE id=?",username,AuthService.encodeBootstrapPassword(legacyPassword),memberId);
            Actor existing=(Actor)auth.login(Map.of("username",username,"password",legacyPassword)).get("user");
            auth.updateProfile(existing,Map.of("username",username,"displayName","新的中文姓名"));
            assertEquals(username,auth.profile(existing).get("username"));
            assertEquals("新的中文姓名",auth.profile(existing).get("displayName"));
            auth.changePassword(existing,Map.of("currentPassword",legacyPassword,"newPassword","Newpass8"));
            assertEquals(memberId,((Actor)auth.login(Map.of("username",username,"password","Newpass8")).get("user")).id());
            auth.saveMember(boss,memberId,Map.of("displayName","管理员修改姓名","enabled",false));
            status(401,()->auth.login(Map.of("username",username,"password","Newpass8")));
            auth.saveMember(boss,memberId,Map.of("displayName","管理员修改姓名","enabled",true,"password",PASSWORD));
            assertEquals(memberId,actor(username).id());
            assertEquals(username,jdbc.queryForObject("SELECT username FROM app_user WHERE id=?",String.class,memberId));
        }
    }

    @Test void approvalRechecksLegacyPendingUsernamesButPreservesTheirExistingPasswordHashes() {
        Actor boss=owner("pending_owner");String invitation=text(auth.createInvitation(boss,Map.of("departmentId",boss.departmentId())),"token");
        int index=0;
        for(String username:List.of("旧申请账号", "old-application")) {
            String application=text(auth.applyInvitation(invitation,Map.of("username","pending_seed_"+index++,"password",PASSWORD)),"id");
            jdbc.update("UPDATE member_application SET username=? WHERE id=?",username,application);
            status(400,()->auth.reviewApplication(boss,application,Map.of("approved",true)));
            assertEquals("PENDING",jdbc.queryForObject("SELECT status FROM member_application WHERE id=?",String.class,application));
            assertEquals(1,count("app_user"));
            auth.reviewApplication(boss,application,Map.of("approved",false,"reason","请使用英文账号重新申请"));
        }
        String application=text(auth.applyInvitation(invitation,Map.of("username","valid_pending","password",PASSWORD)),"id");
        String legacyPassword="Synthetic-legacy-password";
        jdbc.update("UPDATE member_application SET password_hash=? WHERE id=?",AuthService.encodeBootstrapPassword(legacyPassword),application);
        auth.reviewApplication(boss,application,Map.of("approved",true));
        Actor approved=(Actor)auth.login(Map.of("username","valid_pending","password",legacyPassword)).get("user");
        assertEquals(boss.tenantId(),approved.tenantId());assertEquals(2,count("app_user"));
    }

    @Test void bootstrapRetainsGeneratedAdministratorPasswordCompatibilityWithoutRelaxingUserInput() {
        var repository=context.getBean(AuthRepository.class);var wallets=context.getBean(WalletAccounts.class);
        status(400,()->new Bootstrap(repository,wallets,"bootstrap-admin","short").run(null));
        status(400,()->new Bootstrap(repository,wallets,"bootstrap-admin","界".repeat(25)).run(null));
        assertEquals(0,count("app_user"));assertEquals(0,count("tenant"));
        String password="Synthetic-generated-initial-administrator-password";
        status(400,()->auth.register(Map.of("username","manual_admin","password",password),"",""));
        new Bootstrap(repository,wallets,"bootstrap-admin",password).run(null);
        Actor initial=(Actor)auth.login(Map.of("username","bootstrap-admin","password",password)).get("user");
        assertTrue(initial.owner());assertEquals(1,count("wallet"));
        new Bootstrap(repository,wallets,"ignored","short").run(null);
        assertEquals(1,count("app_user"));
    }

    @Test void migrationPreservesExistingAssignmentsWithoutExpandingOldRoleScope() {
        try(var legacy=source()) {
            Flyway.configure().dataSource(legacy).target("18").load().migrate();var old=new JdbcTemplate(legacy);
            old.update("INSERT INTO tenant(id,name) VALUES('legacy','legacy')");
            old.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES('user','legacy','legacy-user','test','Legacy')");
            old.update("INSERT INTO role(id,tenant_id,name,member_type) VALUES('old-role','legacy','旧超级管理员',3)");
            old.update("INSERT INTO role_permission(role_id,permission) VALUES('old-role','shop.view')");
            old.update("INSERT INTO member_role(user_id,role_id) VALUES('user','old-role')");
            Flyway.configure().dataSource(legacy).load().migrate();
            assertEquals(1,old.queryForObject("SELECT member_type FROM role WHERE id='old-role'",Integer.class));
            assertEquals(3,old.queryForObject("SELECT legacy_member_type FROM role WHERE id='old-role'",Integer.class));
            assertEquals(1,old.queryForObject("SELECT COUNT(*) FROM member_role WHERE user_id='user' AND role_id='old-role'",Integer.class));
            assertEquals("legacy",old.queryForObject("SELECT department_id FROM app_user WHERE id='user'",String.class));
            assertEquals(3,old.queryForObject("SELECT COUNT(*) FROM role WHERE builtin=TRUE",Integer.class));
            old.execute("DROP ALL OBJECTS");
        }
    }

    @Test void permissionCatalogFollowsMenusAndFiltersUnassignablePermissionsAndDependencies() {
        Actor boss=owner("catalog_owner");
        var groups=auth.permissionNodes(boss);
        assertEquals(List.of("shop","device","proxy","ai","wallet","order","member","role"),groups.stream().map(PermissionCatalog.Group::code).toList());
        var nodes=groups.stream().flatMap(group->group.children().stream()).toList();
        assertEquals(23,nodes.size());
        assertEquals(9,nodes.stream().filter(node->node.minMemberType()<=1).count());
        assertEquals(16,nodes.stream().filter(node->node.minMemberType()<=2).count());
        assertEquals("/proxy/list",groups.stream().filter(group->group.code().equals("proxy")).findFirst().orElseThrow().menuPath());
        String memberId=member(boss,boss.departmentId(),"catalog_worker",1);
        status(403,()->auth.permissionNodes(auth.authorizedUser(memberId)));
        member(boss,boss.departmentId(),"catalog_admin",2);
        var adminNodes=auth.permissionNodes(actor("catalog_admin")).stream().flatMap(group->group.children().stream()).map(PermissionCatalog.Permission::code).toList();
        assertTrue(adminNodes.containsAll(List.of("proxy.view","proxy.edit","member.manage")));
        assertFalse(adminNodes.contains("wallet.view"));
        var incomplete=PermissionCatalog.assignableGroups(Set.of("shop.open","proxy.edit","role.manage"));
        assertEquals(List.of("role"),incomplete.stream().map(PermissionCatalog.Group::code).toList());
    }

    @Test void savingRolesValidatesTypeAndDependencyScopeAndNeverAcceptsEmptyPermissions() {
        Actor boss=owner("permission_owner");String department=boss.departmentId();
        String custom=auth.saveRole(boss,null,Map.of("name","日常运营","memberType",1,"permissions",List.of("shop.open","proxy.edit","shop.open")));
        var repository=context.getBean(AuthRepository.class);
        assertEquals(Set.of("shop.view","shop.open","proxy.view","proxy.edit"),Set.copyOf(repository.rolePermissions(custom)));
        status(400,()->auth.saveRole(boss,custom,Map.of("name","不可越级","memberType",1,"permissions",List.of("member.manage"))));
        status(400,()->auth.saveRole(boss,custom,Map.of("name","不可越级","memberType",2,"permissions",List.of("wallet.recharge"))));
        status(400,()->auth.saveRole(boss,custom,Map.of("name","空权限","permissions",List.of())));
        status(400,()->auth.saveRole(boss,custom,Map.of("name","未知权限","permissions",List.of("unknown.manage"))));
        assertEquals("日常运营",text(repository.role(boss.tenantId(),custom),"name"));
        String limitedRole=auth.saveRole(boss,null,Map.of("name","受限管理员","memberType",2,"permissions",List.of("role.manage","shop.open")));
        String limited=auth.saveMember(boss,null,Map.of("username","limited_admin","displayName","受限管理员","password",PASSWORD,"roleIds",List.of(limitedRole)));
        Actor stale=auth.authorizedUser(limited);
        jdbc.update("DELETE FROM role_permission WHERE role_id=? AND permission='shop.view'",limitedRole);
        status(403,()->auth.saveRole(stale,null,Map.of("name","缺失依赖","memberType",1,"permissions",List.of("shop.open"))));
        member(boss,department,"permission_admin",2);
        String legacy=auth.saveRole(boss,null,Map.of("name","历史越级角色","memberType",1,"permissions",List.of("shop.view")));
        jdbc.update("INSERT INTO role_permission(role_id,permission) VALUES(?,'wallet.view')",legacy);
        Actor administrator=actor("permission_admin");
        status(403,()->auth.saveRole(administrator,legacy,Map.of("name","篡改历史角色","permissions",List.of("shop.view"))));
        status(403,()->auth.deleteRole(administrator,legacy));
        assertTrue(repository.rolePermissions(legacy).contains("wallet.view"));
    }

    @Test void roleChangesTakeEffectForExistingSessionsAndDoNotRetainRemovedDependencies() {
        Actor boss=owner("revocation_owner");
        String roleId=auth.saveRole(boss,null,Map.of("name","店铺运营","memberType",1,"permissions",List.of("shop.open")));
        auth.saveMember(boss,null,Map.of("username","revocation_worker","displayName","运营","password",PASSWORD,"roleIds",List.of(roleId)));
        String session=text(auth.login(Map.of("username","revocation_worker","password",PASSWORD)),"token");
        assertTrue(auth.authenticate(session).permissions().containsAll(Set.of("shop.view","shop.open")));
        auth.saveRole(boss,roleId,Map.of("name","代理查看","permissions",List.of("proxy.view")));
        assertEquals(Set.of("proxy.view"),auth.authenticate(session).permissions());
        auth.saveRole(boss,roleId,Map.of("name","代理查看","enabled",false,"permissions",List.of("proxy.view")));
        assertTrue(auth.authenticate(session).permissions().isEmpty());
    }

    @Test void legacyRolesCanBeDisabledWithoutRegrantingInvalidPermissionsOrChangingTheirDefinition() {
        Actor boss=owner("legacy_disable_owner");var repository=context.getBean(AuthRepository.class);
        String legacy=auth.saveRole(boss,null,Map.of("name","历史资金角色","description","保留的旧配置","memberType",1,"permissions",List.of("shop.view")));
        jdbc.update("INSERT INTO role_permission(role_id,permission) VALUES(?,'wallet.view')",legacy);
        auth.saveMember(boss,null,Map.of("username","legacy_disable_worker","displayName","历史成员","password",PASSWORD,"roleIds",List.of(legacy)));
        String token=text(auth.login(Map.of("username","legacy_disable_worker","password",PASSWORD)),"token");
        var unchanged=Map.<String,Object>of("name","历史资金角色","description","保留的旧配置","memberType",1,"permissions",List.of("shop.view","wallet.view"),"enabled",false);
        assertTrue(auth.authenticate(token).permissions().contains("wallet.view"));
        for(String field:List.of("name","description","memberType","permissions","enabled")) {
            var edited=new HashMap<>(unchanged);
            edited.put(field,switch(field) {
                case "name","description" -> "修改了配置";
                case "memberType" -> 2;
                case "permissions" -> List.of("shop.view","wallet.view","ai.use");
                default -> true;
            });
            status(400,()->auth.saveRole(boss,legacy,edited));
        }
        auth.saveRole(boss,legacy,unchanged);
        assertFalse(flag(repository.role(boss.tenantId(),legacy),"enabled"));
        assertEquals(Set.of("shop.view","wallet.view"),Set.copyOf(repository.rolePermissions(legacy)));
        assertTrue(auth.authenticate(token).permissions().isEmpty());
        var enable=new HashMap<>(unchanged);enable.put("enabled",true);
        status(400,()->auth.saveRole(boss,legacy,enable));
        status(400,()->auth.saveRole(boss,null,unchanged));
        String empty=auth.saveRole(boss,null,Map.of("name","历史空角色","permissions",List.of("shop.view")));
        jdbc.update("DELETE FROM role_permission WHERE role_id=?",empty);
        auth.saveRole(boss,empty,Map.of("name","历史空角色","permissions",List.of(),"enabled",false));
        assertFalse(flag(repository.role(boss.tenantId(),empty),"enabled"));
        status(400,()->auth.saveRole(boss,empty,Map.of("name","历史空角色","permissions",List.of(),"enabled",true)));
        status(400,()->auth.saveRole(boss,null,Map.of("name","新增空角色","permissions",List.of(),"enabled",false)));
    }

    @Test void disablingLegacyRolesStillChecksOperatorScopeAndEveryAffectedMembersAuthority() {
        Actor boss=owner("legacy_scope_owner");String department=boss.departmentId();
        member(boss,department,"legacy_scope_admin",2);Actor administrator=actor("legacy_scope_admin");
        String funds=auth.saveRole(boss,null,Map.of("name","历史资金权限","permissions",List.of("shop.view")));
        jdbc.update("INSERT INTO role_permission(role_id,permission) VALUES(?,'wallet.view')",funds);
        status(403,()->auth.saveRole(administrator,funds,Map.of("name","历史资金权限","permissions",List.of("shop.view","wallet.view"),"enabled",false)));
        String assigned=auth.saveRole(boss,null,Map.of("name","历史管理权限","permissions",List.of("shop.view")));
        jdbc.update("INSERT INTO role_permission(role_id,permission) VALUES(?,'member.manage')",assigned);
        String higher=member(boss,department,"legacy_scope_super",3);
        auth.bindRoles(boss,higher,List.of(role(boss,department,3),assigned));
        status(403,()->auth.saveRole(administrator,assigned,Map.of("name","历史管理权限","permissions",List.of("shop.view","member.manage"),"enabled",false)));
        var repository=context.getBean(AuthRepository.class);
        assertTrue(flag(repository.role(boss.tenantId(),funds),"enabled"));
        assertTrue(flag(repository.role(boss.tenantId(),assigned),"enabled"));
    }

    @Test void limitedAdministratorsCannotTakeOverMembersWithPermissionsTheyCannotAssign() {
        Actor boss=owner("scope_owner");String department=boss.departmentId();
        member(boss,department,"scope_admin",2);Actor administrator=actor("scope_admin");
        assertFalse(administrator.permissions().contains("ai.use"));
        String aiRole=auth.saveRole(boss,null,Map.of("name","AI 运营","memberType",1,"permissions",List.of("ai.use")));
        String worker=auth.saveMember(boss,null,Map.of("username","scope_worker","displayName","AI 运营","password",PASSWORD,"roleIds",List.of(aiRole)));
        status(403,()->auth.saveMember(administrator,worker,Map.of("displayName","接管账号","password","Newpass8")));
        status(403,()->auth.saveMember(administrator,worker,Map.of("displayName","停用账号","enabled",false)));
        status(403,()->auth.bindRoles(administrator,worker,List.of(role(boss,department,1))));
        assertEquals(Set.of("ai.use"),actor("scope_worker").permissions());
        auth.saveRole(boss,aiRole,Map.of("name","AI 运营","enabled",false,"permissions",List.of("ai.use")));
        assertTrue(actor("scope_worker").permissions().isEmpty());
        status(403,()->auth.saveMember(administrator,worker,Map.of("displayName","趁角色停用重置","password","Newpass8")));
        String superMember=member(boss,department,"scope_super",3),superRole=role(boss,department,3);
        auth.saveRole(boss,superRole,Map.of("name","暂停的超级管理员","enabled",false,"permissions",new ArrayList<>(AuthService.PERMISSIONS)));
        assertEquals(1,actor("scope_super").memberType());
        status(403,()->auth.saveMember(administrator,superMember,Map.of("displayName","趁级别停用重置","password","Newpass8")));
        auth.saveMember(boss,worker,Map.of("displayName","所有者重置","password","Newpass8"));
        assertEquals(worker,((Actor)auth.login(Map.of("username","scope_worker","password","Newpass8")).get("user")).id());
    }

    @Test void proxyPermissionMigrationPreservesOnlyCorrespondingExistingDeviceGrants() {
        try(var legacy=source()) {
            Flyway.configure().dataSource(legacy).target("23").load().migrate();var old=new JdbcTemplate(legacy);
            old.update("INSERT INTO tenant(id,name) VALUES('proxy-legacy','legacy')");
            old.update("INSERT INTO department(id,tenant_id,name,is_default) VALUES('proxy-legacy','proxy-legacy','default',TRUE)");
            for(String roleId:List.of("viewer","editor","exporter","unrelated")) {
                old.update("INSERT INTO role(id,tenant_id,name,department_id) VALUES(?,'proxy-legacy',?,'proxy-legacy')",roleId,roleId);
            }
            old.update("INSERT INTO role_permission(role_id,permission) VALUES('viewer','device.view'),('viewer','proxy.view'),('editor','device.edit'),('exporter','device.export'),('unrelated','shop.view')");
            Flyway.configure().dataSource(legacy).load().migrate();
            assertEquals(Set.of("device.view","proxy.view"),new HashSet<>(old.queryForList("SELECT permission FROM role_permission WHERE role_id='viewer'",String.class)));
            assertEquals(Set.of("device.edit","proxy.edit"),new HashSet<>(old.queryForList("SELECT permission FROM role_permission WHERE role_id='editor'",String.class)));
            assertEquals(Set.of("device.export","proxy.export"),new HashSet<>(old.queryForList("SELECT permission FROM role_permission WHERE role_id='exporter'",String.class)));
            assertEquals(List.of("shop.view"),old.queryForList("SELECT permission FROM role_permission WHERE role_id='unrelated'",String.class));
            assertEquals(4,old.queryForObject("SELECT COUNT(*) FROM role WHERE member_type=1",Integer.class));
            old.execute("DROP ALL OBJECTS");
        }
    }
}
