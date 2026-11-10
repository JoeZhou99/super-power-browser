package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** User-owned proxies share device IDs so existing environment bindings remain valid. */
@Service
public class ProxyService {
    private final DeviceRepository repository;
    private final DeviceService devices;
    public ProxyService(DeviceRepository repository,DeviceService devices){this.repository=repository;this.devices=devices;}
    public Map<String,Object> get(Actor actor,String id){actor.allow("device.view");return repository.proxy(actor,id,false);}
    public Map<String,Object> list(Actor actor,int webType,String protocol,String query,int page,int size,boolean recycled){
        actor.allow("device.view");require(Set.of(0,1,2).contains(webType),400,"代理类型不合法");
        protocol=protocol.trim().toLowerCase(Locale.ROOT);require(protocol.isEmpty()||ProxyOptions.PROTOCOLS.contains(protocol),400,"代理协议不支持");
        require(page>0&&size>0&&size<=200&&query.length()<=200,400,"分页或搜索参数不合法");
        return repository.proxies(actor,webType,protocol,query.trim(),page,size,recycled);
    }
    @Transactional public String save(Actor actor,String id,Map<String,Object> request){
        actor.allow("device.edit");require(request!=null,400,"代理配置不能为空");
        Map<String,Object> previous=id==null?Map.of():repository.proxy(actor,id,true);
        var input=new HashMap<>(previous);input.putAll(request);
        require(!request.containsKey("ipType")||number(request,"ipType")==2,400,"代理管理仅支持用户自有代理");
        input.put("ipType",2);
        input.put("host",ProxySettings.host(required(input,"host",255)));
        if(text(input,"name").isBlank())input.put("name",text(input,"host")+":"+text(input,"port"));
        input.put("changeIpUrl",ProxySettings.changeUrl(text(input,"changeIpUrl")));
        require(text(input,"provider").length()<=150,400,"供应商备注最多 150 字符");
        ProxySettings.expiry(text(input,"expiresAt"));
        // Never persist client-provided status fields through the edit endpoint.
        boolean changed=id!=null&&List.of("protocol","host","port","username","password","webType","mapIp","mapPort").stream().anyMatch(key->!text(previous,key).equals(text(input,key)));
        String saved=devices.save(actor,id,input);repository.proxyMetadata(saved,input,changed);return saved;
    }
    @Transactional public List<String> importAll(Actor actor,List<Map<String,Object>> input){
        actor.allow("device.edit");require(input!=null&&!input.isEmpty()&&input.size()<=500,400,"每批请导入 1—500 条代理");
        var result=new ArrayList<String>();for(var row:input)result.add(save(actor,null,row));return result;
    }
    @Transactional public void recycle(Actor actor,String id,boolean recycled,boolean permanent){
        actor.allow("device.edit");repository.proxy(actor,id,false);devices.recycle(actor,id,recycled,permanent);
    }
    public Map<String,Object> connection(Actor actor,String id){
        actor.allow("device.edit");var own=repository.proxy(actor,id,true);var result=devices.connection(actor,id);
        result.put("changeIpUrl",own.get("changeIpUrl"));return result;
    }
    public Map<String,Object> credentials(Actor actor,String id){
        actor.allow("device.edit");var own=repository.proxy(actor,id,true);
        require(!flag(own,"recycled"),409,"请先恢复代理");
        return Map.of("username",text(own,"username"),"password",text(own,"password"),"proxyOptions",own.get("proxyOptions"));
    }
    @Transactional public Map<String,Object> checkResult(Actor actor,String id,Map<String,Object> request){
        actor.allow("device.edit");var proxy=repository.proxy(actor,id,false);require(!flag(proxy,"recycled"),409,"请先恢复代理");
        require(request!=null&&request.get("connected") instanceof Boolean,400,"检测状态必须是布尔值");
        var input=new HashMap<>(request);input.put("ip",ProxySettings.ip(text(input,"ip")));
        require(!flag(input,"connected")||!text(input,"ip").isEmpty(),400,"连接成功必须提供出口 IP");
        require(text(input,"countryName").length()<=120&&text(input,"message").length()<=500,400,"检测结果超过长度限制");
        if(input.get("latencyMs")!=null){long latency=number(input,"latencyMs");require(latency>=0&&latency<=300000,400,"检测延迟不合法");input.put("latencyMs",latency);}
        repository.proxyCheck(id,input);return repository.proxy(actor,id,false);
    }
}
