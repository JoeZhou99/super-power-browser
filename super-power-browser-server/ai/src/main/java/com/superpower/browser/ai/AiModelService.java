package com.superpower.browser.ai;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.net.URI;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class AiModelService {
    private final Db db; private final SecretCipher cipher; private final AiIds ids;
    public AiModelService(Db db,SecretCipher cipher,AiIds ids){this.db=db;this.cipher=cipher;this.ids=ids;}
    public static String baseUrl(String value){
        try {var url=URI.create(value.trim());require(Set.of("https","http").contains(url.getScheme())&&url.getHost()!=null&&url.getUserInfo()==null&&url.getFragment()==null&&url.getQuery()==null,400,"模型地址必须是有效的 HTTP 或 HTTPS 基础地址");return value.trim().replaceAll("/+$","");}
        catch(IllegalArgumentException e){throw new BusinessException(400,"模型地址格式不正确");}
    }
    public Map<String,Object> list(Actor a,int page,int limit){return list(a,page,limit,"");}
    public Map<String,Object> list(Actor a,int page,int limit,String query){
        a.allow("ai.use");require(page>=1&&limit>=1&&limit<=100,400,"分页参数不正确");
        require(query.length()<=160,400,"搜索词过长");String keyword="%"+query.trim()+"%";
        var list=rows(db.select("SELECT * FROM ai_personal_model WHERE tenant_id=? AND user_id=? AND (model_name LIKE ? OR custom_name LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?",a.tenantId(),a.id(),keyword,keyword,limit,(page-1)*limit));
        for(var item:list){item.put("apiKey",cipher.decrypt(text(item,"apiKey")));item.put("custom_name",item.remove("customName"));item.remove("tenantId");item.remove("userId");}
        return Map.of("modelConfigList",list,"total",number(one(db.select("SELECT COUNT(*) total FROM ai_personal_model WHERE tenant_id=? AND user_id=? AND (model_name LIKE ? OR custom_name LIKE ?)",a.tenantId(),a.id(),keyword,keyword)),"total"));
    }
    @Transactional public long save(Actor a,Map<String,Object> input,boolean update){
        a.allow("ai.use");long id=update?number(input,"id"):ids.next();
        var previous=update?one(db.select("SELECT * FROM ai_personal_model WHERE id=? AND tenant_id=? AND user_id=? FOR UPDATE",id,a.tenantId(),a.id())):Map.<String,Object>of();
        String key=text(input,"apiKey");if(key.isBlank()&&update)key=cipher.decrypt(text(previous,"apiKey"));
        String protocol=text(input,"apiProtocol");if(protocol.isBlank())protocol="chat";
        require(Set.of("chat","responses").contains(protocol),400,"模型协议不支持");
        String name=required(input,"modelName",160),provider=required(input,"providerName",120),url=baseUrl(required(input,"apiUrl",2000));
        String remark=text(input,"remark");require(remark.length()<=1000&&key.length()<=2000,400,"备注或模型凭据过长");
        String label=text(input,"custom_name");require(label.length()<=50,400,"模型显示名称最多 50 字");
        String encrypted=cipher.encryptPayload(key);
        if(update)db.execute("UPDATE ai_personal_model SET custom_name=?,provider_name=?,model_name=?,api_url=?,api_key=?,api_protocol=?,remark=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=? AND user_id=?",label,provider,name,url,encrypted,protocol,remark,id,a.tenantId(),a.id());
        else db.execute("INSERT INTO ai_personal_model(id,tenant_id,user_id,custom_name,provider_name,model_name,api_url,api_key,api_protocol,remark) VALUES(?,?,?,?,?,?,?,?,?,?)",id,a.tenantId(),a.id(),label,provider,name,url,encrypted,protocol,remark);
        return id;
    }
    public void delete(Actor a,long id){a.allow("ai.use");require(db.execute("DELETE FROM ai_personal_model WHERE id=? AND tenant_id=? AND user_id=?",id,a.tenantId(),a.id())==1,404,"模型不存在或无权访问");}
    public List<Map<String,Object>> providers(Actor a){a.allow("ai.use");return List.of(Map.of("id","openai-compatible","name","OpenAI Compatible","code","openai-compatible","url","","defaultApiProtocol","chat"));}
}
