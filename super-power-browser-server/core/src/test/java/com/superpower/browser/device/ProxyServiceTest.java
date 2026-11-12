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
    private final Actor owner=new Actor("owner","tenant","owner",true,Set.of("proxy.view","proxy.edit"));
    private final Actor member=new Actor("member","tenant","member",false,Set.of("proxy.view","proxy.edit"));
    private final Actor outsider=new Actor("other","other-tenant","other",true,Set.of("proxy.view","proxy.edit"));

    private static void createRelayFixture(JdbcTemplate db,SecretCipher secrets) {
        db.update("INSERT INTO relay_pool(id,code,name,candidate_limit) VALUES('pool','pool','Shared pool',4)");
        db.update("INSERT INTO relay_pool_tenant(pool_id,tenant_id) VALUES('pool','tenant')");
        for(int i=0;i<2;i++)db.update("INSERT INTO relay_node(id,pool_id,name,region,protocol,host,port,username,password,proxy_options,sort_order) VALUES(?,'pool',?,'test','socks5',?,1080,'relay-user',?,'{}',?)",
            "node-"+i,"Route "+i,"relay-"+i+".example.com",secrets.encrypt("relay-secret-"+i),i);
    }

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
        context.register(DeviceRepository.class,DeviceService.class,DeviceImportService.class,RelayPoolService.class,ProxyService.class);context.refresh();
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
        var reader=new Actor("owner","tenant","owner",true,Set.of("proxy.view"));status(403,()->proxies.connection(reader,id));status(403,()->proxies.save(reader,null,proxy("no")));
        jdbc.update("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port) VALUES('paid','tenant','owner','paid',1,'http','example.com',8080)");
        assertEquals(1,total());status(404,()->proxies.get(owner,"paid"));status(404,()->proxies.save(owner,"paid",Map.of("name","wrong")));status(404,()->proxies.recycle(owner,"paid",true,false));
        assertEquals(1L,proxies.list(owner,1,"socks5","Example",1,20,false).get("total"));assertEquals(0L,proxies.list(owner,2,"","",1,20,false).get("total"));
        status(400,()->proxies.list(owner,0,"","",1,201,false));
    }
    @Test void proxyAndPlatformPermissionsStaySeparateAcrossLegacyDeviceEndpoints(){
        String id=proxies.save(owner,null,proxy("owned-proxy"));
        var platform=new Actor("owner","tenant","owner",true,Set.of("device.view","device.edit","device.export"));
        for(int type:List.of(1,20))jdbc.update("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port) VALUES(?,'tenant','owner','paid',?,'http','example.com',8080)","paid-"+type,type);

        status(403,()->proxies.list(platform,0,"","",1,20,false));status(403,()->proxies.get(platform,id));
        status(403,()->devices.list(platform,2,"allIp","",1,20,false));status(403,()->devices.get(platform,id));
        status(403,()->devices.connection(platform,id));status(403,()->devices.save(platform,id,proxy("overwrite")));
        status(403,()->devices.save(platform,null,proxy("create")));status(403,()->devices.recycle(platform,id,true,false));
        status(403,()->devices.export(platform,2,"allIp","",1,false));status(403,()->devices.requireBindable(platform,id));
        status(403,()->devices.importDevices(platform,List.of(proxy("import"))));
        status(403,()->context.getBean(DeviceImportService.class).importBatch(platform,List.of(proxy("import"))));

        assertEquals(id,devices.get(owner,id).get("id"));assertEquals("dummy-password",devices.connection(owner,id).get("password"));
        assertEquals(1L,devices.list(owner,2,"allIp","",1,20,false).get("total"));
        assertDoesNotThrow(()->devices.requireBindable(owner,id));
        for(int type:List.of(1,20)){
            String paid="paid-"+type;
            assertEquals(paid,devices.get(platform,paid).get("id"));assertEquals(paid,devices.connection(platform,paid).get("id"));
            assertEquals(1L,devices.export(platform,type,"allIp","",1,false).get("total"));
            assertEquals(paid,devices.save(platform,paid,Map.of("name","renamed")));
            status(403,()->devices.get(owner,paid));status(403,()->devices.connection(owner,paid));
            status(403,()->devices.save(owner,paid,Map.of("name","overwrite")));status(403,()->devices.requireBindable(owner,paid));
            status(403,()->devices.list(owner,type,"allIp","",1,20,false));status(403,()->devices.export(owner,type,"allIp","",1,false));
        }
        var reader=new Actor("owner","tenant","owner",true,Set.of("proxy.view","device.edit","device.export"));
        assertEquals(id,devices.get(reader,id).get("id"));
        status(403,()->proxies.credentials(reader,id));status(403,()->devices.connection(reader,id));
        status(403,()->proxies.checkResult(reader,id,Map.of("connected",false)));status(403,()->devices.export(reader,2,"allIp","",1,false));
        var exporter=new Actor("owner","tenant","owner",true,Set.of("proxy.view","proxy.export"));
        assertEquals(1L,devices.export(exporter,2,"allIp","",1,false).get("total"));
        assertDoesNotThrow(()->context.getBean(RelayPoolService.class).available(owner));
        assertDoesNotThrow(()->context.getBean(RelayPoolService.class).available(platform));
    }
    @Test void exportChecksDedicatedPermissionsAndPreservesFiltersRecycleAndResourceScope(){
        String id=proxies.save(owner,null,proxy("matching"));
        var other=proxy("different");other.put("webType",2);proxies.save(owner,null,other);
        var exporter=new Actor("owner","tenant","owner",true,Set.of("proxy.view","proxy.export"));
        assertEquals(1L,proxies.export(exporter,1,"socks5","matching",1,false).get("total"));
        assertEquals(0L,proxies.export(exporter,1,"http","matching",1,false).get("total"));
        assertEquals(1L,devices.export(exporter,2,"allIp","matching",1,false).get("total"));
        status(403,()->proxies.export(owner,0,"","",1,false));
        var noView=new Actor("owner","tenant","owner",true,Set.of("proxy.export"));
        status(403,()->proxies.export(noView,0,"","",1,false));status(403,()->devices.export(noView,2,"allIp","",1,false));
        var memberExporter=new Actor("member","tenant","member",false,Set.of("proxy.view","proxy.export"));
        assertEquals(0L,proxies.export(memberExporter,0,"","",1,false).get("total"));
        proxies.recycle(owner,id,true,false);
        assertEquals(0L,proxies.export(exporter,1,"socks5","matching",1,false).get("total"));
        assertEquals(1L,proxies.export(exporter,1,"socks5","matching",1,true).get("total"));
        assertEquals(1L,devices.export(exporter,2,"allIp","matching",1,true).get("total"));
        assertEquals(0L,devices.export(exporter,2,"autoRenew","matching",1,true).get("total"));
        assertFalse(proxies.export(exporter,1,"socks5","matching",1,true).toString().contains("dummy-password"));
    }
    @Test void departmentRolesScopeProxyCredentialsAndRejectDepartedCreators(){
        jdbc.update("INSERT INTO department(id,tenant_id,name) VALUES('a','tenant','A'),('b','tenant','B')");
        jdbc.update("UPDATE app_user SET department_id='a' WHERE id='member'");
        jdbc.update("UPDATE app_user SET department_id='b' WHERE id='owner'");
        String id=proxies.save(owner,null,proxy("department-b"));
        Actor admin=new Actor("member","tenant","member",false,Set.of("proxy.view","proxy.edit"),2,"a");
        Actor superAdmin=new Actor("member","tenant","member",false,Set.of("proxy.view","proxy.edit"),3,"a");
        status(404,()->proxies.credentials(admin,id));
        assertEquals("dummy-password",proxies.credentials(superAdmin,id).get("password"));
        jdbc.update("UPDATE app_user SET department_id='a' WHERE id='owner'");
        assertEquals("dummy-password",proxies.credentials(admin,id).get("password"));
        jdbc.update("UPDATE app_user SET enabled=FALSE,deleted=TRUE WHERE id='member'");
        status(401,()->proxies.save(admin,null,proxy("late-created")));
    }
    @Test void editCredentialsAreScopedAndAvailableForExpiredProxies(){
        String id=proxies.save(owner,null,proxy("saved-account"));
        var credentials=proxies.credentials(owner,id);
        assertEquals(Set.of("username","password","proxyOptions"),credentials.keySet());
        assertEquals("saved-account",credentials.get("username"));assertEquals("dummy-password",credentials.get("password"));
        var reader=new Actor("owner","tenant","owner",true,Set.of("proxy.view"));
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
        assertEquals(Map.of(),devices.launchProxy(owner,"legacy-device").get("proxyOptions"));
    }

    @Test void keepsProtocolSecretsButRetiresEncryptedLegacyRoutingOnReadAndSave(){
        var config=proxy("transport-user");config.put("protocol","vless");
        var vless=new LinkedHashMap<String,Object>(Map.of("id","bd090a41-2f4f-48e9-95c5-57b4c684ccfe","security","reality","flow","xtls-rprx-vision","network","tcp","serverName","cover.example.com","fingerprint","chrome","publicKey","A".repeat(43),"shortId","1234"));
        config.put("proxyOptions",Map.of("vlessUser",vless));String id=proxies.save(owner,null,config);
        var cipher=context.getBean(SecretCipher.class);
        var legacy=new LinkedHashMap<String,Object>(Map.of("vlessUser",vless,"transit",Map.of("password","retired-secret"),"alternatives",List.of(Map.of("password","retired-secret")),"resourceProxy",Map.of("password","retired-secret"),"routing",Map.of("directDomains",List.of("example.com"))));
        jdbc.update("UPDATE device SET proxy_options=? WHERE id=?",cipher.encryptPayload(com.superpower.browser.shared.Data.json(legacy)),id);
        assertEquals(Map.of("vlessUser",vless),proxies.credentials(owner,id).get("proxyOptions"));
        assertEquals(Map.of("vlessUser",vless),devices.launchProxy(owner,id).get("proxyOptions"));
        assertFalse(proxies.get(owner,id).containsKey("proxyOptions"));
        proxies.save(owner,id,Map.of("remark","preserve protocol"));
        String stored=jdbc.queryForObject("SELECT proxy_options FROM device WHERE id=?",String.class,id);
        assertFalse(stored.contains("bd090a41"));assertFalse(cipher.decrypt(stored).contains("retired-secret"));
        assertEquals(Map.of("vlessUser",vless),proxies.connection(owner,id).get("proxyOptions"));
        status(403,()->proxies.credentials(new Actor("owner","tenant","owner",true,Set.of("proxy.view")),id));
        status(404,()->proxies.credentials(outsider,id));
        for(String key:List.of("transit","alternatives","resourceProxy","routing"))status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("vlessUser",vless,key,Map.of()))));
    }

    @Test void importsLegacySsAndSsrColumnsAndInvalidatesChecksForOptionChanges(){
        var config=proxy("ss-user");config.put("protocol","ss");config.put("region","test");config.put("encryption","aes-128-gcm");
        String id=devices.importOwnRow(owner,config);
        assertEquals(Map.of("encryption","aes-128-gcm"),devices.launchProxy(owner,id).get("proxyOptions"));
        proxies.checkResult(owner,id,Map.of("connected",true,"ip","203.0.113.1","message","ok"));
        config.put("id",id);config.put("password","");config.put("encryption","aes-256-gcm");devices.importOwnRow(owner,config);
        assertEquals("dummy-password",proxies.credentials(owner,id).get("password"));assertNull(proxies.get(owner,id).get("checkedAt"));
        config.put("protocol","ssr");config.put("transportProtocol","auth_sha1_v4");config.put("obfs","tls1.2_ticket_auth");config.put("protocolParameter","param");config.put("obfsParameter","example.com");
        devices.importOwnRow(owner,config);
        assertEquals("auth_sha1_v4",((Map<?,?>)devices.launchProxy(owner,id).get("proxyOptions")).get("transportProtocol"));
        proxies.checkResult(owner,id,Map.of("connected",true,"ip","203.0.113.1","message","ok"));
        proxies.save(owner,id,Map.of("name","rename"));assertNotNull(proxies.get(owner,id).get("checkedAt"));
        proxies.save(owner,id,Map.of("proxyOptions",Map.of("encryption","aes-256-gcm","transportProtocol","origin","obfs","plain")));assertNull(proxies.get(owner,id).get("checkedAt"));
        proxies.save(owner,id,Map.of("protocol","http","proxyOptions",Map.of()));assertEquals(Map.of(),proxies.credentials(owner,id).get("proxyOptions"));
    }

    @Test @SuppressWarnings("unchecked") void enterpriseGrantAutomaticallyComposesSameExitAndNeverExposesCredentialsInListings() {
        createRelayFixture(jdbc,context.getBean(SecretCipher.class));
        var pools=context.getBean(RelayPoolService.class);
        assertEquals(1,((List<?>)pools.available(owner).get("items")).size());
        assertEquals(0,((List<?>)pools.available(outsider).get("items")).size());
        assertFalse(pools.available(owner).toString().contains("relay-secret"));
        status(403,()->pools.available(new Actor("owner","tenant","owner",true,Set.of())));
        var config=proxy("fixed-exit");config.put("webType",2);String id=proxies.save(owner,null,config);
        assertFalse(proxies.get(owner,id).containsKey("relayPoolId"));
        assertEquals("auto",((Map<?,?>)proxies.get(owner,id).get("acceleration")).get("status"));
        assertEquals(Map.of(),proxies.credentials(owner,id).get("proxyOptions"));
        var connection=devices.launchProxy(owner,id);var options=(Map<String,Object>)connection.get("proxyOptions");
        assertEquals("relay-0.example.com",((Map<?,?>)options.get("transit")).get("host"));
        assertEquals("relay-secret-0",((Map<?,?>)options.get("transit")).get("password"));
        var alternatives=(List<Map<String,Object>>)options.get("alternatives");assertEquals(1,alternatives.size());
        for(String key:List.of("protocol","host","port","username","password"))assertEquals(connection.get(key),alternatives.get(0).get(key));
        var meta=(Map<String,Object>)connection.get("relayPool");assertEquals(true,meta.get("automatic"));
        assertEquals(2,((List<?>)meta.get("candidates")).size());
        assertFalse(proxies.list(owner,0,"","",1,20,false).toString().contains("relay-secret"));
        status(404,()->devices.launchProxy(outsider,id));
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES('other','other-tenant','other','test','other')");
        var other=proxy("other");other.put("webType",2);String otherId=proxies.save(outsider,null,other);
        assertFalse(devices.launchProxy(outsider,otherId).containsKey("relayPool"));
        assertEquals("direct",((Map<?,?>)proxies.get(outsider,otherId).get("acceleration")).get("status"));
        // Ordinary proxy edits never create, clear or replace enterprise authorization.
        proxies.checkResult(owner,id,Map.of("connected",true,"ip","203.0.113.2","message","ok"));
        proxies.save(owner,id,Map.of("name","rename"));assertNotNull(proxies.get(owner,id).get("checkedAt"));
        assertTrue(devices.launchProxy(owner,id).containsKey("relayPool"));
        assertEquals("Shared pool",((List<Map<String,Object>>)meta.get("candidates")).get(0).get("poolName"));
    }

    @Test void unavailableGrantsFailClosedButExpiredOrAbsentGrantsLeaveTheExitDirect() {
        createRelayFixture(jdbc,context.getBean(SecretCipher.class));
        var config=proxy("fixed-exit");config.put("webType",2);String id=proxies.save(owner,null,config);
        jdbc.update("UPDATE relay_pool SET enabled=FALSE WHERE id='pool'");
        proxies.save(owner,id,Map.of("name","renamed"));
        assertEquals("unavailable",((Map<?,?>)proxies.get(owner,id).get("acceleration")).get("status"));
        status(409,()->devices.launchProxy(owner,id));status(409,()->proxies.connection(owner,id));
        jdbc.update("UPDATE relay_pool SET enabled=TRUE WHERE id='pool'");jdbc.update("UPDATE relay_node SET enabled=FALSE");
        status(409,()->devices.launchProxy(owner,id));
        jdbc.update("UPDATE relay_node SET enabled=TRUE");jdbc.update("UPDATE relay_pool_tenant SET expires_at='2000-01-01 00:00:00'");
        assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
        jdbc.update("UPDATE relay_pool_tenant SET expires_at=NULL,enabled=FALSE");assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
        jdbc.update("UPDATE relay_pool_tenant SET enabled=TRUE");
        assertTrue(devices.launchProxy(owner,id).containsKey("relayPool"));
        jdbc.update("DELETE FROM relay_pool_tenant");assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
    }

    @Test @SuppressWarnings("unchecked") void multiplePoolsUseFairDeterministicCandidatesAndKeepEachExitField() {
        var cipher=context.getBean(SecretCipher.class);createRelayFixture(jdbc,cipher);
        jdbc.update("INSERT INTO relay_pool(id,code,name,candidate_limit,revision) VALUES('z-pool','z-pool','Second group',1,7)");
        jdbc.update("INSERT INTO relay_pool_tenant(pool_id,tenant_id) VALUES('z-pool','tenant')");
        for(int i=0;i<3;i++)jdbc.update("INSERT INTO relay_node(id,pool_id,name,region,protocol,host,port,username,password,proxy_options,sort_order) VALUES(?,'z-pool',?,'test','http',?,8080,'user',?,'{}',?)","z-"+i,"Second "+i,"second-"+i+".example.test",cipher.encrypt("synthetic-secret"),i);
        var input=proxy("static");input.put("webType",2);String id=proxies.save(owner,null,input);
        var route=devices.launchProxy(owner,id);var meta=(Map<String,Object>)route.get("relayPool");
        var choices=(List<Map<String,Object>>)meta.get("candidates");
        assertEquals(List.of("node-0","z-0","node-1"),choices.stream().map(node->node.get("id")).toList());
        assertEquals(List.of("pool","z-pool","pool"),choices.stream().map(node->node.get("poolId")).toList());
        assertEquals("automatic",meta.get("id"));assertEquals(8L,meta.get("revision"));
        var alternatives=(List<Map<String,Object>>)((Map<?,?>)route.get("proxyOptions")).get("alternatives");
        for(var candidate:alternatives)for(String key:List.of("protocol","host","port","username","password"))assertEquals(route.get(key),candidate.get(key));
        jdbc.update("UPDATE relay_pool SET candidate_limit=4 WHERE id='z-pool'");
        meta=(Map<String,Object>)devices.launchProxy(owner,id).get("relayPool");choices=(List<Map<String,Object>>)meta.get("candidates");
        assertEquals(List.of("node-0","z-0","node-1","z-1"),choices.stream().map(node->node.get("id")).toList());
        jdbc.update("UPDATE relay_pool SET enabled=FALSE WHERE id='pool'");
        meta=(Map<String,Object>)devices.launchProxy(owner,id).get("relayPool");assertEquals("z-pool",meta.get("id"));
        jdbc.update("DELETE FROM relay_node WHERE pool_id='z-pool'");status(409,()->devices.launchProxy(owner,id));
    }

    @Test void accelerationOnlyAppliesToSupportedActiveStaticOwnedExits() {
        createRelayFixture(jdbc,context.getBean(SecretCipher.class));
        String uuid="bd090a41-2f4f-48e9-95c5-57b4c684ccfe";
        for(String protocol:List.of("http","https","socks5","ss","vmess","vless")) {
            var input=proxy(protocol);input.put("webType",2);input.put("protocol",protocol);
            if(protocol.equals("ss"))input.put("proxyOptions",Map.of("encryption","aes-128-gcm"));
            if(protocol.equals("vmess"))input.put("proxyOptions",Map.of("vmessUser",Map.of("id",uuid)));
            if(protocol.equals("vless"))input.put("proxyOptions",Map.of("vlessUser",Map.of("id",uuid,"security","none")));
            String id=proxies.save(owner,null,input);assertTrue(devices.launchProxy(owner,id).containsKey("relayPool"),protocol);
        }
        var input=proxy("dynamic");String id=proxies.save(owner,null,input);
        assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
        assertEquals("unsupported",((Map<?,?>)proxies.get(owner,id).get("acceleration")).get("status"));
        proxies.save(owner,id,Map.of("webType",2,"protocol","ssh"));assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
        proxies.save(owner,id,Map.of("protocol","socks4","password",""));assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
        proxies.save(owner,id,Map.of("protocol","http"));jdbc.update("UPDATE device SET ip_type=1 WHERE id=?",id);
        assertFalse(devices.launchProxy(owner,id).containsKey("relayPool"));
        jdbc.update("UPDATE device SET ip_type=2,expires_at='2000-01-01 00:00:00' WHERE id=?",id);
        assertEquals("inactive",((Map<?,?>)proxies.get(owner,id).get("acceleration")).get("status"));status(409,()->devices.launchProxy(owner,id));
        jdbc.update("UPDATE device SET expires_at=NULL,recycled=TRUE WHERE id=?",id);status(409,()->devices.launchProxy(owner,id));
        assertEquals("inactive",((Map<?,?>)proxies.get(owner,id).get("acceleration")).get("status"));
    }

    @Test void rejectsRetiredManualBindingsIncludingNullAndImports() {
        var input=proxy("manual");input.put("relayPoolId","pool");status(400,()->proxies.save(owner,null,input));
        input.put("relayPoolId",null);status(400,()->proxies.save(owner,null,input));status(400,()->devices.save(owner,null,input));
        input.put("region","test");
        var imported=context.getBean(DeviceImportService.class).importBatch(owner,List.of(input));
        assertEquals(0,imported.get("successCount"));assertEquals(1,imported.get("errorCount"));
        String id=proxies.save(owner,null,proxy("valid"));var patch=new HashMap<String,Object>();patch.put("relayPoolId",null);
        status(400,()->proxies.save(owner,id,patch));status(400,()->devices.save(owner,id,patch));
        proxies.save(owner,id,Map.of("name","normal edit"));assertFalse(proxies.get(owner,id).containsKey("relayPoolId"));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_name='device' AND column_name='relay_pool_id'",Integer.class));
    }

    @Test void validatesVmessAndRejectsArbitraryXrayJsonMalformedChainsAndMissingCredentials(){
        var config=proxy("vmess-user");config.put("protocol","vmess");
        var vmess=Map.<String,Object>of("id","bd090a41-2f4f-48e9-95c5-57b4c684ccfe","alterId",0,"security","auto","securityTls",true,"network","ws","host","cdn.example.com","path","/ws");
        config.put("proxyOptions",Map.of("vmessUser",vmess,"tls",Map.of("serverName","cdn.example.com","allowInsecure",false)));
        String id=proxies.save(owner,null,config);assertEquals(1L,proxies.list(owner,0,"vmess","",1,20,false).get("total"));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("outbounds",List.of(Map.of("protocol","freedom"))))));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("vmessUser",Map.of("id","invalid")))));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("vmessUser",vmess,"tls",Map.of("allowInsecure","true")))));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("vmessUser",vmess,"alternatives",Collections.nCopies(9,Map.of("protocol","http","host","backup.example.com","port",80))))));
        var nested=Map.<String,Object>of("protocol","http","host","relay.example.com","port",80);
        for(int depth=0;depth<3;depth++)nested=Map.of("protocol","http","host","relay.example.com","port",80,"proxyOptions",Map.of("transit",nested));
        var chain=nested;status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("vmessUser",vmess,"transit",chain))));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("vmessUser",vmess,"transit",Map.of("protocol","http","host","relay.example.com","port",80.5)))));
        status(400,()->proxies.save(owner,id,Map.of("protocol","ss","password","","proxyOptions",Map.of("encryption","aes-256-gcm"))));
        status(400,()->proxies.save(owner,id,Map.of("protocol","vless","proxyOptions",Map.of("vlessUser",Map.of("id",vmess.get("id"),"security","reality")))));
        assertEquals("vmess",proxies.get(owner,id).get("protocol"));assertEquals("tls",((Map<?,?>)((Map<?,?>)proxies.credentials(owner,id).get("proxyOptions")).get("vmessUser")).get("securityTls"));
    }

    @Test void acceptedOptionsRespectDesktopCompilerAuthenticationAndTransportBoundaries(){
        var config=proxy("compiler-contract");String id=proxies.save(owner,null,config);
        status(400,()->proxies.save(owner,id,Map.of("username","界".repeat(86))));
        status(400,()->proxies.save(owner,id,Map.of("protocol","socks4")));
        proxies.save(owner,id,Map.of("protocol","socks4a","password",""));assertEquals("socks4a",devices.launchProxy(owner,id).get("protocol"));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("transit",Map.of("protocol","http","host","relay.example.com","port",8080)))));
        var user=Map.of("id","bd090a41-2f4f-48e9-95c5-57b4c684ccfe");
        status(400,()->proxies.save(owner,id,Map.of("protocol","vless","proxyOptions",Map.of("vlessUser",user))));
        proxies.save(owner,id,Map.of("protocol","vless","proxyOptions",Map.of("vlessUser",Map.of("id",user.get("id"),"security","none"))));
        status(400,()->proxies.save(owner,id,Map.of("protocol","ss","password","ss-pass","proxyOptions",Map.of("encryption","aes-256-gcm","transportProtocol","origin"))));
        proxies.save(owner,id,Map.of("protocol","ss","password","ss-pass","proxyOptions",Map.of("encryption","aes-256-gcm","transportProtocol","tcp")));
        var options=Map.of("encryption","aes-256-gcm","transit",Map.of("protocol","ssh","host","relay.example.com","port",22,"username","user","password","pass"));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",options)));
        for(String protocol:List.of("socks4","socks4a"))status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("encryption","aes-256-gcm","transit",Map.of("protocol",protocol,"host","relay.example.com","port",1080)))));
        var relay=Map.of("protocol","http","host","relay.example.com","port",8080);
        var nested=Map.of("encryption","aes-256-gcm","transit",Map.of("protocol","http","host","relay.example.com","port",8080,"proxyOptions",Map.of("alternatives",List.of(relay))));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",nested)));
        status(400,()->proxies.save(owner,id,Map.of("proxyOptions",Map.of("encryption","aes-256-gcm","alternatives",List.of(Map.of("protocol","ssh","host","relay.example.com","port",22,"username","user","password","pass"))))));
        assertEquals("ss",devices.launchProxy(owner,id).get("protocol"));
    }
}
