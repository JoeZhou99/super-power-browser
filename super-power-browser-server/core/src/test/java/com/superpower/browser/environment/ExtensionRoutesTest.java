package com.superpower.browser.environment;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.device.*;
import com.superpower.browser.extension.*;
import com.superpower.browser.shared.*;
import com.zaxxer.hikari.HikariDataSource;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static com.superpower.browser.shared.Data.*;

/** Real H2 migrations, encrypted extension documents and device/environment scope. */
class ExtensionRoutesTest {
    private HikariDataSource source;
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private ProxyService proxies;
    private ExtensionService extensions;
    private String deviceId;
    private final Actor owner=new Actor("owner","tenant","owner",true,Set.of("device.view","device.edit","shop.open"));
    private final Actor stranger=new Actor("stranger","tenant","stranger",false,Set.of("shop.open"));
    private ExtensionSessions.Context session(String shop,Actor actor){return new ExtensionSessions.Context("session",shop,actor,"synthetic-token");}
    private String snapshot(ExtensionSessions.Context session){return String.valueOf(extensions.bootstrap(session).get("snapshotId"));}
    private Map<String,Object> alternate(String host){return Map.of("protocol","http","host",host,"port",8081,"username","alternate-user","password","alternate-secret");}

    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        Flyway.configure().dataSource(source).load().migrate();jdbc=new JdbcTemplate(source);
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var configuration=factory.getObject();configuration.getConfiguration().addMapper(Db.class);
        Db db=new SqlSessionTemplate(configuration).getMapper(Db.class);
        var cipher=new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        context=new AnnotationConfigApplicationContext();context.registerBean(Db.class,()->db);context.registerBean(SecretCipher.class,()->cipher);
        context.register(Class.forName("com.superpower.browser.device.DeviceRepository"),DeviceService.class,ProxyService.class);context.refresh();
        proxies=context.getBean(ProxyService.class);var devices=context.getBean(DeviceService.class);
        var shops=new EnvironmentService(new EnvironmentRepository(db,cipher),null,devices,null,null,null,null);
        extensions=new ExtensionService(new ExtensionDocuments(db,cipher),shops,devices);
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','synthetic')");
        for(String user:List.of("owner","stranger"))jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES(?,'tenant',?,'synthetic',?)",user,user,user);
        deviceId=proxies.save(owner,null,Map.of("name","proxy","host","main.example.com","port",8080,"protocol","http","username","primary-user","password","primary-secret","proxyOptions",Map.of("alternatives",List.of(alternate("alternate.example.com")))));
        for(String shop:List.of("first","second"))jdbc.update("INSERT INTO environment(id,tenant_id,owner_id,name,start_url,device_id,fingerprint_seed,fingerprint) VALUES(?,'tenant','owner',?,'https://example.com',?,'seed','{}')",shop,shop,deviceId);
    }
    @AfterEach void close(){if(context!=null)context.close();if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");if(source!=null)source.close();}

    @Test @SuppressWarnings("unchecked") void exposesOnlyRouteMetadataAndPersistsTheSelectedRouteForOneShop() {
        var first=session("first",owner);var second=session("second",owner);
        var envelope=(Map<String,Object>)extensions.call(first,"getMallInfo",Map.of());
        var mall=(Map<String,Object>)envelope.get("data");var main=(Map<String,Object>)mall.get("has_one_agent_ip_v2");
        assertEquals(0,main.get("candidateIndex"));var candidates=(List<Map<String,Object>>)main.get("transfer_proxies");
        assertEquals(1,candidates.size());assertEquals(1,candidates.get(0).get("candidateIndex"));
        String publicData=json(envelope);assertFalse(publicData.contains("primary-secret"));assertFalse(publicData.contains("alternate-secret"));assertFalse(publicData.contains("alternate-user"));
        assertEquals(0,extensions.bootstrap(first).get("preferredCandidateIndex"));
        // Same synthetic raw launch configuration as the desktop SHA-256 fixture.
        assertEquals("9e951118446ee2fd1b11e402fcb5c552f0b3094988ec4c73ffae8ef5fb975ee3",snapshot(first));
        extensions.call(first,"updateMainTransfer",Map.of("mall_id","first","candidateIndex",1,"snapshotId",snapshot(first),"password","injected-secret","transfer_name","untrusted.example.com"));
        assertEquals(1,extensions.bootstrap(first).get("preferredCandidateIndex"));assertEquals(0,extensions.bootstrap(second).get("preferredCandidateIndex"));
        String stored=jdbc.queryForObject("SELECT payload FROM extension_document WHERE environment_id='first' AND document_id='preferredProxyRoute'",String.class);
        assertFalse(stored.contains("candidateIndex"));assertFalse(stored.contains("secret"));
        assertEquals(403,assertThrows(BusinessException.class,()->extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",2))).status);
        assertEquals(400,assertThrows(BusinessException.class,()->extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",0.5))).status);
        assertEquals(403,assertThrows(BusinessException.class,()->extensions.call(first,"updateMainTransfer",Map.of("mall_id","second","candidateIndex",0))).status);
        assertEquals(404,assertThrows(BusinessException.class,()->extensions.bootstrap(session("first",stranger))).status);
        assertEquals(1,extensions.bootstrap(first).get("preferredCandidateIndex"));
    }

    @Test void editedOrRemovedCandidatesInvalidateTheSavedPreference() {
        var first=session("first",owner);
        extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",1,"snapshotId",snapshot(first)));
        proxies.save(owner,deviceId,Map.of("name","renamed"));assertEquals(1,extensions.bootstrap(first).get("preferredCandidateIndex"));
        proxies.save(owner,deviceId,Map.of("proxyOptions",Map.of("alternatives",List.of(alternate("replacement.example.com")))));
        assertEquals(0,extensions.bootstrap(first).get("preferredCandidateIndex"));
        extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",1,"snapshotId",snapshot(first)));assertEquals(1,extensions.bootstrap(first).get("preferredCandidateIndex"));
        proxies.save(owner,deviceId,Map.of("proxyOptions",Map.of()));assertEquals(0,extensions.bootstrap(first).get("preferredCandidateIndex"));
        assertEquals(403,assertThrows(BusinessException.class,()->extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",1))).status);
    }

    @Test void runningSnapshotCannotSaveAPreferenceForAnEditedRouteAtTheSameIndex() {
        var first=session("first",owner);String started=snapshot(first);
        proxies.save(owner,deviceId,Map.of("name","renamed"));assertEquals(started,snapshot(first));
        proxies.save(owner,deviceId,Map.of("proxyOptions",Map.of("alternatives",List.of(alternate("replacement.example.com")))));
        assertNotEquals(started,snapshot(first));
        assertEquals(409,assertThrows(BusinessException.class,()->extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",1,"snapshotId",started))).status);
        assertEquals(409,assertThrows(BusinessException.class,()->extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",1))).status);
        assertEquals(0,extensions.bootstrap(first).get("preferredCandidateIndex"));
        extensions.call(first,"updateMainTransfer",Map.of("candidateIndex",1,"snapshotId",snapshot(first)));
        assertEquals(1,extensions.bootstrap(first).get("preferredCandidateIndex"));
    }
}
