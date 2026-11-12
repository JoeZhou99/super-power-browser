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
    private static final String SCOPE="d.tenant_id=? AND (?=TRUE OR d.created_by=? OR (?=TRUE AND EXISTS(SELECT 1 FROM app_user creator WHERE creator.id=d.created_by AND creator.tenant_id=d.tenant_id AND creator.department_id=?)) OR EXISTS(SELECT 1 FROM environment e WHERE e.device_id=d.id AND e.tenant_id=d.tenant_id AND e.recycled=FALSE AND (e.owner_id=? OR EXISTS(SELECT 1 FROM environment_grant g WHERE g.environment_id=e.id AND g.user_id=?) OR (?=TRUE AND EXISTS(SELECT 1 FROM app_user creator WHERE creator.id=e.owner_id AND creator.tenant_id=e.tenant_id AND creator.department_id=?)))))";
    private static final String PROXY_PUBLIC=PUBLIC+",d.provider,CASE WHEN d.change_ip_url<>'' THEN TRUE ELSE FALSE END AS has_change_ip_url,d.check_connected,d.check_ip,d.check_country_name,d.check_latency_ms,d.check_message,d.checked_at";
    private List<Object> scopeArgs(Actor a) {
        return new ArrayList<>(List.of(a.tenantId(),a.owner() || a.memberType()==3,a.id(),a.memberType()==2,a.departmentId(),a.id(),a.id(),a.memberType()==2,a.departmentId()));
    }
    Map<String,Object> get(Actor a, String id, boolean credentials) {
        var args=scopeArgs(a); args.add(id);
        var result=one(db.select("SELECT "+(credentials?"d.*":PUBLIC)+" FROM device d WHERE "+SCOPE+" AND d.id=?",args.toArray()));
        if(credentials){result.put("password",secrets.decrypt(text(result,"password")));decryptOptions(result);}return result;
    }
    Map<String,Object> proxy(Actor a,String id,boolean credentials) {
        var args=scopeArgs(a);args.add(id);
        var result=one(db.select("SELECT "+(credentials?"d.*":PROXY_PUBLIC)+" FROM device d WHERE "+SCOPE+" AND d.ip_type=2 AND d.id=?",args.toArray()));
        if(credentials){result.put("password",secrets.decrypt(text(result,"password")));result.put("changeIpUrl",secrets.decrypt(text(result,"changeIpUrl")));decryptOptions(result);}
        return result;
    }
    private void decryptOptions(Map<String,Object> result) {
        String stored=text(result,"proxyOptions");result.put("proxyOptions",stored.isEmpty()?Map.of():ProxyOptions.protocolOnly(object(secrets.decrypt(stored))));
    }
    Map<String,Object> proxies(Actor a,int webType,String protocol,String query,int page,int size,boolean recycled) {
        String where=SCOPE+" AND d.ip_type=2 AND d.recycled=?";var args=scopeArgs(a);args.add(recycled);
        if(webType!=0){where+=" AND d.web_type=?";args.add(webType);}
        if(!protocol.isEmpty()){where+=" AND d.protocol=?";args.add(protocol);}
        where+=" AND (d.name LIKE ? OR d.host LIKE ? OR d.username LIKE ? OR d.region LIKE ? OR d.remark LIKE ? OR d.provider LIKE ?)";
        for(int i=0;i<6;i++)args.add("%"+query+"%");
        long total=((Number)one(db.select("SELECT COUNT(*) AS total FROM device d WHERE "+where,args.toArray())).get("total")).longValue();
        args.add(size);args.add(((long)page-1)*size);
        return Map.of("items",rows(db.select("SELECT "+PROXY_PUBLIC+" FROM device d WHERE "+where+" ORDER BY d.created_at DESC,d.id DESC LIMIT ? OFFSET ?",args.toArray())),"total",total);
    }
    void proxyMetadata(String id,Map<String,Object> input,boolean resetCheck) {
        var expiry=ProxySettings.expiry(text(input,"expiresAt"));
        db.execute("UPDATE device SET provider=?,change_ip_url=?,expires_at=? WHERE id=? AND ip_type=2",text(input,"provider"),secrets.encryptPayload(text(input,"changeIpUrl")),expiry==null?null:Timestamp.from(expiry),id);
        if(resetCheck)invalidateCheck(id);
    }
    void invalidateCheck(String id) {db.execute("UPDATE device SET check_connected=NULL,check_ip='',check_country_name='',check_latency_ms=NULL,check_message='',checked_at=NULL WHERE id=?",id);}
    void proxyCheck(String id,Map<String,Object> input) {
        db.execute("UPDATE device SET check_connected=?,check_ip=?,check_country_name=?,check_latency_ms=?,check_message=?,checked_at=CURRENT_TIMESTAMP WHERE id=? AND ip_type=2",input.get("connected"),text(input,"ip"),text(input,"countryName"),input.get("latencyMs"),text(input,"message"),id);
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
        var creator=one(db.select("SELECT enabled,deleted FROM app_user WHERE id=? AND tenant_id=? FOR UPDATE",a.id(),a.tenantId()));
        BusinessException.require(flag(creator,"enabled")&&!flag(creator,"deleted"),401,"成员已停用，请重新登录");
        r=new HashMap<>(r);r.put("password",secrets.encrypt(text(r,"password")));
        db.execute("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port,username,password,remark,region) VALUES(?,?,?,?,2,?,?,?,?,?,?,?)",id,a.tenantId(),a.id(),text(r,"name"),text(r,"protocol"),text(r,"host"),number(r,"port"),text(r,"username"),text(r,"password"),text(r,"remark"),text(r,"region"));
    }
    void updateOwn(String id,Map<String,Object> r) {
        r=new HashMap<>(r);r.put("password",secrets.encrypt(text(r,"password")));
        db.execute("UPDATE device SET name=?,protocol=?,host=?,port=?,username=?,password=?,remark=?,region=? WHERE id=?",text(r,"name"),text(r,"protocol"),text(r,"host"),number(r,"port"),text(r,"username"),text(r,"password"),text(r,"remark"),text(r,"region"),id);
    }
    void describe(String id,String name,String remark) { db.execute("UPDATE device SET name=?,remark=? WHERE id=?",name,remark,id); }
    void network(String id,Map<String,Object> r) { db.execute("UPDATE device SET web_type=?,protocol_family=?,map_ip=?,map_port=?,proxy_options=? WHERE id=?",number(r,"webType"),number(r,"protocolFamily"),text(r,"mapIp"),number(r,"mapPort"),json(r.get("proxyOptions")).equals("{}")?"":secrets.encryptPayload(json(r.get("proxyOptions"))),id); }
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
