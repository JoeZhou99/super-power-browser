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
    private static final String PASSWORD="Synthetic-test-password";
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
        Actor a=owner("customer-one"),b=owner("customer-two");
        assertNotEquals(a.tenantId(),b.tenantId());assertTrue(a.owner());
        assertEquals(a.tenantId(),a.departmentId());assertEquals(3,auth.roles(a).size());
        assertEquals(1,auth.departments(a).size());assertEquals(1,auth.members(a).size());
        assertEquals(2,count("wallet"));assertEquals(0L,jdbc.queryForObject("SELECT balance_cents FROM wallet WHERE tenant_id=?",Long.class,a.tenantId()));
        assertFalse(jdbc.queryForObject("SELECT password_hash FROM app_user WHERE id=?",String.class,a.id()).contains(PASSWORD));
        status(409,()->owner("customer-one"));
        status(400,()->auth.register(Map.of("username","weak-account","password","short"),"",""));
        assertEquals(2,count("tenant"));assertEquals(2,count("app_user"));assertEquals(6,count("role"));
        status(404,()->auth.saveDepartment(b,a.departmentId(),Map.of("name","foreign")));
    }

    @Test void departmentalHierarchyRejectsCrossDepartmentPeerAndSelfChanges() {
        Actor boss=owner("boss-account");
        String a=auth.saveDepartment(boss,null,Map.of("name","运营一部")),b=auth.saveDepartment(boss,null,Map.of("name","运营二部"));
        String adminId=member(boss,a,"dept-admin",2),employee=member(boss,a,"dept-worker",1),other=member(boss,b,"other-worker",1);
        String superId=member(boss,b,"super-admin",3);Actor admin=actor("dept-admin");
        assertEquals(2,admin.memberType());assertEquals(1,auth.departments(admin).size());
        assertFalse(auth.members(admin).stream().anyMatch(m->text(m,"id").equals(other)));
        auth.saveMember(admin,employee,Map.of("displayName","新姓名"));
        status(403,()->auth.saveMember(admin,other,Map.of("displayName","越界")));
        status(403,()->auth.saveMember(admin,adminId,Map.of("displayName","自己")));
        status(403,()->auth.bindRoles(admin,employee,List.of(role(boss,a,3))));
        status(400,()->auth.bindRoles(boss,employee,List.of(role(boss,b,1))));
        status(403,()->auth.saveMember(actor("super-admin"),superId,Map.of("displayName","自己")));
        status(403,()->auth.saveMember(actor("dept-worker"),null,Map.of("displayName","x")));
        auth.bindRoles(boss,adminId,List.of(role(boss,a,1)));
        status(403,()->auth.saveMember(admin,employee,Map.of("displayName","stale administrator")));
    }

    @Test void invitationApprovalCreatesUsableMemberWithoutLeakingPasswords() {
        Actor boss=owner("invitation-owner");String dept=boss.departmentId();
        var invitation=auth.createInvitation(boss,Map.of("departmentId",dept));String token=text(invitation,"token");
        assertEquals("默认部门",auth.invitationInfo(token).get("departmentName"));
        String application=text(auth.applyInvitation(token,Map.of("username","invited-worker","displayName","成员甲","password",PASSWORD)),"id");
        status(401,()->actor("invited-worker"));
        var pending=auth.applications(boss,"PENDING");assertEquals(1,pending.size());
        assertFalse(pending.toString().contains(PASSWORD));assertFalse(pending.get(0).containsKey("passwordHash"));
        status(409,()->auth.applyInvitation(token,Map.of("username","invited-worker","password",PASSWORD)));
        auth.reviewApplication(boss,application,Map.of("approved",true,"roleIds",List.of(role(boss,dept,1))));
        Actor joined=actor("invited-worker");assertEquals(boss.tenantId(),joined.tenantId());assertEquals(1,joined.memberType());
        assertNull(jdbc.queryForObject("SELECT password_hash FROM member_application WHERE id=?",String.class,application));
        status(409,()->auth.reviewApplication(boss,application,Map.of("approved",true)));
        String denied=text(auth.applyInvitation(token,Map.of("username","rejected-worker","password",PASSWORD)),"id");
        auth.reviewApplication(boss,denied,Map.of("approved",false,"reason","请联系负责人"));
        status(401,()->actor("rejected-worker"));
        assertNull(jdbc.queryForObject("SELECT password_hash FROM member_application WHERE id=?",String.class,denied));
        auth.revokeInvitation(boss,text(invitation,"id"));status(404,()->auth.invitationInfo(token));
        status(404,()->auth.applyInvitation(token,Map.of("username","too-late","password",PASSWORD)));
    }

    @Test void approvalConflictRollsBackAndExpiredOrDemotedInvitersCannotAcceptApplications() {
        Actor boss=owner("review-owner"),outsider=owner("other-owner");String dept=boss.departmentId();
        var invitation=auth.createInvitation(boss,Map.of("departmentId",dept));String token=text(invitation,"token");
        String application=text(auth.applyInvitation(token,Map.of("username","claimed-name","password",PASSWORD)),"id");
        status(404,()->auth.reviewApplication(outsider,application,Map.of("approved",true)));
        owner("claimed-name");status(409,()->auth.reviewApplication(boss,application,Map.of("approved",true)));
        assertEquals(1,auth.applications(boss,"PENDING").size());assertEquals(1,auth.members(boss).size());
        jdbc.update("UPDATE member_invitation SET expires_at=TIMESTAMP '2000-01-01 00:00:00' WHERE id=?",text(invitation,"id"));
        status(404,()->auth.invitationInfo(token));
        String adminId=member(boss,dept,"invite-admin",2);
        var delegated=auth.createInvitation(actor("invite-admin"),Map.of("departmentId",dept));
        auth.bindRoles(boss,adminId,List.of(role(boss,dept,1)));
        status(404,()->auth.invitationInfo(text(delegated,"token")));
    }

    @Test void deletionRequiresDisableAndTransferAndRevokesAllAccess() {
        Actor boss=owner("departure-owner"),foreign=owner("foreign-owner");String dept=boss.departmentId();
        String departing=member(boss,dept,"departing-worker",1),receiver=member(boss,dept,"receiving-worker",1);
        String session=text(auth.login(Map.of("username","departing-worker","password",PASSWORD)),"token");
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
        status(401,()->actor("departing-worker"));status(404,()->auth.saveMember(boss,departing,Map.of("displayName","resurrect","enabled",true)));
        assertTrue(count("audit_event")>0);assertEquals(1,count("environment"));
    }

    @Test void movingDepartmentsReassignsRolesAndRevokesSessionAndInvitation() {
        Actor boss=owner("move-owner");String first=boss.departmentId(),second=auth.saveDepartment(boss,null,Map.of("name","新部门"));
        String adminId=member(boss,first,"moving-admin",2);var login=auth.login(Map.of("username","moving-admin","password",PASSWORD));
        var invitation=auth.createInvitation((Actor)login.get("user"),Map.of("departmentId",first));
        auth.saveMember(boss,adminId,Map.of("displayName","转部成员","departmentId",second,"roleIds",List.of(role(boss,second,1))));
        status(401,()->auth.authenticate(text(login,"token")));status(404,()->auth.invitationInfo(text(invitation,"token")));
        Actor moved=actor("moving-admin");assertEquals(second,moved.departmentId());assertEquals(1,moved.memberType());assertFalse(moved.permissions().contains("member.manage"));
        status(409,()->auth.deleteDepartment(boss,second));status(400,()->auth.deleteDepartment(boss,first));
        String empty=auth.saveDepartment(boss,null,Map.of("name","空部门"));auth.deleteDepartment(boss,empty);
        assertFalse(auth.departments(boss).stream().anyMatch(d->text(d,"id").equals(empty)));
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
}
