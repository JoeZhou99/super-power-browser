package com.superpower.browser.environment;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.config.ConfigOperator;
import com.superpower.browser.shared.*;
import com.zaxxer.hikari.HikariDataSource;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static com.superpower.browser.shared.Data.*;

/**
 * Quota enforcement against the real migrated schema. Creation counts are
 * owner based, so department visibility and explicit grants cannot transfer a
 * member's quota to another account.
 */
class ShopQuotaServiceTest {
    private HikariDataSource source;
    private JdbcTemplate jdbc;
    private ShopQuotaService quotas;
    private Actor owner = new Actor("owner", "tenant", "owner", true, Set.of("shop.create"));
    private Actor member = new Actor("member", "tenant", "member", false, Set.of("shop.create"));

    @BeforeEach
    void setup() throws Exception {
        source = new HikariDataSource();
        source.setJdbcUrl("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        Flyway.configure().dataSource(source).load().migrate();
        jdbc = new JdbcTemplate(source);
        var factory = new SqlSessionFactoryBean();
        factory.setDataSource(source);
        factory.afterPropertiesSet();
        var configuration = factory.getObject();
        configuration.getConfiguration().addMapper(Db.class);
        Db db = new SqlSessionTemplate(configuration).getMapper(Db.class);
        quotas = new ShopQuotaService(new ShopQuotaRepository(db));
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','Synthetic tenant')");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name,owner) VALUES('owner','tenant','owner','synthetic','Owner',TRUE)");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name,owner) VALUES('member','tenant','member','synthetic','Member',FALSE)");
    }

    @AfterEach
    void close() {
        if (jdbc != null) jdbc.execute("DROP ALL OBJECTS");
        if (source != null) source.close();
    }

    private void policy(String userId, long limit, boolean enabled) {
        jdbc.update("INSERT INTO shop_creation_quota(user_id,tenant_id,limit_count,enabled) VALUES(?,?,?,?)", userId, "tenant", limit, enabled);
    }

    private void shop(String id, String ownerId, boolean recycled) {
        jdbc.update("INSERT INTO environment(id,tenant_id,owner_id,name,start_url,fingerprint_seed,fingerprint,recycled) VALUES(?,?,?,?,?,?,?,?)",
            id, "tenant", ownerId, id, "https://example.test", "seed-" + id, "{}", recycled);
    }

    private BusinessException failure(Actor actor) {
        return assertThrows(BusinessException.class, () -> quotas.check(actor));
    }

    @Test
    void noPolicyAndDisabledPolicyAreUnlimitedButStillCountExistingRows() {
        shop("owner-active", "owner", false);
        shop("owner-recycled", "owner", true);
        assertEquals(2, quotas.check(owner).used());
        var unconfigured = quotas.get(new ConfigOperator("operator", "ops"), "owner");
        assertEquals(0L, number(unconfigured, "revision"));
        assertEquals("", text(unconfigured, "note"));
        policy("owner", 0, false);
        var disabled = quotas.check(owner);
        assertFalse(disabled.limited());
        assertEquals(2, disabled.used());
    }

    @Test
    void limitBelongsToCreatorAndRecycledShopsConsumeCapacity() {
        policy("owner", 2, true);
        shop("owner-active", "owner", false);
        shop("owner-recycled", "owner", true);
        shop("member-active", "member", false);
        var exceeded = failure(owner);
        assertEquals(409, exceeded.status);
        assertEquals("SHOP_QUOTA_EXCEEDED", exceeded.code);
        assertEquals(1, quotas.check(member).used());
    }

    @Test
    void unlimitedSentinelAndIndependentMemberPoliciesWorkAcrossDepartments() {
        policy("owner", -1, true);
        for (int i = 0; i < 3; i++) shop("owner-" + i, "owner", false);
        assertFalse(quotas.check(owner).limited());
        policy("member", 1, true);
        shop("member-one", "member", false);
        assertEquals("SHOP_QUOTA_EXCEEDED", failure(member).code);
    }

    @Test
    void disabledOrDeletedMemberCannotCreateEvenWhenQuotaIsAvailable() {
        policy("member", 10, true);
        jdbc.update("UPDATE app_user SET enabled=FALSE WHERE id='member'");
        assertEquals(401, failure(member).status);
        jdbc.update("UPDATE app_user SET enabled=TRUE,deleted=TRUE WHERE id='member'");
        assertEquals(401, failure(member).status);
    }

    @Test
    void operatorUpdateUsesRevisionAndWritesAnAuditSnapshot() {
        var operator=new ConfigOperator("operator","ops");
        var first=quotas.save(operator,"owner",Map.of("limitCount",2,"enabled",true,"note","ticket-1"));
        assertEquals(2L,number(first,"limitCount"));
        assertEquals(1L,number(first,"revision"));
        assertEquals(2L,number(first,"remainingCount"));
        var second=quotas.save(operator,"owner",Map.of("limitCount",3,"enabled",true,"note","ticket-2","revision",1));
        assertEquals(3L,number(second,"limitCount"));
        assertEquals(2L,number(second,"revision"));
        assertEquals(2L,jdbc.queryForObject("SELECT COUNT(*) FROM shop_quota_audit WHERE user_id='owner'",Long.class));
        var conflict=assertThrows(BusinessException.class,()->quotas.save(operator,"owner",Map.of("limitCount",4,"revision",1)));
        assertEquals(409,conflict.status);
    }
}
