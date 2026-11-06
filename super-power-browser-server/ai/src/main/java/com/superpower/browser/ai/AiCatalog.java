package com.superpower.browser.ai;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Official upstream credentials belong to the server, never to the renderer. */
@Service
public class AiCatalog {
    private final Db db; private final SecretCipher cipher; private final Set<String> publishers;
    public AiCatalog(Db db,SecretCipher cipher,@Value("${app.ai.publisher-ids:}") String publishers){this.db=db;this.cipher=cipher;this.publishers=new HashSet<>(Arrays.asList(publishers.split(",")));}
    public void operator(Actor a){a.allow("ai.use");require(publishers.contains(a.id()),403,"没有官方 AI 服务管理权限");}
    public List<Map<String,Object>> models(Actor a){a.allow("ai.use");return rows(db.select("SELECT id,name,description,protocol FROM ai_official_model WHERE enabled=TRUE ORDER BY sort_order,id")).stream().map(m->{m.put("billing_type","套餐计费");return m;}).toList();}
    public Map<String,Object> upstream(String id,String protocol){var m=one(db.select("SELECT * FROM ai_official_model WHERE id=? AND enabled=TRUE",id));require(text(m,"protocol").equals(protocol),400,"该模型不支持所选协议");m.put("apiKey",cipher.decrypt(text(m,"apiKey")));return m;}
    @Transactional public void saveModel(Actor a,Map<String,Object> b){
        operator(a);String id=required(b,"id",160),name=required(b,"name",160),protocol=required(b,"protocol",16);
        require(Set.of("chat","responses").contains(protocol),400,"模型协议不支持");
        String url=AiModelService.baseUrl(required(b,"baseUrl",2000)),key=text(b,"apiKey");
        var old=rows(db.select("SELECT * FROM ai_official_model WHERE id=? FOR UPDATE",id));
        if(key.isBlank()){require(!old.isEmpty(),400,"请配置上游凭据");key=cipher.decrypt(text(old.get(0),"apiKey"));}
        require(text(b,"description").length()<=2000,400,"模型说明过长");
        if(old.isEmpty())db.execute("INSERT INTO ai_official_model(id,name,description,upstream_model,base_url,api_key,protocol,enabled,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",id,name,text(b,"description"),required(b,"upstreamModel",160),url,cipher.encryptPayload(key),protocol,flag(b,"enabled"),number(b,"sortOrder"));
        else db.execute("UPDATE ai_official_model SET name=?,description=?,upstream_model=?,base_url=?,api_key=?,protocol=?,enabled=?,sort_order=? WHERE id=?",name,text(b,"description"),required(b,"upstreamModel",160),url,cipher.encryptPayload(key),protocol,flag(b,"enabled"),number(b,"sortOrder"),id);
    }
}
