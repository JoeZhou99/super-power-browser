package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import static org.junit.jupiter.api.Assertions.*;

/** Real migrations, SQL constraints and Spring transaction boundaries; no external services. */
class ProxyServiceTest {
    @Configuration @EnableTransactionManagement(proxyTargetClass=true) static class Transactions {}
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private HikariDataSource source;
    private ProxyService proxies;
    private DeviceService devices;
    private final Actor owner=new Actor("owner","tenant","owner",true,Set.of("device.view","device.edit"));
    private final Actor member=new Actor("member","tenant","member",false,Set.of("device.view","device.edit"));
    private final Actor outsider=new Actor("other","other-tenant","other",true,Set.of("device.view","device.edit"));

    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE");source.setMaximumPoolSize(3);
        Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
        jdbc=new JdbcTemplate(source);
        context=new AnnotationConfigApplicationContext();context.register(Transactions.class);
        context.registerBean(DataSourceTransactionManager.class,()->new DataSourceTransactionManager(source));
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var sessionFactory=factory.getObject();sessionFactory.getConfiguration().addMapper(Db.class);
        var sessions=new SqlSessionTemplate(sessionFactory);
        context.registerBean(Db.class,()->sessions.getMapper(Db.class));
        context.registerBean(SecretCipher.class,()->new SecretCipher(Base64.getEncoder().encodeToString(new byte[32])));
        context.register(DeviceRepository.class,DeviceService.class,ProxyService.class);context.refresh();
        proxies=context.getBean(ProxyService.class);devices=context.getBean(DeviceService.class);
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','test'),('other-tenant','other')");
        for(String id:List.of("owner","member"))jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES(?,'tenant',?,'test',?)",id,id,id);
    }
    @AfterEach void close(){if(context!=null)context.close();if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");if(source!=null)source.close();}
    private Map<String,Object> proxy(String user){
        return new HashMap<>(Map.of("name","Gateway "+user,"protocol","socks5","host","Gateway.Example.COM.","port",1080,"username",user,"password","dummy-password","webType",1,"provider","Example","changeIpUrl","https://example.com/rotate?token=dummy-secret"));
    }
    private long total(){return ((Number)proxies.list(owner,0,"","",1,20,false).get("total")).longValue();}
    private void status(int expected,Runnable action){assertEquals(expected,assertThrows(BusinessException.class,action::run).status);}

    @Test void preservesExistingBindingsAndEncryptsSecrets(){
        String id=devices.save(owner,null,proxy("session-one"));
        jdbc.update("INSERT INTO environment(id,tenant_id,owner_id,name,start_url,device_id,fingerprint_seed,fingerprint) VALUES('env','tenant','member','shop','https://example.com',?,'seed','{}')",id);
        proxies.save(owner,id,Map.of("provider","Supplier","changeIpUrl","https://example.com/rotate?token=secret"));
        var publicRow=proxies.get(owner,id);assertEquals("Supplier",publicRow.get("provider"));assertEquals(true,publicRow.get("hasChangeIpUrl"));assertEquals(1L,((Number)publicRow.get("boundCount")).longValue());
        assertFalse(publicRow.containsKey("password"));assertFalse(publicRow.containsKey("changeIpUrl"));
        var listItem=((List<?>)proxies.list(owner,0,"","",1,20,false).get("items")).get(0);assertFalse(listItem.toString().contains("dummy-password"));assertFalse(listItem.toString().contains("token=secret"));
        var raw=jdbc.queryForMap("SELECT password,change_ip_url FROM device WHERE id=?",id);assertFalse(raw.toString().contains("dummy-password"));assertFalse(raw.toString().contains("token=secret"));
        assertEquals("dummy-password",proxies.connection(owner,id).get("password"));assertEquals("https://example.com/rotate?token=secret",proxies.connection(owner,id).get("changeIpUrl"));
        assertEquals(id,devices.launchProxy(member,id).get("id"));assertEquals(id,proxies.get(member,id).get("id"));
        proxies.save(owner,id,Map.of("name","Renamed"));assertEquals("dummy-password",proxies.connection(owner,id).get("password"));assertEquals(true,proxies.get(owner,id).get("hasChangeIpUrl"));
        proxies.save(owner,id,Map.of("changeIpUrl","","password",""));assertEquals(false,proxies.get(owner,id).get("hasChangeIpUrl"));assertEquals("",proxies.connection(owner,id).get("password"));
        status(409,()->proxies.recycle(owner,id,true,false));
    }
    @Test void filtersOwnProxiesAndEnforcesResourceAndActionPermissions(){
        String id=proxies.save(owner,null,proxy("owner-only"));
        status(404,()->proxies.get(member,id));status(404,()->proxies.get(outsider,id));status(404,()->proxies.save(outsider,id,Map.of("name","overwrite")));
        var reader=new Actor("owner","tenant","owner",true,Set.of("device.view"));status(403,()->proxies.connection(reader,id));status(403,()->proxies.save(reader,null,proxy("no")));
        jdbc.update("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port) VALUES('paid','tenant','owner','paid',1,'http','example.com',8080)");
        assertEquals(1,total());status(404,()->proxies.get(owner,"paid"));status(404,()->proxies.save(owner,"paid",Map.of("name","wrong")));status(404,()->proxies.recycle(owner,"paid",true,false));
        assertEquals(1L,proxies.list(owner,1,"socks5","Example",1,20,false).get("total"));assertEquals(0L,proxies.list(owner,2,"","",1,20,false).get("total"));
        status(400,()->proxies.list(owner,0,"","",1,201,false));
    }
    @Test void editCredentialsAreScopedAndAvailableForExpiredProxies(){
        String id=proxies.save(owner,null,proxy("saved-account"));
        var credentials=proxies.credentials(owner,id);
        assertEquals(Set.of("username","password"),credentials.keySet());
        assertEquals("saved-account",credentials.get("username"));assertEquals("dummy-password",credentials.get("password"));
        var reader=new Actor("owner","tenant","owner",true,Set.of("device.view"));
        status(403,()->proxies.credentials(reader,id));status(404,()->proxies.credentials(member,id));status(404,()->proxies.credentials(outsider,id));
        jdbc.update("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port) VALUES('paid','tenant','owner','paid',1,'http','example.com',8080)");
        status(404,()->proxies.credentials(owner,"paid"));
        proxies.save(owner,id,Map.of("expiresAt","2000-01-01T00:00:00Z"));
        assertEquals(credentials,proxies.credentials(owner,id));status(409,()->proxies.connection(owner,id));
        proxies.recycle(owner,id,true,false);status(409,()->proxies.credentials(owner,id));
        proxies.recycle(owner,id,false,false);assertEquals(credentials,proxies.credentials(owner,id));
    }
    @Test void importsDistinctSessionsAndRollsBackEntireInvalidBatch(){
        var ids=proxies.importAll(owner,List.of(proxy("session-one"),proxy("session-two"),proxy("session-one")));assertEquals(3,new HashSet<>(ids).size());assertEquals(3,total());
        var bad=proxy("bad");bad.put("port",0);
        status(400,()->proxies.importAll(owner,List.of(proxy("rolled-back"),bad)));assertEquals(3,total());
        status(400,()->proxies.importAll(owner,Collections.nCopies(501,proxy("large"))));assertEquals(3,total());
        assertEquals("gateway.example.com",proxies.get(owner,ids.get(0)).get("host"));
    }
    @Test void checksHaveServerTimestampsAndConnectionChangesInvalidateThem(){
        String id=proxies.save(owner,null,proxy("one"));
        var checked=proxies.checkResult(owner,id,Map.of("connected",true,"ip","203.0.113.4","countryName","测试地区","latencyMs",42,"message","连接成功","checkedAt","1900-01-01T00:00:00Z"));
        assertEquals(true,checked.get("checkConnected"));assertEquals("203.0.113.4",checked.get("checkIp"));assertNotNull(checked.get("checkedAt"));assertFalse(checked.get("checkedAt").toString().startsWith("1900"));
        proxies.save(owner,id,Map.of("remark","note"));assertEquals(true,proxies.get(owner,id).get("checkConnected"));
        proxies.save(owner,id,Map.of("username","new-session"));assertNull(proxies.get(owner,id).get("checkedAt"));
        status(400,()->proxies.checkResult(owner,id,Map.of("connected",true,"ip","example.com")));status(400,()->proxies.checkResult(owner,id,Map.of("connected",true,"ip","203.0.113.4","latencyMs",-1)));
    }
    @Test void validatesSshAddressesExpiryAndRecycleLifecycle(){
        var config=proxy("ssh-user");config.put("protocol","ssh");config.put("host","[2001:db8::1]");config.put("port",22);config.put("expiresAt","2099-01-01T00:00:00Z");
        String id=proxies.save(owner,null,config);assertEquals("ssh",devices.launchProxy(owner,id).get("protocol"));assertEquals(2L,((Number)proxies.get(owner,id).get("protocolFamily")).longValue());
        assertEquals("2099-01-01T00:00:00Z",proxies.get(owner,id).get("expiresAt"));
        status(400,()->proxies.save(owner,id,Map.of("expiresAt","2026-11-09")));status(400,()->proxies.save(owner,id,Map.of("host","a/b")));status(400,()->proxies.save(owner,id,Map.of("changeIpUrl","file:///tmp/secret")));
        status(400,()->proxies.save(owner,id,Map.of("username","")));
        jdbc.update("UPDATE device SET auto_renew=TRUE,auto_renew_user_id='owner' WHERE id=?",id);
        status(409,()->proxies.recycle(owner,id,true,true));proxies.recycle(owner,id,true,false);assertEquals(0,total());status(409,()->proxies.connection(owner,id));
        assertEquals(false,jdbc.queryForObject("SELECT auto_renew FROM device WHERE id=?",Boolean.class,id));assertEquals("owner",jdbc.queryForObject("SELECT auto_renew_user_id FROM device WHERE id=?",String.class,id));
        proxies.recycle(owner,id,false,false);assertEquals(1,total());proxies.recycle(owner,id,true,false);proxies.recycle(owner,id,true,true);status(404,()->proxies.get(owner,id));
    }
    @Test void upgradingExistingDevicesPreservesIdsBindingsAndDefaultMetadata(){
        jdbc.execute("DROP ALL OBJECTS");
        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("17").load().migrate();
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','legacy')");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES('owner','tenant','owner','test','test')");
        jdbc.update("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port) VALUES('legacy-device','tenant','owner','Existing',2,'http','example.com',8080)");
        jdbc.update("INSERT INTO environment(id,tenant_id,owner_id,name,start_url,device_id,fingerprint_seed,fingerprint) VALUES('legacy-env','tenant','owner','shop','https://example.com','legacy-device','seed','{}')");
        Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
        var existing=proxies.get(owner,"legacy-device");assertEquals("",existing.get("provider"));assertEquals(false,existing.get("hasChangeIpUrl"));assertNull(existing.get("checkedAt"));assertEquals(1L,((Number)existing.get("boundCount")).longValue());
        assertEquals("legacy-device",devices.launchProxy(owner,"legacy-device").get("id"));assertEquals(1,total());
    }
}
