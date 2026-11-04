package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
class DeviceRepository {
    private final Db db;
    private final SecretCipher secrets;
    DeviceRepository(Db db,SecretCipher secrets) { this.db=db;this.secrets=secrets; }
    private static final String PUBLIC="d.id,d.name,d.ip_type,d.protocol,d.host,d.port,d.username,d.remark,d.region,d.web_type,d.protocol_family,d.map_ip,d.map_port,d.expires_at,d.auto_renew,d.recycled,d.created_at,d.package_id,d.acceleration_expires_at,(SELECT COUNT(*) FROM environment e WHERE e.device_id=d.id AND e.recycled=FALSE) AS bound_count";
    private static final String SCOPE="d.tenant_id=? AND (?=TRUE OR d.created_by=? OR EXISTS(SELECT 1 FROM environment e WHERE e.device_id=d.id AND e.tenant_id=d.tenant_id AND e.recycled=FALSE AND (e.owner_id=? OR EXISTS(SELECT 1 FROM environment_grant g WHERE g.environment_id=e.id AND g.user_id=?))))";
    private List<Object> scopeArgs(Actor a) { return new ArrayList<>(List.of(a.tenantId(),a.owner(),a.id(),a.id(),a.id())); }
    Map<String,Object> get(Actor a, String id, boolean credentials) {
        var args=scopeArgs(a); args.add(id);
        var result=one(db.select("SELECT "+(credentials?"d.*":PUBLIC)+" FROM device d WHERE "+SCOPE+" AND d.id=?",args.toArray()));
        if(credentials)result.put("password",secrets.decrypt(text(result,"password")));return result;
    }
    Map<String,Object> list(Actor a,int type,String category,String query,int page,int size,boolean recycled) {
        String where=SCOPE+" AND d.ip_type=? AND d.recycled=? AND (d.name LIKE ? OR d.host LIKE ? OR d.region LIKE ? OR d.remark LIKE ?)";
        var args=scopeArgs(a); args.addAll(List.of(type,recycled,"%"+query+"%"));
        args.addAll(List.of("%"+query+"%","%"+query+"%","%"+query+"%"));
        where+=switch(category) {
            case "allIp" -> "";
            case "willExpiredIp" -> " AND d.expires_at>CURRENT_TIMESTAMP AND d.expires_at<?";
            case "expiredIp" -> " AND d.expires_at<=CURRENT_TIMESTAMP";
            case "unbindMall" -> " AND NOT EXISTS(SELECT 1 FROM environment e WHERE e.device_id=d.id)";
            case "unAutoRenew" -> " AND d.ip_type<>2 AND d.auto_renew=FALSE";
            case "autoRenew" -> " AND d.ip_type<>2 AND d.auto_renew=TRUE";
            default -> throw new BusinessException(400,"不支持的设备分类");
        };
        if(category.equals("willExpiredIp")) args.add(Timestamp.from(Instant.now().plusSeconds(7*86400)));
        long total=((Number)one(db.select("SELECT COUNT(*) AS total FROM device d WHERE "+where,args.toArray())).get("total")).longValue();
        args.add(size);args.add((page-1)*size);
        return Map.of("items",rows(db.select("SELECT "+PUBLIC+" FROM device d WHERE "+where+" ORDER BY d.created_at DESC LIMIT ? OFFSET ?",args.toArray())),"total",total);
    }
    void createOwn(String id,Actor a,Map<String,Object> r) {
        r=new HashMap<>(r);r.put("password",secrets.encrypt(text(r,"password")));
        db.execute("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port,username,password,remark,region) VALUES(?,?,?,?,2,?,?,?,?,?,?,?)",id,a.tenantId(),a.id(),text(r,"name"),text(r,"protocol"),text(r,"host"),number(r,"port"),text(r,"username"),text(r,"password"),text(r,"remark"),text(r,"region"));
    }
    void updateOwn(String id,Map<String,Object> r) {
        r=new HashMap<>(r);r.put("password",secrets.encrypt(text(r,"password")));
        db.execute("UPDATE device SET name=?,protocol=?,host=?,port=?,username=?,password=?,remark=?,region=? WHERE id=?",text(r,"name"),text(r,"protocol"),text(r,"host"),number(r,"port"),text(r,"username"),text(r,"password"),text(r,"remark"),text(r,"region"),id);
    }
    void describe(String id,String name,String remark) { db.execute("UPDATE device SET name=?,remark=? WHERE id=?",name,remark,id); }
    void network(String id,Map<String,Object> r) { db.execute("UPDATE device SET web_type=?,protocol_family=?,map_ip=?,map_port=? WHERE id=?",number(r,"webType"),number(r,"protocolFamily"),text(r,"mapIp"),number(r,"mapPort"),id); }
    List<Map<String,Object>> ownByEndpoint(Actor a,String host,long port) {
        var args=scopeArgs(a);args.add(host);args.add(port);
        return rows(db.select("SELECT "+PUBLIC+" FROM device d WHERE "+SCOPE+" AND d.ip_type=2 AND d.recycled=FALSE AND d.host=? AND d.port=?",args.toArray()));
    }
    boolean bound(String id) { return !db.select("SELECT id FROM environment WHERE device_id=?",id).isEmpty(); }
    void delete(String id) { db.execute("DELETE FROM device WHERE id=?",id); }
    void recycle(String id,boolean recycled) { db.execute("UPDATE device SET recycled=?,auto_renew=FALSE WHERE id=?",recycled,id); }
    void autoRenew(String id,boolean enabled,String userId) { db.execute("UPDATE device SET auto_renew=?,auto_renew_user_id=? WHERE id=?",enabled,enabled?userId:null,id); }
    List<Map<String,Object>> renewals() {
        return rows(db.select("SELECT id,tenant_id,package_id,expires_at,auto_renew_user_id FROM device WHERE auto_renew=TRUE AND recycled=FALSE AND ip_type IN (1,20) AND expires_at<? AND package_id IS NOT NULL ORDER BY expires_at LIMIT 100",Timestamp.from(Instant.now().plusSeconds(86400))));
    }
}
