package com.superpower.browser.environment;

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

class DepartmentScopeTest {
    private HikariDataSource source;
    private JdbcTemplate jdbc;
    private EnvironmentRepository repository;
    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        Flyway.configure().dataSource(source).load().migrate();jdbc=new JdbcTemplate(source);
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var configuration=factory.getObject();configuration.getConfiguration().addMapper(Db.class);
        repository=new EnvironmentRepository(new SqlSessionTemplate(configuration).getMapper(Db.class),new SecretCipher(Base64.getEncoder().encodeToString(new byte[32])));
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','test'),('other','other')");
        jdbc.update("INSERT INTO department(id,tenant_id,name) VALUES('a','tenant','A'),('b','tenant','B'),('outside','other','outside')");
        for(String id:List.of("own","colleague","elsewhere","foreign")) {
            String tenant=id.equals("foreign")?"other":"tenant",department=id.equals("foreign")?"outside":id.equals("elsewhere")?"b":"a";
            jdbc.update("INSERT INTO app_user(id,tenant_id,department_id,username,password_hash,display_name) VALUES(?,?,?,?,?,?)",id,tenant,department,id,"synthetic",id);
            jdbc.update("INSERT INTO environment(id,tenant_id,owner_id,name,start_url,fingerprint_seed,fingerprint) VALUES(?,?,?,?,?,?,?)","shop-"+id,tenant,id,id,"https://example.com","seed","{}");
        }
    }
    @AfterEach void close() { jdbc.execute("DROP ALL OBJECTS");source.close(); }
    private Actor actor(int type) { return new Actor("own","tenant","own",false,Set.of("shop.view"),type,"a"); }
    private Set<String> visible(Actor actor) {
        var result=repository.list(actor,"all","",1,20,false);
        return ((List<Map<String,Object>>)result.get("items")).stream().map(r->text(r,"id")).collect(java.util.stream.Collectors.toSet());
    }
    @Test void roleScopeAndExplicitGrantsRemainInsideTenant() {
        assertEquals(Set.of("shop-own"),visible(actor(1)));
        assertEquals(Set.of("shop-own","shop-colleague"),visible(actor(2)));
        assertEquals(Set.of("shop-own","shop-colleague","shop-elsewhere"),visible(actor(3)));
        jdbc.update("INSERT INTO environment_grant(environment_id,user_id,granted_by) VALUES('shop-elsewhere','own','elsewhere')");
        assertEquals(Set.of("shop-own","shop-elsewhere"),visible(actor(1)));
        assertFalse(visible(actor(3)).contains("shop-foreign"));
        assertEquals(404,assertThrows(BusinessException.class,()->repository.get(actor(3),"shop-foreign")).status);
    }
    @Test void memberMoveChangesDepartmentScopeAndDeletedCreatorCannotCreateResources() {
        jdbc.update("UPDATE app_user SET department_id='b' WHERE id='colleague'");
        assertEquals(Set.of("shop-own"),visible(actor(2)));
        jdbc.update("UPDATE app_user SET enabled=FALSE,deleted=TRUE WHERE id='own'");
        assertEquals(401,assertThrows(BusinessException.class,()->repository.create("late-shop",actor(1),Map.of())).status);
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM environment WHERE id='late-shop'",Integer.class));
    }
}
