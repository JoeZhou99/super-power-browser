package com.superpower.browser.api;

import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Liveness is cheap; readiness verifies dependencies before traffic is routed here. */
@RestController
@RequestMapping("/api")
public class ReadinessController {
    private final DataSource dataSource;
    private final RedisConnectionFactory redis;
    public ReadinessController(DataSource dataSource,RedisConnectionFactory redis) { this.dataSource=dataSource;this.redis=redis; }

    @GetMapping("/ready")
    public ResponseEntity<Map<String,Object>> ready() {
        var checks=new LinkedHashMap<String,Object>();
        boolean database=database();checks.put("database",database?"UP":"DOWN");
        boolean cache=cache();checks.put("redis",cache?"UP":"DOWN");
        boolean ok=database&&cache;
        checks.put("status",ok?"UP":"DOWN");
        return ResponseEntity.status(ok?HttpStatus.OK:HttpStatus.SERVICE_UNAVAILABLE).body(checks);
    }

    private boolean database() {
        try(Connection connection=dataSource.getConnection()) {
            return connection.isValid(2)&&Integer.valueOf(1).equals(new JdbcTemplate(dataSource).queryForObject("SELECT 1",Integer.class));
        } catch(Exception error) { return false; }
    }

    private boolean cache() {
        try { return "PONG".equalsIgnoreCase(redis.getConnection().ping()); }
        catch(Exception error) { return false; }
    }
}
