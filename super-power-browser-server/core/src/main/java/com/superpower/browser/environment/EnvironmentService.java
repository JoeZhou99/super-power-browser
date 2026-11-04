package com.superpower.browser.environment;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.auth.MemberDirectory;
import com.superpower.browser.device.DeviceAccess;
import com.superpower.browser.shared.*;
import java.net.URI;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class EnvironmentService {
    private final EnvironmentRepository repository;
    private final MemberDirectory members;
    private final DeviceAccess devices;
    private final AuditRepository audit;
    public EnvironmentService(EnvironmentRepository repository,MemberDirectory members,DeviceAccess devices,AuditRepository audit) {
        this.repository=repository; this.members=members; this.devices=devices; this.audit=audit;
    }
    public Map<String,Object> get(Actor a,String id,String permission) { a.allow(permission); return repository.get(a,id); }
    public Map<String,Object> list(Actor a,String category,String query,int page,int size,boolean recycled) {
        a.allow("shop.view"); require(page>0 && size>0 && size<=200,400,"分页参数不合法");
        return repository.list(a,category,query,page,size,recycled);
    }
    public Map<String,Long> statistics(Actor a,boolean recycled) {
        Map<String,Long> counts=new LinkedHashMap<>();
        for(String c:List.of("all","recent_open","often_use","unbindIp","unauthorize","need_renew")) counts.put(c,(Long)list(a,c,"",1,1,recycled).get("total"));
        return counts;
    }
    @Transactional
    public String save(Actor a,String environmentId,Map<String,Object> request) {
        Map<String,Object> previous=null;
        if(environmentId==null) a.allow("shop.create");
        else { previous=get(a,environmentId,"shop.edit"); require(!flag(previous,"recycled"),409,"请先恢复店铺"); }
        var input=new HashMap<>(request);
        input.put("name",required(input,"name",100));
        String url=required(input,"startUrl",2000);
        try { URI uri=URI.create(url); require(Set.of("http","https").contains(uri.getScheme()) && uri.getHost()!=null,400,"店铺地址必须是 HTTP 或 HTTPS 地址"); }
        catch(IllegalArgumentException e) { throw new BusinessException(400,"店铺地址不合法"); }
        String kernel=required(input,"kernelVersion",30);
        require(kernel.matches("[0-9]+(?:\\.[0-9]+)*"),400,"内核版本不合法");
        require(input.get("fingerprint") instanceof Map<?,?>,400,"指纹配置必须是对象");
        FingerprintSettings.validate((Map<?,?>)input.get("fingerprint"),kernel);
        String serialized=json(input.get("fingerprint")); require(serialized.length()<30000,400,"指纹配置过大");
        require(text(input,"remark").length()<=50,400,"备注最多 50 字");
        String password=input.containsKey("accountPassword")?text(input,"accountPassword"):previous==null?"":text(previous,"accountPassword");
        input.put("startUrl",url); input.put("kernelVersion",kernel); input.put("fingerprint",serialized); input.put("accountPassword",password);
        boolean create=environmentId==null;
        if(create) { environmentId=id(); repository.create(environmentId,a,input); }
        else repository.update(environmentId,input);
        audit.record(a,create?"shop.create":"shop.edit",environmentId,Map.of("name",text(input,"name")));
        return environmentId;
    }
    @Transactional public String copy(Actor a,String environmentId) {
        var source=get(a,environmentId,"shop.view"); source.put("name",text(source,"name")+" 副本"); source.put("fingerprint",object(text(source,"fingerprint")));
        return save(a,null,source);
    }
    @Transactional public String copy(Actor a,String environmentId,Map<String,Object> request) {
        var source=get(a,environmentId,"shop.view");
        Set<String> fields=new HashSet<>(strings(request,"fields"));
        require(Set.of("account","remark","fingerprint","device","grants").containsAll(fields),400,"不支持的复制字段");
        var input=new HashMap<String,Object>();
        input.put("name",required(request,"name",100));
        for(String key:List.of("platform","startUrl","kernelVersion"))input.put(key,source.get(key));
        input.put("fingerprint",fields.contains("fingerprint")?object(text(source,"fingerprint")):Map.of("language","zh-CN","timezone","Asia/Shanghai","webRtc","disabled","webgl",true,"resolution","1920x1080","os","Windows"));
        if(fields.contains("account"))for(String key:List.of("accountName","accountPassword"))input.put(key,source.get(key));
        if(fields.contains("remark"))input.put("remark",source.get("remark"));
        String copied=save(a,null,input);
        if(fields.contains("device")&&source.get("deviceId")!=null)bind(a,copied,text(source,"deviceId"));
        if(fields.contains("grants"))grant(a,copied,repository.grantees(environmentId),false);
        audit.record(a,"shop.copy",copied,Map.of("sourceId",environmentId,"fields",fields));
        return copied;
    }
    public Map<String,Object> events(Actor a,String environmentId,int page,int size) {
        get(a,environmentId,"shop.view");require(page>0&&size>0&&size<=100,400,"分页参数不合法");
        return audit.list(a,environmentId,page,size);
    }
    @Transactional public void recycle(Actor a,String id,boolean recycled,boolean permanent) {
        var env=get(a,id,"shop.delete");
        if(permanent) { require(flag(env,"recycled"),409,"只有回收站中的店铺可永久删除"); repository.delete(id); }
        else repository.recycle(id,recycled);
        audit.record(a,permanent?"shop.delete":"shop.recycle",id,Map.of("recycled",recycled));
    }
    public void favorite(Actor a,String id,boolean favorite) { get(a,id,"shop.edit"); repository.favorite(id,favorite); }
    @Transactional public void bind(Actor a,String environmentId,String deviceId) {
        var env=get(a,environmentId,"shop.edit"); require(!flag(env,"recycled"),409,"请先恢复店铺");
        if(deviceId!=null && !deviceId.isBlank()) devices.requireBindable(a,deviceId); else deviceId=null;
        repository.bind(environmentId,deviceId);
        audit.record(a,"shop.bind",environmentId,Map.of("deviceId",deviceId==null?"":deviceId));
    }
    public List<Map<String,Object>> grants(Actor a,String id) {
        get(a,id,"shop.grant");
        return members.describe(a.tenantId(),repository.grantees(id)).stream().map(member -> Map.<String,Object>of("userId",member.get("id"),"username",member.get("username"),"displayName",member.get("displayName"))).toList();
    }
    @Transactional public void grant(Actor a,String id,List<String> userIds,boolean revoke) {
        get(a,id,"shop.grant");
        // 撤销停用成员的授权仍应允许；新增授权才要求成员处于启用状态。
        members.describe(a.tenantId(),userIds);
        if(!revoke) for(String userId:userIds) members.requireActive(a.tenantId(),userId);
        for(String userId:userIds) repository.grant(id,userId,a.id(),revoke);
        audit.record(a,revoke?"shop.revoke":"shop.grant",id,Map.of("members",userIds));
    }
    @Transactional public Map<String,Object> launch(Actor a,String id) {
        var env=get(a,id,"shop.open"); require(!flag(env,"recycled"),409,"店铺已回收");
        require(env.get("deviceId")!=null,409,"请先绑定设备");
        env.put("proxy",devices.launchProxy(a,text(env,"deviceId")));
        env.put("fingerprint",object(text(env,"fingerprint")));
        repository.opened(id);
        return env;
    }
    public List<Map<String,Object>> forDevice(Actor a,String deviceId) { a.allow("shop.view");return repository.forDevice(a,deviceId); }
    public List<Map<String,Object>> forMember(Actor a,String memberId) {
        a.allow("shop.grant");members.describe(a.tenantId(),List.of(memberId));
        return repository.forMember(a,memberId);
    }
    public void checkAccess(Actor a,String id) {
        var env=get(a,id,"shop.open"); require(!flag(env,"recycled"),409,"店铺已回收");
        require(env.get("deviceId")!=null,409,"店铺设备已解绑");
        devices.launchProxy(a,text(env,"deviceId"));
    }
    @Transactional public List<String> importEnvironments(Actor a,List<Map<String,Object>> input) {
        require(input.size()<=200,400,"单次最多导入 200 家店铺");
        var result=new ArrayList<String>(); for(var item:input) result.add(save(a,null,item)); return result;
    }
}
