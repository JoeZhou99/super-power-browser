package com.superpower.browser.environment;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.config.*;
import com.superpower.browser.device.*;
import com.superpower.browser.runtime.*;
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

/** Exercise real environment/device writes and launch reads against an isolated migrated database. */
class EnvironmentNetworkFingerprintTest {
    @Configuration @EnableTransactionManagement(proxyTargetClass=true) static class Transactions {}
    private HikariDataSource source;
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private EnvironmentService shops;
    private ProxyService proxies;
    private final Actor owner=new Actor("owner","tenant","owner",true,Set.of("shop.view","shop.create","shop.edit","shop.open","device.view","device.edit","proxy.view","proxy.edit"));

    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        Flyway.configure().dataSource(source).load().migrate();jdbc=new JdbcTemplate(source);
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var sessions=factory.getObject();sessions.getConfiguration().addMapper(Db.class);
        Db db=new SqlSessionTemplate(sessions).getMapper(Db.class);
        var cipher=new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        var transaction=new DataSourceTransactionManager(source);
        context=new AnnotationConfigApplicationContext();context.register(Transactions.class);
        context.registerBean(Db.class,()->db);context.registerBean(SecretCipher.class,()->cipher);
        context.registerBean(DataSourceTransactionManager.class,()->transaction);
        context.register(Class.forName("com.superpower.browser.device.DeviceRepository"),DeviceService.class,RelayPoolService.class,ProxyService.class,
            EnvironmentRepository.class,AuditRepository.class,PlatformCatalog.class,BrowserConfiguration.class,ConfigOperatorAuth.class);
        context.registerBean(KernelCatalog.class,()->new KernelCatalog(new KernelRepository(db),null,new KernelSettings(),context.getBean(AuditRepository.class),transaction));
        // Membership/grant operations and kernel downloads are outside this test; no network resources are used.
        context.registerBean(EnvironmentService.class,()->new EnvironmentService(context.getBean(EnvironmentRepository.class),null,
            context.getBean(DeviceService.class),context.getBean(AuditRepository.class),context.getBean(KernelCatalog.class),
            context.getBean(PlatformCatalog.class),context.getBean(BrowserConfiguration.class)));
        context.refresh();context.getBean(BrowserConfiguration.class).initialize();
        shops=context.getBean(EnvironmentService.class);proxies=context.getBean(ProxyService.class);
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','synthetic')");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES('owner','tenant','owner','synthetic','owner')");
        jdbc.update("INSERT INTO kernel_release(id,version,platform,arch,full_version,sha256,archive_bytes,descriptor,storage_type,storage_key,state) VALUES('test-kernel','144','win32','x64','144.0.0.0',?,1,'{}','LOCAL','unused','PUBLISHED')","0".repeat(64));
    }
    @AfterEach void close(){if(context!=null)context.close();if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");if(source!=null)source.close();}
    private Map<String,Object> fingerprint(String language,String mode,String timezone){
        return Map.of("language",language,"languageMode",mode,"timezone",timezone,"resolution","1920x1080","canvas","privacy","fontMetrics","privacy","webglFingerprint","privacy","os","Windows");
    }
    private String shop(Map<String,Object> fingerprint){
        return shops.save(owner,null,Map.of("name","synthetic shop","platform","test","startUrl","https://example.test","kernelVersion","144","fingerprint",fingerprint));
    }
    private String proxy(String host,int webType){
        return proxies.save(owner,null,Map.of("name",host,"host",host,"port",8080,"protocol","http","username","synthetic-user","password","synthetic-password","webType",webType));
    }
    private void unchanged(String id,String seed,String fingerprint){
        var stored=shops.get(owner,id,"shop.view");assertEquals(seed,stored.get("fingerprintSeed"));assertEquals(fingerprint,stored.get("fingerprint"));
    }

    @Test void rebindingUnbindingEditingAndRotatingProxyStateNeverRegenerateTheSavedFingerprint(){
        String first=proxy("first.example.test",2),second=proxy("dynamic.example.test",1);
        for(var fingerprint:List.of(fingerprint("de-DE","custom","Europe/Berlin"),fingerprint("auto","ip","auto"),fingerprint("en-US","custom","__local__"))){
            String id=shop(fingerprint);var initial=shops.get(owner,id,"shop.view");
            String seed=text(initial,"fingerprintSeed"),stored=text(initial,"fingerprint");assertDoesNotThrow(()->UUID.fromString(seed));
            shops.bind(owner,id,first);unchanged(id,seed,stored);assertEquals(2,number(shops.get(owner,id,"shop.view"),"configVersion"));
            var launched=shops.launch(owner,id);assertEquals(seed,launched.get("fingerprintSeed"));assertEquals(fingerprint,launched.get("fingerprint"));
            proxies.save(owner,first,Map.of("host","changed.example.test","port",9090,"username","another-session","password","changed-password","webType",1));
            unchanged(id,seed,stored);assertEquals(2,number(shops.get(owner,id,"shop.view"),"configVersion"));
            assertEquals("changed.example.test",((Map<?,?>)shops.launch(owner,id).get("proxy")).get("host"));
            proxies.checkResult(owner,first,Map.of("connected",true,"ip","203.0.113.10","countryName","Synthetic region","latencyMs",12));
            unchanged(id,seed,stored);
            shops.bind(owner,id,second);unchanged(id,seed,stored);assertEquals(3,number(shops.get(owner,id,"shop.view"),"configVersion"));
            assertEquals(second,((Map<?,?>)shops.launch(owner,id).get("proxy")).get("id"));
            shops.bind(owner,id,"");unchanged(id,seed,stored);assertEquals(4,number(shops.get(owner,id,"shop.view"),"configVersion"));
            assertEquals(409,assertThrows(BusinessException.class,()->shops.launch(owner,id)).status);
            shops.bind(owner,id,first);unchanged(id,seed,stored);assertEquals(fingerprint,shops.launch(owner,id).get("fingerprint"));
        }
    }
    @Test void copiedShopsReceiveIndependentSeedsWhileTheSourceKeepsItsLocaleAndSeed(){
        String id=shop(fingerprint("auto","ip","__local__"));var original=shops.get(owner,id,"shop.view");
        String copied=shops.copy(owner,id);var duplicate=shops.get(owner,copied,"shop.view");
        assertNotEquals(original.get("fingerprintSeed"),duplicate.get("fingerprintSeed"));assertEquals(original.get("fingerprint"),duplicate.get("fingerprint"));
        unchanged(id,text(original,"fingerprintSeed"),text(original,"fingerprint"));
    }
    @Test void malformedLocaleModesCannotOverwriteTheStoredFingerprint(){
        // Historical languageMode=ip with an explicit language remains accepted and unchanged.
        String id=shop(fingerprint("en-US","ip","__local__"));var original=shops.get(owner,id,"shop.view");
        for(var invalid:List.of(Map.of("languageMode","browser"),Map.of("timezone","local"),Map.of("language","__local__"))){
            var edited=new HashMap<>(original);var fp=object(text(original,"fingerprint"));fp.putAll(invalid);edited.put("fingerprint",fp);
            assertEquals(400,assertThrows(BusinessException.class,()->shops.save(owner,id,edited)).status);
            unchanged(id,text(original,"fingerprintSeed"),text(original,"fingerprint"));
        }
    }
}
