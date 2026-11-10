package com.superpower.browser.api;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static com.superpower.browser.shared.Data.*;

/** Real HTTP filter chain + actual service/database behavior on an isolated random port. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ConfigurationHttpTest {
    private ConfigurableApplicationContext context;
    private final HttpClient http=HttpClient.newHttpClient();
    private String base,customer;
    private static final String PASSWORD="Synthetic-http-test-123";
    @BeforeAll void start() {
        var app=new SpringApplication(ApiApplication.class);app.setRegisterShutdownHook(false);
        context=app.run("--server.port=0","--spring.datasource.url=jdbc:h2:mem:config-http-"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            "--spring.datasource.username=sa","--spring.datasource.password=","--app.bootstrap.username=http-customer","--app.bootstrap.password="+PASSWORD,
            "--app.data-key="+Base64.getEncoder().encodeToString(new byte[32]),"--app.kernel-manifest=","--OPS_ADMIN_USERNAME=http-operator","--OPS_ADMIN_PASSWORD="+PASSWORD,
            "--logging.level.root=WARN");
        base="http://127.0.0.1:"+context.getEnvironment().getProperty("local.server.port");
        customer=text(body(call("POST","/api/auth/login",null,Map.of("username","http-customer","password",PASSWORD)),200),"token");
        new JdbcTemplate(context.getBean(javax.sql.DataSource.class)).update("INSERT INTO kernel_release(id,version,platform,arch,full_version,sha256,archive_bytes,descriptor,storage_type,storage_key,state) VALUES('test-kernel','144','win32','x64','144.0.0.0',?,1,'{}','LOCAL','synthetic','PUBLISHED')","0".repeat(64));
    }
    @AfterAll void stop() { if(context!=null)context.close(); }
    private HttpResponse<String> call(String method,String path,String token,Object request) {
        try {
            var builder=HttpRequest.newBuilder(URI.create(base+path)).header("Content-Type","application/json");
            if(token!=null)builder.header("Authorization","Bearer "+token);
            builder.method(method,request==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json(request)));
            return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
        } catch(Exception e) { throw new IllegalStateException(e); }
    }
    private Map<String,Object> body(HttpResponse<String> response,int expected) { assertEquals(expected,response.statusCode(),response.body());return object(response.body()); }
    private String operator() { return text(body(call("POST","/api/admin/auth/login",null,Map.of("username","http-operator","password",PASSWORD)),200),"token"); }
    private Map<String,Object> fingerprint(String id) { return object(text(body(call("GET","/api/environments/"+id,customer,null),200),"fingerprint")); }

    @Test void tenantOwnerAndOperatorCredentialsCannotCrossSecurityBoundaries() {
        String operator=operator();
        assertEquals(401,call("GET","/api/admin/configs",null,null).statusCode());
        assertEquals(401,call("GET","/api/browser-config",null,null).statusCode());
        assertEquals(401,call("GET","/api/admin/configs",customer,null).statusCode());
        assertEquals(401,call("PUT","/api/admin/configs/browser-defaults",customer,Map.of()).statusCode());
        assertEquals(401,call("GET","/api/me/permissions",operator,null).statusCode());
        assertEquals(401,call("GET","/api/browser-config",operator,null).statusCode());
        assertEquals("http-operator",body(call("GET","/api/admin/auth/me",operator,null),200).get("username"));
        assertEquals(200,call("GET","/api/admin/configs",operator,null).statusCode());
        assertEquals(200,call("GET","/api/browser-config",customer,null).statusCode());
        assertEquals(200,call("POST","/api/admin/auth/logout",operator,Map.of()).statusCode());
        assertEquals(401,call("GET","/api/admin/configs",operator,null).statusCode());
        assertEquals(200,call("GET","/api/me/permissions",customer,null).statusCode());
    }
    @Test void configuredDefaultsReachCreationImportAndCopyWhileEditsKeepSavedValues() {
        String operator=operator();
        var defaults=body(call("GET","/api/admin/configs/browser-defaults",operator,null),200);
        var desired=Map.of("timezone","Europe/London","language","en-US","resolution","1366x768");defaults.put("values",desired);
        body(call("PUT","/api/admin/configs/browser-defaults",operator,defaults),200);
        assertEquals(desired,body(call("GET","/api/browser-config",customer,null),200).get("defaults"));
        var create=Map.<String,Object>of("name","configured shop","platform","custom","startUrl","https://example.test","kernelVersion","144");
        String id=text(body(call("POST","/api/environments",customer,create),200),"id");assertEquals(desired,fingerprint(id));
        var supplied=new HashMap<String,Object>(create);supplied.put("name","existing fingerprint");
        supplied.put("fingerprint",Map.of("timezone","Asia/Shanghai","language","zh-CN","resolution","1920x1080","webRtc","disabled"));
        String old=text(body(call("POST","/api/environments",customer,supplied),200),"id");
        var edit=new HashMap<String,Object>(create);edit.put("name","renamed old shop");edit.put("fingerprint",Map.of("webRtc","disabled"));
        body(call("PATCH","/api/environments/"+old,customer,edit),200);assertEquals("Asia/Shanghai",fingerprint(old).get("timezone"));
        String copy=text(body(call("POST","/api/environments/"+old+"/copy",customer,Map.of("name","copied without fingerprint","fields",List.of())),200),"id");
        assertEquals("Europe/London",fingerprint(copy).get("timezone"));assertEquals("disabled",fingerprint(copy).get("webRtc"));
        var imported=call("POST","/api/environments/import",customer,List.of(create));assertEquals(200,imported.statusCode(),imported.body());
        var ids=JSON.readValue(imported.body(),List.class);assertEquals(desired,fingerprint(ids.get(0).toString()));
    }
    @Test void malformedConfigurationReturnsClientErrorsAndNoAuditWrites() {
        String operator=operator();
        var before=body(call("GET","/api/admin/config-audit",operator,null),200);
        var doc=body(call("GET","/api/admin/configs/languages",operator,null),200);
        doc.put("entries",List.of(Map.of("value","en-US","label","English","enabled","true","sortOrder",0)));
        body(call("PUT","/api/admin/configs/languages",operator,doc),400);
        doc.put("entries",List.of(5));body(call("PUT","/api/admin/configs/languages",operator,doc),400);
        body(call("GET","/api/admin/config-audit?page=0",operator,null),400);
        body(call("GET","/api/admin/configs/kernel-switches",operator,null),404);
        var after=body(call("GET","/api/admin/config-audit",operator,null),200);assertEquals(before.get("total"),after.get("total"));
    }
    @Test @SuppressWarnings("unchecked") void siteCatalogChangesPreserveRealExistingShopUrlSnapshots() {
        String operator=operator();var doc=body(call("GET","/api/admin/configs/platform-sites",operator,null),200);
        var entries=(List<Map<String,Object>>)doc.get("entries");var first=entries.get(0);String siteId=text(first,"id"),originalUrl=text(first,"url");
        var create=Map.<String,Object>of("name","catalog snapshot shop","platformSiteId",siteId,"kernelVersion","144");
        String id=text(body(call("POST","/api/environments",customer,create),200),"id");
        first.put("url","https://changed.example.test/login");first.put("enabled",false);
        body(call("PUT","/api/admin/configs/platform-sites",operator,doc),200);
        var existing=body(call("GET","/api/environments/"+id,customer,null),200);assertEquals(originalUrl,text(existing,"startUrl"));
        existing.remove("fingerprint");existing.put("name","renamed snapshot shop");
        body(call("PATCH","/api/environments/"+id,customer,existing),200);
        assertEquals(originalUrl,text(body(call("GET","/api/environments/"+id,customer,null),200),"startUrl"));
        assertEquals(400,call("POST","/api/environments",customer,create).statusCode());
    }
}
