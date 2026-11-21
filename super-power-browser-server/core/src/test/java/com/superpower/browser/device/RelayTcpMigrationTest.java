package com.superpower.browser.device;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

class RelayTcpMigrationTest {
    @Test void upgradingV33PreservesExistingNodesAndReplacesTheProtocolConstraint() {
        // Exercise both H2 identifier case modes used by local deployments and core fixtures.
        for(boolean lowerCase:new boolean[]{false,true}) {
            var source=new JdbcDataSource();
            source.setURL("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER="+lowerCase);
            var jdbc=new JdbcTemplate(source);
            try {
                Flyway.configure().dataSource(source).locations("classpath:db/migration").target("33").load().migrate();
                jdbc.update("INSERT INTO relay_pool(id,code,name) VALUES('pool','pool','Existing pool')");
                jdbc.update("INSERT INTO relay_node(id,pool_id,name,protocol,host,port,username,password,proxy_options,sort_order,revision) VALUES('node','pool','Existing node','ss','relay.example.com',25135,'existing-user','opaque-encrypted-value','{\"encryption\":\"aes-128-gcm\"}',7,3)");
                var before=jdbc.queryForMap("SELECT * FROM relay_node WHERE id='node'");
                assertThrows(DataIntegrityViolationException.class,()->jdbc.update("UPDATE relay_node SET protocol='tcp' WHERE id='node'"));
                var flyway=Flyway.configure().dataSource(source).locations("classpath:db/migration").load();
                assertEquals(1,flyway.migrate().migrationsExecuted);assertEquals(before,jdbc.queryForMap("SELECT * FROM relay_node WHERE id='node'"));
                for(String protocol:new String[]{"http","https","socks5","ss","tcp"})assertEquals(1,jdbc.update("UPDATE relay_node SET protocol=? WHERE id='node'",protocol));
                assertThrows(DataIntegrityViolationException.class,()->jdbc.update("UPDATE relay_node SET protocol='udp' WHERE id='node'"));
                assertEquals("tcp",jdbc.queryForObject("SELECT protocol FROM relay_node WHERE id='node'",String.class));
                assertEquals(0,flyway.migrate().migrationsExecuted);flyway.validate();
            } finally {jdbc.execute("DROP ALL OBJECTS");}
        }
    }
}
