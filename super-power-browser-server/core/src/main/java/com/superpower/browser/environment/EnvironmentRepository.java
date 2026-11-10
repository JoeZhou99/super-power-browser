package com.superpower.browser.environment;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
class EnvironmentRepository {
    private final Db db;
    private final SecretCipher secrets;
    EnvironmentRepository(Db db,SecretCipher secrets) { this.db=db;this.secrets=secrets; }
    private static final String PUBLIC="e.id,e.name,e.platform,e.platform_site_id,e.start_url,e.account_name,e.remark,e.device_id,e.kernel_version,e.fingerprint_seed,e.fingerprint,e.config_version,e.favorite,e.recycled,e.last_opened_at,e.created_at,e.updated_at,(SELECT d.name FROM device d WHERE d.id=e.device_id) AS device_name,(SELECT d.host FROM device d WHERE d.id=e.device_id) AS device_host,(SELECT d.region FROM device d WHERE d.id=e.device_id) AS device_region,(SELECT u.display_name FROM app_user u WHERE u.id=e.owner_id) AS creator_name,(SELECT GROUP_CONCAT(u.display_name SEPARATOR ', ') FROM environment_grant g JOIN app_user u ON u.id=g.user_id WHERE g.environment_id=e.id) AS granted_names";
    private static final String SCOPE="e.tenant_id=? AND (?=TRUE OR e.owner_id=? OR EXISTS(SELECT 1 FROM environment_grant g WHERE g.environment_id=e.id AND g.user_id=?) OR (?=TRUE AND EXISTS(SELECT 1 FROM app_user creator WHERE creator.id=e.owner_id AND creator.tenant_id=e.tenant_id AND creator.department_id=?)))";
    private List<Object> scopeArgs(Actor a) {
        return new ArrayList<>(List.of(a.tenantId(),a.owner() || a.memberType()==3,a.id(),a.id(),a.memberType()==2,a.departmentId()));
    }
    Map<String,Object> get(Actor a,String id) {
        var args=scopeArgs(a); args.add(id);
        var result=one(db.select("SELECT e.* FROM environment e WHERE "+SCOPE+" AND e.id=?",args.toArray()));
        result.put("accountPassword",secrets.decrypt(text(result,"accountPassword")));return result;
    }
    Map<String,Object> list(Actor a,String category,String query,int page,int size,boolean recycled) {
        var args=scopeArgs(a); args.add(recycled); args.add("%"+query+"%");
        String where=SCOPE+" AND e.recycled=? AND (e.name LIKE ? OR e.account_name LIKE ? OR e.platform LIKE ? OR e.remark LIKE ?)";
        args.addAll(List.of("%"+query+"%","%"+query+"%","%"+query+"%"));
        where+=switch(category) {
            case "all" -> "";
            case "often_use" -> " AND e.favorite=TRUE";
            case "recent_open" -> " AND e.last_opened_at IS NOT NULL";
            case "unbindIp" -> " AND e.device_id IS NULL";
            case "unauthorize" -> " AND NOT EXISTS(SELECT 1 FROM environment_grant g WHERE g.environment_id=e.id)";
            case "need_renew" -> " AND EXISTS(SELECT 1 FROM device d WHERE d.id=e.device_id AND d.expires_at<?)";
            default -> throw new BusinessException(400,"不支持的店铺分类");
        };
        if(category.equals("need_renew")) args.add(Timestamp.from(Instant.now().plusSeconds(7*86400)));
        long total=((Number)one(db.select("SELECT COUNT(*) AS total FROM environment e WHERE "+where,args.toArray())).get("total")).longValue();
        args.add(size); args.add((page-1)*size);
        return Map.of("items",rows(db.select("SELECT "+PUBLIC+" FROM environment e WHERE "+where+" ORDER BY e.last_opened_at DESC,e.created_at DESC LIMIT ? OFFSET ?",args.toArray())),"total",total);
    }
    Map<String,Object> aiList(Actor a,String query,List<String> platforms,int page,int size) {
        var args=scopeArgs(a);String where=SCOPE+" AND e.recycled=FALSE AND (e.name LIKE ? OR e.account_name LIKE ?)";args.add("%"+query+"%");args.add("%"+query+"%");
        if(!platforms.isEmpty()){where+=" AND e.platform IN ("+String.join(",",Collections.nCopies(platforms.size(),"?"))+")";args.addAll(platforms);}
        long total=number(one(db.select("SELECT COUNT(*) total FROM environment e WHERE "+where,args.toArray())),"total");args.add(size);args.add((page-1)*size);
        return Map.of("items",rows(db.select("SELECT e.id,e.name,e.platform,e.account_name FROM environment e WHERE "+where+" ORDER BY e.name,e.id LIMIT ? OFFSET ?",args.toArray())),"total",total);
    }
    List<Map<String,Object>> aiPlatforms(Actor a) {return rows(db.select("SELECT DISTINCT e.platform AS id,e.platform AS name FROM environment e WHERE "+SCOPE+" AND e.recycled=FALSE ORDER BY e.platform",scopeArgs(a).toArray()));}
    void create(String id,Actor a,Map<String,Object> r) {
        var creator=one(db.select("SELECT enabled,deleted FROM app_user WHERE id=? AND tenant_id=? FOR UPDATE",a.id(),a.tenantId()));
        BusinessException.require(flag(creator,"enabled")&&!flag(creator,"deleted"),401,"成员已停用，请重新登录");
        r=new HashMap<>(r);r.put("accountPassword",secrets.encrypt(text(r,"accountPassword")));
        db.execute("INSERT INTO environment(id,tenant_id,owner_id,name,platform,platform_site_id,start_url,account_name,account_password,remark,kernel_version,fingerprint_seed,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",id,a.tenantId(),a.id(),text(r,"name"),text(r,"platform"),text(r,"platformSiteId"),text(r,"startUrl"),text(r,"accountName"),text(r,"accountPassword"),text(r,"remark"),text(r,"kernelVersion"),Data.id(),text(r,"fingerprint"));
    }
    List<Map<String,Object>> forDevice(Actor a,String deviceId) {
        var args=scopeArgs(a);args.add(deviceId);
        return rows(db.select("SELECT "+PUBLIC+" FROM environment e WHERE "+SCOPE+" AND e.device_id=? AND e.recycled=FALSE ORDER BY e.name",args.toArray()));
    }
    List<Map<String,Object>> forMember(Actor a,String userId) {
        var args=new ArrayList<Object>();args.add(userId);args.addAll(scopeArgs(a));
        return rows(db.select("SELECT e.id,e.name,e.platform,e.account_name,EXISTS(SELECT 1 FROM environment_grant g WHERE g.environment_id=e.id AND g.user_id=?) AS granted FROM environment e WHERE "+SCOPE+" AND e.recycled=FALSE ORDER BY e.name",args.toArray()));
    }
    void update(String id,Map<String,Object> r) {
        r=new HashMap<>(r);r.put("accountPassword",secrets.encrypt(text(r,"accountPassword")));
        db.execute("UPDATE environment SET name=?,platform=?,platform_site_id=?,start_url=?,account_name=?,account_password=?,remark=?,kernel_version=?,fingerprint=?,config_version=config_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",text(r,"name"),text(r,"platform"),text(r,"platformSiteId"),text(r,"startUrl"),text(r,"accountName"),text(r,"accountPassword"),text(r,"remark"),text(r,"kernelVersion"),text(r,"fingerprint"),id);
    }
    void delete(String id) { db.execute("DELETE FROM environment_grant WHERE environment_id=?",id); db.execute("DELETE FROM environment WHERE id=?",id); }
    void recycle(String id,boolean recycled) { db.execute("UPDATE environment SET recycled=?,config_version=config_version+1 WHERE id=?",recycled,id); }
    void favorite(String id,boolean favorite) { db.execute("UPDATE environment SET favorite=? WHERE id=?",favorite,id); }
    void bind(String id,String deviceId) { db.execute("UPDATE environment SET device_id=?,config_version=config_version+1 WHERE id=?",deviceId,id); }
    List<String> grantees(String id) { return rows(db.select("SELECT user_id FROM environment_grant WHERE environment_id=?",id)).stream().map(g->text(g,"userId")).toList(); }
    void grant(String id,String userId,String grantor,boolean revoke) {
        db.execute("DELETE FROM environment_grant WHERE environment_id=? AND user_id=?",id,userId);
        if(!revoke) db.execute("INSERT INTO environment_grant(environment_id,user_id,granted_by) VALUES(?,?,?)",id,userId,grantor);
    }
    void opened(String id) { db.execute("UPDATE environment SET last_opened_at=CURRENT_TIMESTAMP WHERE id=?",id); }
}
