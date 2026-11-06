package com.superpower.browser.ai;

import com.superpower.browser.auth.*;
import com.superpower.browser.shared.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Scoped tickets are bound to the existing login session and never expose upstream keys. */
@Service
public class AiTickets {
    private final Db db;
    private final AuthService auth;
    public AiTickets(Db db,AuthService auth){this.db=db;this.auth=auth;}
    public static String hash(String value){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    public String issue(Actor actor,String session,String kind,String resource){
        actor.allow("ai.use");
        Actor current=auth.authenticate(session);
        require(current.id().equals(actor.id())&&current.tenantId().equals(actor.tenantId()),403,"登录账号已变化");
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);
        String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.execute("DELETE FROM ai_ticket WHERE expires_at<CURRENT_TIMESTAMP");
        db.execute("INSERT INTO ai_ticket(token_hash,session_hash,user_id,tenant_id,kind,resource_id,expires_at) VALUES(?,?,?,?,?,?,?)",
            hash(token),hash(session),actor.id(),actor.tenantId(),kind,resource,Timestamp.from(Instant.now().plusSeconds(kind.equals("gateway")?8*3600:600)));
        return token;
    }
    public Actor authenticate(String token,String kind,String resource){
        require(token!=null&&token.length()>=32&&token.length()<=100,401,"AI 访问凭据无效");
        var found=db.select("SELECT t.user_id,t.tenant_id,t.resource_id FROM ai_ticket t JOIN auth_session s ON s.token_hash=t.session_hash AND s.user_id=t.user_id WHERE t.token_hash=? AND t.kind=? AND t.expires_at>CURRENT_TIMESTAMP AND s.expires_at>CURRENT_TIMESTAMP",hash(token),kind);
        require(found.size()==1,401,"AI 访问凭据已失效，请重新登录");
        var row=one(found);
        require(resource.equals(text(row,"resourceId")),403,"访问凭据不适用于此资源");
        Actor actor=auth.authorizedUser(text(row,"userId"));
        require(actor.tenantId().equals(text(row,"tenantId")),403,"账号所属企业已变化");
        actor.allow("ai.use");return actor;
    }
}
