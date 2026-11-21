package com.superpower.browser.ai;

import com.superpower.browser.auth.Actor;
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

/** Uses migrated tables and the real mapper to verify the personal-model API contract. */
class AiModelServiceTest {
    private HikariDataSource source;
    private JdbcTemplate jdbc;
    private AiModelService models;
    private final Actor owner=new Actor("model-user","model-tenant","model-user",true,Set.of("ai.use"));

    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();
        source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        Flyway.configure().dataSource(source).load().migrate();
        jdbc=new JdbcTemplate(source);
        jdbc.update("INSERT INTO tenant(id,name) VALUES(?,?)",owner.tenantId(),"Model test tenant");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name) VALUES(?,?,?,?,?)",owner.id(),owner.tenantId(),owner.username(),"unused","Model test user");
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var sessionFactory=factory.getObject();sessionFactory.getConfiguration().addMapper(Db.class);
        var db=new SqlSessionTemplate(sessionFactory).getMapper(Db.class);
        models=new AiModelService(db,new SecretCipher(Base64.getEncoder().encodeToString(new byte[32])),new AiIds(db));
    }
    @AfterEach void close() {
        if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");
        if(source!=null)source.close();
    }
    private Map<String,Object> input() {
        return new HashMap<>(Map.of("custom_name","My model","providerName","deepseek","modelName","test-model","apiUrl","https://models.example.test/v1/","apiKey","synthetic-model-key","apiProtocol","chat"));
    }
    @SuppressWarnings("unchecked") private List<Map<String,Object>> list(Actor actor) {
        return (List<Map<String,Object>>)models.list(actor,1,20).get("modelConfigList");
    }

    @Test void modelRoundTripOmitsUnusedMetadataAndKeepsCredentialsEncrypted() {
        var input=input();input.put("remark","unused legacy note");input.put("providerCode","unused legacy code");
        long id=models.save(owner,input,false);
        assertNotEquals(input.get("apiKey"),jdbc.queryForObject("SELECT api_key FROM ai_personal_model WHERE id=?",String.class,id));
        assertEquals("",jdbc.queryForObject("SELECT remark FROM ai_personal_model WHERE id=?",String.class,id));
        jdbc.update("UPDATE ai_personal_model SET remark='existing legacy note' WHERE id=?",id);
        var saved=list(owner).get(0);
        assertEquals("My model",saved.get("custom_name"));
        assertEquals("deepseek",saved.get("providerName"));
        assertEquals("https://models.example.test/v1",saved.get("apiUrl"));
        assertEquals(input.get("apiKey"),saved.get("apiKey"));
        for(String key:List.of("remark","providerCode","tenantId","userId"))assertFalse(saved.containsKey(key),key);
        input.put("id",id);input.put("apiKey","");input.put("modelName","updated-model");
        models.save(owner,input,true);
        assertEquals("synthetic-model-key",list(owner).get(0).get("apiKey"));
        assertEquals("updated-model",list(owner).get(0).get("modelName"));
        assertEquals("existing legacy note",jdbc.queryForObject("SELECT remark FROM ai_personal_model WHERE id=?",String.class,id));
    }

    @Test void credentialsRemainIsolatedByUserAndTenantAndRequireAiPermission() {
        var input=input();long id=models.save(owner,input,false);
        var otherUser=new Actor("other-user",owner.tenantId(),"other",false,Set.of("ai.use"));
        var otherTenant=new Actor(owner.id(),"other-tenant","other",false,Set.of("ai.use"));
        assertTrue(list(otherUser).isEmpty());assertTrue(list(otherTenant).isEmpty());
        input.put("id",id);
        assertEquals(404,assertThrows(BusinessException.class,()->models.save(otherUser,input,true)).status);
        assertEquals(404,assertThrows(BusinessException.class,()->models.delete(otherTenant,id)).status);
        var denied=new Actor(owner.id(),owner.tenantId(),owner.username(),true,Set.of());
        assertEquals(403,assertThrows(BusinessException.class,()->models.providers(denied)).status);
        assertEquals(403,assertThrows(BusinessException.class,()->models.save(denied,input,false)).status);
        assertEquals(403,assertThrows(BusinessException.class,()->list(denied)).status);
    }
}
