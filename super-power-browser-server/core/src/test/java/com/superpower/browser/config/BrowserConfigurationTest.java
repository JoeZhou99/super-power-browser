package com.superpower.browser.config;

import com.superpower.browser.environment.PlatformCatalog;
import com.superpower.browser.shared.*;
import com.zaxxer.hikari.HikariDataSource;
import java.util.*;
import java.util.concurrent.*;
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

/** Actual Flyway schema, mapper SQL and Spring transactions; no live customer database. */
class BrowserConfigurationTest {
    @Configuration @EnableTransactionManagement(proxyTargetClass=true) static class Transactions {}
    private HikariDataSource source;
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private BrowserConfiguration configs;
    private ConfigOperatorAuth auth;
    private ConfigOperator operator;
    private static final String PASSWORD="Synthetic-operator-12345";
    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        source.setMaximumPoolSize(4);Flyway.configure().dataSource(source).load().migrate();jdbc=new JdbcTemplate(source);
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var sessionFactory=factory.getObject();sessionFactory.getConfiguration().addMapper(Db.class);
        var sessions=new SqlSessionTemplate(sessionFactory);
        context=new AnnotationConfigApplicationContext();context.register(Transactions.class);
        context.registerBean(DataSourceTransactionManager.class,()->new DataSourceTransactionManager(source));
        context.registerBean(Db.class,()->sessions.getMapper(Db.class));
        context.register(BrowserConfiguration.class,ConfigOperatorAuth.class,PlatformCatalog.class);context.refresh();
        configs=context.getBean(BrowserConfiguration.class);auth=context.getBean(ConfigOperatorAuth.class);
        configs.initialize();auth.bootstrap("ops-admin",PASSWORD);
        operator=(ConfigOperator)auth.login(Map.of("username","ops-admin","password",PASSWORD)).get("user");
    }
    @AfterEach void close() { if(context!=null)context.close();if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");if(source!=null)source.close(); }
    @SuppressWarnings("unchecked") private List<Map<String,Object>> entries(Map<String,Object> document) { return (List<Map<String,Object>>)document.get("entries"); }
    private Map<String,Object> edit(String key) { return object(json(configs.get(operator,key))); }
    private void status(int status,Runnable action) { assertEquals(status,assertThrows(BusinessException.class,action::run).status); }

    @Test void persistedDictionariesAreImmediatelyVisibleAndInitializationNeverOverwritesEdits() {
        assertEquals(5,configs.list(operator).size());
        assertTrue(((List<?>)configs.client().get("timezones")).size()>500);
        var doc=edit("languages");entries(doc).get(0).put("label","运营配置的中文");entries(doc).get(1).put("enabled",false);
        var saved=configs.save(operator,"languages",doc);assertEquals(2,number(saved,"revision"));
        var read=configs.client();assertEquals(2,number(read,"revision"));
        assertTrue(json(read.get("languages")).contains("运营配置的中文"));assertFalse(json(read.get("languages")).contains("zh-TW"));
        configs.initialize();assertEquals(saved,configs.get(operator,"languages"));
        var log=configs.audit(operator,1,20);assertEquals(1,number(log,"total"));
        assertTrue(json(log).contains("运营配置的中文"));assertFalse(json(log).contains(PASSWORD));
        status(409,()->configs.save(operator,"languages",doc));
        assertEquals(1,number(configs.audit(operator,1,20),"total"));
    }
    @Test void validationAndDefaultsProtectEnabledValuesWithoutRewritingExistingFingerprints() {
        var doc=edit("timezones");entries(doc).stream().filter(e->text(e,"value").equals("Asia/Shanghai")).findFirst().orElseThrow().put("enabled",false);
        status(400,()->configs.save(operator,"timezones",doc));
        var defaults=edit("browser-defaults");defaults.put("values",Map.of("timezone","Europe/London","language","en-US","resolution","1366x768"));
        configs.save(operator,"browser-defaults",defaults);configs.save(operator,"timezones",doc);
        var missing=new HashMap<String,Object>();configs.applyDefaults(missing,null);
        assertEquals(Map.of("timezone","Europe/London","language","en-US","resolution","1366x768"),missing);
        var old=new HashMap<String,Object>();configs.applyDefaults(old,Map.of("timezone","Asia/Shanghai","language","zh-CN","resolution","1920x1080"));
        assertEquals("Asia/Shanghai",old.get("timezone"));
        var explicit=new HashMap<String,Object>(Map.of("timezone","America/New_York","language","ja-JP","resolution","1440x900"));
        configs.applyDefaults(explicit,null);assertEquals("America/New_York",explicit.get("timezone"));
        for(String key:List.of("timezones","languages","resolutions")) {
            var invalid=edit(key);entries(invalid).get(0).put("value","not a valid value");status(400,()->configs.save(operator,key,invalid));
            var duplicate=edit(key);entries(duplicate).get(1).put("value",entries(duplicate).get(0).get("value"));status(400,()->configs.save(operator,key,duplicate));
        }
        var unknown=edit("browser-defaults");unknown.put("values",Map.of("timezone","Europe/London","language","not-enabled","resolution","1366x768"));
        status(400,()->configs.save(operator,"browser-defaults",unknown));
        var unsupported=edit("languages");entries(unsupported).get(0).put("value","__local__");status(400,()->configs.save(operator,"languages",unsupported));
        status(400,()->configs.save(operator,"languages",Map.of("revision",1,"entries",List.of("invalid"))));
        status(404,()->configs.get(operator,"capabilities"));
    }
    @Test void localeModesCanBeOperationalDefaultsWithoutChangingExistingCustomValues() {
        assertTrue(json(configs.client().get("languages")).contains("auto"));
        assertTrue(json(configs.client().get("timezones")).contains("__local__"));
        var defaults=edit("browser-defaults");defaults.put("values",Map.of("timezone","auto","language","auto","resolution","1366x768"));
        configs.save(operator,"browser-defaults",defaults);
        var fresh=new HashMap<String,Object>();configs.applyDefaults(fresh,null);
        assertEquals(Map.of("timezone","auto","language","auto","resolution","1366x768"),fresh);
        var old=Map.<String,Object>of("timezone","Europe/Berlin","language","de-DE","resolution","1920x1080");
        var existing=new HashMap<String,Object>();configs.applyDefaults(existing,old);assertEquals(old,existing);
        defaults=edit("browser-defaults");defaults.put("values",Map.of("timezone","__local__","language","en-US","resolution","1366x768"));
        configs.save(operator,"browser-defaults",defaults);fresh.clear();configs.applyDefaults(fresh,null);assertEquals("__local__",fresh.get("timezone"));
        var disable=edit("timezones");entries(disable).stream().filter(e->text(e,"value").equals("__local__")).findFirst().orElseThrow().put("enabled",false);
        status(400,()->configs.save(operator,"timezones",disable));
    }
    @Test void upgradingAnExistingDictionaryAppendsLocaleModesOnceAndPreservesOperationalEdits() {
        var documents=new LinkedHashMap<String,Map<String,Object>>();
        for(String key:List.of("timezones","languages","resolutions")) {
            var doc=edit(key);entries(doc).removeIf(e->Set.of("auto","__local__").contains(text(e,"value")));
            entries(doc).get(0).put("label","已配置的标签");documents.put(key,Map.of("entries",entries(doc)));
        }
        var customDefaults=Map.of("timezone","Europe/London","language","en-GB","resolution","1280x720");
        documents.put("browser-defaults",Map.of("values",customDefaults));documents.put("platform-sites",Map.of());
        jdbc.execute("DROP ALL OBJECTS");Flyway.configure().dataSource(source).target("21").load().migrate();
        for(var doc:documents.entrySet())jdbc.update("INSERT INTO browser_config(config_key,payload,revision) VALUES(?,?,5)",doc.getKey(),json(doc.getValue()));
        jdbc.update("UPDATE config_state SET revision=8 WHERE id=1");
        Flyway.configure().dataSource(source).load().migrate();configs.initialize();
        assertEquals(customDefaults,configs.client().get("defaults"));assertEquals(10,number(configs.client(),"revision"));
        for(String key:List.of("timezones","languages")) {
            var stored=object(jdbc.queryForObject("SELECT payload FROM browser_config WHERE config_key=?",String.class,key));
            assertEquals("已配置的标签",entries(stored).get(0).get("label"));
            assertTrue(entries(stored).stream().anyMatch(e->text(e,"value").equals("auto")&&flag(e,"enabled")));
            assertEquals(6,jdbc.queryForObject("SELECT revision FROM browser_config WHERE config_key=?",Integer.class,key));
        }
        auth.bootstrap("ops-admin",PASSWORD);operator=(ConfigOperator)auth.login(Map.of("username","ops-admin","password",PASSWORD)).get("user");
        var languages=edit("languages");entries(languages).removeIf(e->text(e,"value").equals("auto"));configs.save(operator,"languages",languages);
        var zones=edit("timezones");entries(zones).stream().filter(e->text(e,"value").equals("__local__")).findFirst().orElseThrow().put("enabled",false);configs.save(operator,"timezones",zones);
        String before=json(configs.client());configs.initialize();assertEquals(before,json(configs.client()));
        assertFalse(json(configs.client().get("languages")).contains("auto"));assertFalse(json(configs.client().get("timezones")).contains("__local__"));
    }
    @Test void platformUpdatesAndDisablingDoNotRewriteStoredShopUrls() {
        var doc=edit("platform-sites");var first=entries(doc).get(0);String siteId=text(first,"id"),oldUrl=text(first,"url"),oldPlatform=text(first,"platformName");
        first.put("url","https://configured.example.test/login");first.put("enabled",false);
        configs.save(operator,"platform-sites",doc);
        var catalog=context.getBean(PlatformCatalog.class);
        assertFalse(json(catalog.list()).contains(siteId));
        var previous=Map.<String,Object>of("platformSiteId",siteId,"platform",oldPlatform,"startUrl",oldUrl);
        var edit=new HashMap<String,Object>(previous);catalog.applySelection(edit,previous);assertEquals(oldUrl,edit.get("startUrl"));
        status(400,()->catalog.applySelection(new HashMap<>(previous),null));
        var remove=edit("platform-sites");entries(remove).remove(0);status(400,()->configs.save(operator,"platform-sites",remove));
        var changeId=edit("platform-sites");entries(changeId).get(0).put("id","forged-existing-id");status(400,()->configs.save(operator,"platform-sites",changeId));
        var badUrl=edit("platform-sites");entries(badUrl).get(0).put("url","javascript:alert(1)");status(400,()->configs.save(operator,"platform-sites",badUrl));
        var add=edit("platform-sites");entries(add).add(Map.of("id","","categoryName","测试平台","platformName","测试","siteName","全球","url","https://example.test","enabled",true,"sortOrder",10000));
        var saved=configs.save(operator,"platform-sites",add);assertTrue(entries(saved).stream().anyMatch(e->text(e,"url").equals("https://example.test")&&!text(e,"id").isBlank()));
    }
    @Test void auditFailureRollsBackConfigurationAndRevisionTogether() {
        var before=edit("languages");long global=number(configs.client(),"revision");
        jdbc.execute("ALTER TABLE config_audit ADD CONSTRAINT reject_language CHECK (config_key <> 'languages')");
        var request=object(json(before));entries(request).get(0).put("label","必须回滚");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->configs.save(operator,"languages",request));
        assertEquals(json(before),json(configs.get(operator,"languages")));assertEquals(global,number(configs.client(),"revision"));assertEquals(0,number(configs.audit(operator,1,20),"total"));
    }
    @Test void concurrentWritersCannotOverwriteEachOther() throws Exception {
        var first=edit("languages");var second=edit("languages");entries(first).get(0).put("label","writer one");entries(second).get(0).put("label","writer two");
        ExecutorService executor=Executors.newFixedThreadPool(2);CountDownLatch start=new CountDownLatch(1);
        try {
            Callable<Integer> a=()->{start.await();try {configs.save(operator,"languages",first);return 200;}catch(BusinessException e){return e.status;}};
            Callable<Integer> b=()->{start.await();try {configs.save(operator,"languages",second);return 200;}catch(BusinessException e){return e.status;}};
            var fa=executor.submit(a);var fb=executor.submit(b);start.countDown();assertEquals(Set.of(200,409),Set.of(fa.get(15,TimeUnit.SECONDS),fb.get(15,TimeUnit.SECONDS)));
            assertEquals(1,number(configs.audit(operator,1,20),"total"));
        } finally { executor.shutdownNow(); }
    }
    @Test void separateOperatorSessionsAreHashedRevocableAndBootstrapDoesNotResetPasswords() {
        var login=auth.login(Map.of("username","ops-admin","password",PASSWORD));String token=text(login,"token");
        assertEquals(operator,auth.authenticate(token));
        assertFalse(jdbc.queryForObject("SELECT token_hash FROM config_operator_session LIMIT 1",String.class).equals(token));
        auth.bootstrap("another-admin","Different-password-123");
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM config_operator",Integer.class));
        status(401,()->auth.login(Map.of("username","another-admin","password","Different-password-123")));
        status(401,()->auth.authenticate("ordinary-tenant-token"));status(403,()->configs.list(null));
        auth.logout(token);status(401,()->auth.authenticate(token));
        jdbc.update("UPDATE config_operator SET enabled=FALSE");status(403,()->configs.get(operator,"timezones"));
    }
    @Test void absentOrWeakBootstrapCredentialsCannotCreateAnOperator() {
        jdbc.update("DELETE FROM config_operator_session");jdbc.update("DELETE FROM config_operator");
        auth.bootstrap("","");assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM config_operator",Integer.class));
        status(401,()->auth.login(Map.of("username","ops-admin","password",PASSWORD)));
        status(400,()->auth.bootstrap("ops-admin","short1!"));
        status(400,()->auth.bootstrap("ops-admin","PasswordWithoutDigits!"));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM config_operator",Integer.class));
        assertFalse(((List<?>)configs.client().get("timezones")).isEmpty());
        auth.bootstrap("ops-admin",PASSWORD);assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM config_operator",Integer.class));
    }
}
