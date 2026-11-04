package com.superpower.browser.extension;

import com.superpower.browser.auth.*;
import com.superpower.browser.environment.EnvironmentService;
import com.superpower.browser.shared.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** A plugin credential is bound to one environment and one live desktop login. */
@Service
public class ExtensionSessions {
    public record Context(String id,String environmentId,Actor actor,String token) {}
    private final Db db;
    private final AuthService auth;
    private final EnvironmentService environments;
    public ExtensionSessions(Db db,AuthService auth,EnvironmentService environments) { this.db=db;this.auth=auth;this.environments=environments; }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    @Transactional public Map<String,Object> create(Actor actor,String environmentId,String parentToken) {
        require(auth.authenticate(parentToken).id().equals(actor.id()),403,"桌面会话不匹配");
        environments.checkAccess(actor,environmentId);
        var parent=one(db.select("SELECT expires_at FROM auth_session WHERE token_hash=?",hash(parentToken)));
        String sessionId=id(),token="spx_"+UUID.randomUUID()+UUID.randomUUID().toString().replace("-","");
        Instant expires=Instant.parse(text(parent,"expiresAt"));
        db.execute("DELETE FROM extension_session WHERE expires_at<CURRENT_TIMESTAMP");
        db.execute("INSERT INTO extension_session(id,token_hash,environment_id,user_id,parent_hash,expires_at) VALUES(?,?,?,?,?,?)",sessionId,hash(token),environmentId,actor.id(),hash(parentToken),Timestamp.from(expires));
        return Map.of("id",sessionId,"token",token,"expiresAt",expires.toString(),"environmentId",environmentId);
    }
    public Context authenticate(String token) {
        require(token.startsWith("spx_"),401,"请使用店铺专属插件凭证");
        var list=rows(db.select("SELECT e.* FROM extension_session e JOIN auth_session a ON a.token_hash=e.parent_hash AND a.user_id=e.user_id WHERE e.token_hash=? AND e.expires_at>CURRENT_TIMESTAMP AND a.expires_at>CURRENT_TIMESTAMP",hash(token)));
        require(!list.isEmpty(),401,"插件会话已失效，请重新打开店铺");
        var row=list.get(0);Actor actor=auth.authorizedUser(text(row,"userId"));
        environments.checkAccess(actor,text(row,"environmentId"));
        return new Context(text(row,"id"),text(row,"environmentId"),actor,token);
    }
    public void revoke(Actor actor,String environmentId,String id) {
        // Allow cleanup even when the environment has just been recycled/revoked.
        db.execute("DELETE FROM extension_session WHERE id=? AND environment_id=? AND user_id=?",id,environmentId,actor.id());
    }
}
