package com.superpower.browser.ai;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class AiSkillService {
    private final Db db;private final AiIds ids;private final AiTickets tickets;private final SecretCipher cipher;
    private final Path storage;private final String publicUrl;private final Set<String> publishers;
    public AiSkillService(Db db,AiIds ids,AiTickets tickets,SecretCipher cipher,
        @Value("${app.ai.storage:./data/ai-skills}") String storage,
        @Value("${app.ai.public-url:http://127.0.0.1:8080}") String publicUrl,
        @Value("${app.ai.publisher-ids:}") String publishers){
        this.db=db;this.ids=ids;this.tickets=tickets;this.cipher=cipher;this.storage=Path.of(storage).toAbsolutePath().normalize();this.publicUrl=AiModelService.baseUrl(publicUrl);
        this.publishers=new HashSet<>(Arrays.asList(publishers.split(",")));
    }
    private boolean publisher(Actor a){return publishers.contains(a.id());}
    public void requirePublisher(Actor a){a.allow("ai.use");require(publisher(a),403,"需要技能商店运营权限");}
    public List<Map<String,Object>> categories(Actor a,long parent){a.allow("ai.use");return rows(db.select("SELECT id,name FROM ai_skill_category WHERE parent_id=? ORDER BY id",parent));}
    private Map<String,Object> get(long id){return one(db.select("SELECT * FROM ai_skill WHERE id=? AND status<>3",id));}
    private boolean owns(Actor a,Map<String,Object> r){return a.id().equals(text(r,"userId"))&&a.tenantId().equals(text(r,"tenantId"));}
    private boolean bound(Actor a,long id){return !db.select("SELECT skill_id FROM ai_skill_binding WHERE user_id=? AND skill_id=?",a.id(),id).isEmpty();}
    private boolean visible(Actor a,Map<String,Object> r){return owns(a,r)||publisher(a)||(number(r,"scope")==1&&number(r,"reviewStatus")==1)||bound(a,number(r,"id"));}
    private Map<String,Object> contract(Actor a,Map<String,Object> r,String session,boolean download){
        long id=number(r,"id");var out=new LinkedHashMap<String,Object>();
        out.put("id",id);out.put("uid",text(r,"userId"));out.put("name",text(r,"name"));out.put("explain",text(r,"description"));
        for(String key:List.of("version","filename","scope","source","status"))out.put(key,r.get(key));
        for(String key:List.of("categoryId","subCategoryId","reviewStatus","reviewReason","reviewAt","fileMd5","downloadCount","createdAt","updatedAt"))out.put(key.replaceAll("([a-z])([A-Z])","$1_$2").toLowerCase(Locale.ROOT),r.get(key));
        for(String prefix:List.of("category","subCategory")){
            var category=db.select("SELECT name FROM ai_skill_category WHERE id=?",number(r,prefix+"Id"));
            out.put(prefix.equals("category")?"category_name":"sub_category_name",category.isEmpty()?"":text(one(category),"name"));
        }
        out.put("is_bound",bound(a,id));
        if(owns(a,r)){
            var shares=db.select("SELECT id FROM ai_skill_share WHERE skill_id=? AND user_id=? AND revoked=FALSE ORDER BY id DESC LIMIT 1",id,a.id());
            if(!shares.isEmpty())out.put("share_id",number(one(shares),"id"));
        }
        if(download&&session!=null)out.put("file_url",publicUrl+"/api/ai/skills/files/"+id+"?ticket="+tickets.issue(a,session,"skill",String.valueOf(id)));
        return out;
    }
    public Map<String,Object> list(Actor a,String type,Map<String,String> q,String session){
        a.allow("ai.use");int page=integer(q,"page",1),limit=integer(q,"limit",20);require(page>0&&limit>0&&limit<=100,400,"分页参数不正确");
        var args=new ArrayList<Object>();String where="s.status<>3";
        switch(type){
            case "uploadedList" -> {where+=" AND s.user_id=? AND s.tenant_id=?";args.add(a.id());args.add(a.tenantId());}
            case "myList" -> {where+=" AND EXISTS(SELECT 1 FROM ai_skill_binding b WHERE b.skill_id=s.id AND b.user_id=?)";args.add(a.id());}
            case "review" -> {requirePublisher(a);where+=" AND s.review_status=3";}
            default -> {where+=" AND s.scope=1 AND s.review_status=1";}
        }
        if(type.equals("list"))where+=" AND NOT EXISTS(SELECT 1 FROM ai_skill n WHERE n.family_id=s.family_id AND n.id>s.id AND n.status<>3 AND n.scope=1 AND n.review_status=1)";
        if(type.equals("uploadedList"))where+=" AND NOT EXISTS(SELECT 1 FROM ai_skill n WHERE n.family_id=s.family_id AND n.id>s.id AND n.status<>3)";
        String keyword=q.getOrDefault(type.equals("uploadedList")?"keyword":"name","").trim();
        require(keyword.length()<=200,400,"关键词过长");
        if(!keyword.isEmpty()){where+=" AND (s.name LIKE ? OR s.description LIKE ?)";args.add("%"+keyword+"%");args.add("%"+keyword+"%");}
        for(String key:List.of("category_id","sub_category_id","review_status")){int value=integer(q,key,0);if(value>0){where+=" AND s."+key+"=?";args.add(value);}}
        if(q.containsKey("is_bound")){where+=" AND "+("true".equals(q.get("is_bound"))?"":"NOT ")+"EXISTS(SELECT 1 FROM ai_skill_binding b WHERE b.skill_id=s.id AND b.user_id=?)";args.add(a.id());}
        long total=number(one(db.select("SELECT COUNT(*) total FROM ai_skill s WHERE "+where,args.toArray())),"total");
        args.add(limit);args.add((page-1)*limit);
        var list=rows(db.select("SELECT s.* FROM ai_skill s WHERE "+where+" ORDER BY s.id DESC LIMIT ? OFFSET ?",args.toArray()));
        return Map.of("list",list.stream().map(r->contract(a,r,session,true)).toList(),"total",total);
    }
    static int integer(Map<String,String> q,String name,int fallback){try{return q.containsKey(name)?Integer.parseInt(q.get(name)):fallback;}catch(Exception e){throw new BusinessException(400,"参数不正确："+name);}}
    @Transactional public Map<String,Object> upload(Actor a,byte[] bytes,String filename,Map<String,String> form,String session,Long resubmit){
        a.allow("ai.use");var archive=SkillArchive.inspect(bytes);
        String version=form.getOrDefault("version","").trim();require(version.matches("[vV]?[0-9]+(?:\\.[0-9]+){0,3}(?:[-+][A-Za-z0-9.-]+)?")&&version.length()<=64,400,"技能版本格式不正确");
        int scope=integer(form,"scope",2);require(scope>=1&&scope<=3,400,"技能可见范围不正确");
        long category=integer(form,"category_id",0),platform=integer(form,"sub_category_id",0);
        for(long categoryId:List.of(category,platform))if(categoryId>0)one(db.select("SELECT id FROM ai_skill_category WHERE id=?",categoryId));
        long id=ids.next(),family=id;
        if(resubmit!=null){var old=get(resubmit);require(owns(a,old),403,"不能重新提交他人的技能");family=number(old,"familyId");}
        try{Files.createDirectories(storage);Path target=storage.resolve(archive.sha256()+".zip");if(!Files.exists(target)){Path temp=Files.createTempFile(storage,"upload-",".tmp");try{Files.write(temp,bytes);Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}}}
        catch(java.io.IOException e){throw new BusinessException(503,"技能包保存失败");}
        String safeName=Objects.toString(filename,"skill.zip").replace('\\','/');safeName=safeName.substring(safeName.lastIndexOf('/')+1);if(safeName.length()>255)safeName="skill.zip";
        int review=scope==1?(publisher(a)?1:3):0;
        db.execute("INSERT INTO ai_skill(id,tenant_id,user_id,family_id,name,description,version,category_id,sub_category_id,source,scope,review_status,filename,file_hash,file_md5) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            id,a.tenantId(),a.id(),family,archive.name(),archive.description(),version,category,platform,0,scope,review,safeName,archive.sha256(),archive.md5());
        db.execute("INSERT INTO ai_skill_binding(user_id,skill_id) VALUES(?,?)",a.id(),id);
        return contract(a,get(id),session,true);
    }
    @Transactional public Map<String,Object> bind(Actor a,long id,boolean remove){
        a.allow("ai.use");one(db.select("SELECT id FROM app_user WHERE id=? FOR UPDATE",a.id()));var skill=get(id);require(visible(a,skill),404,"技能不存在或无权访问");
        if(remove)db.execute("DELETE FROM ai_skill_binding WHERE user_id=? AND skill_id=?",a.id(),id);
        else if(!bound(a,id))db.execute("INSERT INTO ai_skill_binding(user_id,skill_id) VALUES(?,?)",a.id(),id);
        return Map.of("id",id,"skill_store_id",id,"is_bound",!remove);
    }
    @Transactional public void delete(Actor a,long id){a.allow("ai.use");require(owns(a,get(id)),403,"只能删除本人上传的技能");db.execute("UPDATE ai_skill SET status=3,updated_at=CURRENT_TIMESTAMP WHERE id=?",id);db.execute("UPDATE ai_skill_share SET revoked=TRUE WHERE skill_id=?",id);}
    @Transactional public Map<String,Object> share(Actor a,long id){
        a.allow("ai.use");var skill=get(id);require(owns(a,skill),403,"只能分享本人上传的技能");
        db.execute("UPDATE ai_skill_share SET revoked=TRUE WHERE skill_id=? AND user_id=?",id,a.id());
        byte[] bytes=new byte[8];new SecureRandom().nextBytes(bytes);String raw=HexFormat.of().formatHex(bytes).toUpperCase(Locale.ROOT);
        String code=raw.substring(0,4)+"-"+raw.substring(4,8)+"-"+raw.substring(8,12)+"-"+raw.substring(12);
        long shareId=ids.next();db.execute("INSERT INTO ai_skill_share(id,skill_id,user_id,code_hash,code_cipher) VALUES(?,?,?,?,?)",shareId,id,a.id(),AiTickets.hash(raw),cipher.encrypt(code));
        return Map.of("id",shareId,"skill_store_id",id,"code",code,"name",text(skill,"name"));
    }
    public void revoke(Actor a,long id){a.allow("ai.use");require(db.execute("UPDATE ai_skill_share SET revoked=TRUE WHERE id=? AND user_id=?",id,a.id())==1,404,"分享记录不存在");}
    @Transactional public Map<String,Object> redeem(Actor a,String code,boolean bind,String session){
        a.allow("ai.use");one(db.select("SELECT id FROM app_user WHERE id=? FOR UPDATE",a.id()));String normalized=code.replace("-","").trim().toUpperCase(Locale.ROOT);require(normalized.matches("[A-F0-9]{16}"),400,"分享口令格式不正确");
        var share=one(db.select("SELECT skill_id FROM ai_skill_share WHERE code_hash=? AND revoked=FALSE",AiTickets.hash(normalized)));
        long id=number(share,"skillId");var skill=get(id);
        if(bind&&!bound(a,id))db.execute("INSERT INTO ai_skill_binding(user_id,skill_id) VALUES(?,?)",a.id(),id);
        return contract(a,skill,session,bind);
    }
    public Path download(long id,String ticket){Actor a=tickets.authenticate(ticket,"skill",String.valueOf(id));var skill=get(id);require(visible(a,skill),404,"技能不存在或权限已撤销");return storage.resolve(text(skill,"fileHash")+".zip");}
    public void downloaded(Actor a,long id){a.allow("ai.use");require(visible(a,get(id)),404,"技能不存在");db.execute("UPDATE ai_skill SET download_count=download_count+1 WHERE id=?",id);}
    public void review(Actor a,long id,boolean approved,String reason){requirePublisher(a);get(id);require(reason.length()<=1000,400,"审核说明过长");db.execute("UPDATE ai_skill SET review_status=?,review_reason=?,review_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",approved?1:2,reason,id);}
}
