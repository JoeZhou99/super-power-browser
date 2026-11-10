package com.superpower.browser.config;

import com.superpower.browser.shared.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class ConfigOperatorAuth {
    private final Db db;
    private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder();
    private final String dummyHash=encoder.encode(UUID.randomUUID().toString());
    public ConfigOperatorAuth(Db db) { this.db=db; }

    /** Explicit first-run bootstrap only: subsequent restarts never overwrite operator credentials. */
    @Transactional public void bootstrap(String username,String password) {
        if(username.isBlank()&&password.isBlank()) return;
        one(db.select("SELECT id FROM config_state WHERE id=1 FOR UPDATE"));
        if(!db.select("SELECT id FROM config_operator").isEmpty()) return;
        require(username.matches("[a-zA-Z0-9][a-zA-Z0-9_.@-]{2,79}"),400,"运营管理员账号须为 3 至 80 位字母、数字或 . _ @ -");
        int bytes=password.getBytes(StandardCharsets.UTF_8).length;
        require(bytes>=12&&bytes<=72&&password.matches("(?s).*[a-zA-Z].*")&&password.matches("(?s).*[0-9].*")&&password.matches("(?s).*[^a-zA-Z0-9].*"),400,"运营管理员密码须为 12 至 72 字节，包含字母、数字和符号");
        db.execute("INSERT INTO config_operator(id,username,password_hash) VALUES(?,?,?)",id(),username,encoder.encode(password));
    }
    @Transactional public Map<String,Object> login(Map<String,Object> request) {
        String username=required(request,"username",80),password=text(request,"password");
        var users=rows(db.select("SELECT id,username,password_hash FROM config_operator WHERE username=? AND enabled=TRUE",username));
        String encoded=users.isEmpty()?dummyHash:text(users.get(0),"passwordHash");
        boolean valid=password.getBytes(StandardCharsets.UTF_8).length<=72&&encoder.matches(password,encoded);
        require(valid&&!users.isEmpty(),401,"运营管理员账号或密码错误");
        var user=users.get(0);byte[] random=new byte[32];new SecureRandom().nextBytes(random);
        String token="ops_"+Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        Instant expires=Instant.now().plusSeconds(8*3600);
        db.execute("DELETE FROM config_operator_session WHERE expires_at<=CURRENT_TIMESTAMP");
        db.execute("INSERT INTO config_operator_session(token_hash,operator_id,expires_at) VALUES(?,?,?)",hash(token),text(user,"id"),java.sql.Timestamp.from(expires));
        return Map.of("token",token,"expiresAt",expires.toString(),"user",new ConfigOperator(text(user,"id"),text(user,"username")));
    }
    public ConfigOperator authenticate(String token) {
        require(token.startsWith("ops_")&&token.length()<200,401,"运营管理登录已失效，请重新登录");
        var users=rows(db.select("SELECT o.id,o.username FROM config_operator_session s JOIN config_operator o ON o.id=s.operator_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND o.enabled=TRUE",hash(token)));
        require(!users.isEmpty(),401,"运营管理登录已失效，请重新登录");
        return new ConfigOperator(text(users.get(0),"id"),text(users.get(0),"username"));
    }
    public void requireActive(ConfigOperator operator) {
        require(operator!=null&&!db.select("SELECT id FROM config_operator WHERE id=? AND enabled=TRUE",operator.id()).isEmpty(),403,"没有运营配置管理权限");
    }
    public void logout(String token) { db.execute("DELETE FROM config_operator_session WHERE token_hash=?",hash(token)); }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
