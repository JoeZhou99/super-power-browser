package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class DeviceService implements DeviceAccess {
    private final DeviceRepository repository;
    public DeviceService(DeviceRepository repository) { this.repository=repository; }
    public Map<String,Object> get(Actor a,String id) { a.allow("device.view"); return repository.get(a,id,false); }
    public Map<String,Object> list(Actor a,int type,String category,String query,int page,int size,boolean recycled) {
        a.allow("device.view");
        require(Set.of(1,2,20).contains(type),400,"设备类型不支持");
        require(page>0 && size>0 && size<=200,400,"分页参数不合法");
        return repository.list(a,type,category,query,page,size,recycled);
    }
    public Map<String,Long> statistics(Actor a,int type,boolean recycled) {
        Map<String,Long> counts=new LinkedHashMap<>();
        for(String c:List.of("allIp","willExpiredIp","expiredIp","unbindMall","unAutoRenew","autoRenew")) counts.put(c,(Long)list(a,type,c,"",1,1,recycled).get("total"));
        return counts;
    }
    @Transactional
    public String save(Actor a,String deviceId,Map<String,Object> request) {
        a.allow("device.edit");
        var input=new HashMap<>(request);
        Map<String,Object> previous=Map.of();
        input.put("name",required(input,"name",120));
        if(deviceId!=null) {
            previous=repository.get(a,deviceId,true);
            require(!flag(previous,"recycled"),409,"请先恢复设备");
            if(number(previous,"ipType")!=2) { repository.describe(deviceId,text(input,"name"),text(input,"remark")); return deviceId; }
            if(!input.containsKey("password")) input.put("password",text(previous,"password"));
            for(String key:List.of("webType","protocolFamily","mapIp","mapPort","proxyOptions"))input.putIfAbsent(key,previous.get(key));
        }
        String host=ProxySettings.host(required(input,"host",255)),protocol=required(input,"protocol",10).toLowerCase(Locale.ROOT);
        long port=number(input,"port");
        require(ProxyOptions.PROTOCOLS.contains(protocol),400,"支持 HTTP、HTTPS、SOCKS5、SSH、SS、SSR、VMess 和 VLESS 代理");
        require(port>0 && port<=65535,400,"端口范围为 1—65535");
        require(!host.contains("/") && !host.contains("@") && !host.contains(" "),400,"请输入不带协议的代理主机地址");
        input.put("host",host); input.put("protocol",protocol);
        require(text(input,"username").length()<=255&&text(input,"remark").length()<=1000&&text(input,"region").length()<=150,400,"代理账号、备注或地区超出长度限制");
        require(!protocol.equals("ssh")||!text(input,"username").isBlank(),400,"SSH 代理需要填写用户名");
        input.putIfAbsent("webType",2);input.putIfAbsent("protocolFamily",host.contains(":")?2:1);input.putIfAbsent("mapIp","");input.putIfAbsent("mapPort",0);
        require(Set.of(1L,2L).contains(number(input,"webType")),400,"请选择动态或静态网络");
        require(Set.of(1L,2L).contains(number(input,"protocolFamily")),400,"IP 类型只能为 IPv4 或 IPv6");
        require(text(input,"mapIp").length()<=255&&!text(input,"mapIp").matches(".*[\\s/@].*"),400,"映射 IP 不合法");
        require(number(input,"mapPort")>=0&&number(input,"mapPort")<=65535,400,"映射端口范围为 0—65535");
        input.put("proxyOptions",ProxyOptions.normalize(input));
        if(deviceId==null) {
            require(!input.containsKey("ipType") || number(input,"ipType")==2,400,"仅自有设备可手工添加");
            deviceId=id(); repository.createOwn(deviceId,a,input);
        } else repository.updateOwn(deviceId,input);
        repository.network(deviceId,input);
        if(!previous.isEmpty()) {
            var before=previous;
            boolean changed=List.of("protocol","host","port","username","password","webType","protocolFamily","mapIp","mapPort").stream().anyMatch(key->!text(before,key).equals(text(input,key)))||!Objects.equals(previous.get("proxyOptions"),input.get("proxyOptions"));
            if(changed)repository.invalidateCheck(deviceId);
        }
        return deviceId;
    }
    @Transactional
    public void recycle(Actor a,String deviceId,boolean recycled,boolean permanent) {
        a.allow("device.edit"); var device=repository.get(a,deviceId,false);
        require(!repository.bound(deviceId),409,"设备仍被店铺绑定，请先解绑");
        if(permanent) { require(flag(device,"recycled"),409,"只有回收站设备可永久删除"); repository.delete(deviceId); }
        else repository.recycle(deviceId,recycled);
    }
    public Map<String,Object> connection(Actor a,String deviceId) {
        a.allow("device.edit"); var device=repository.get(a,deviceId,true); requireUsable(device);
        return proxy(device);
    }
    public void autoRenew(Actor a,String deviceId,boolean enabled) {
        a.allow("device.renew"); var device=repository.get(a,deviceId,false);
        require(number(device,"ipType")!=2 && !flag(device,"recycled"),400,"该设备不支持自动续费");
        repository.autoRenew(deviceId,enabled,a.id());
    }
    @Override public void requireBindable(Actor a,String deviceId) {
        a.allow("device.view"); requireUsable(repository.get(a,deviceId,false));
    }
    @Override public Map<String,Object> launchProxy(Actor a,String deviceId) {
        // 启动由店铺域检查 shop.open 和资源授权，无需额外授予设备管理权限。
        var device=repository.get(a,deviceId,true); requireUsable(device); return proxy(device);
    }
    private static Map<String,Object> proxy(Map<String,Object> device) {
        var proxy=new LinkedHashMap<String,Object>();
        for(String key:List.of("protocol","host","port","username","password","id","name","ipType","region","expiresAt","webType","protocolFamily","mapIp","mapPort","proxyOptions")) proxy.put(key,device.get(key));
        return proxy;
    }
    public List<Map<String,Object>> renewalCandidates() { return repository.renewals(); }
    private static void requireUsable(Map<String,Object> device) {
        require(!flag(device,"recycled"),409,"设备已回收");
        require(device.get("expiresAt")==null || Instant.parse(text(device,"expiresAt")).isAfter(Instant.now()),409,"设备已到期");
    }
    @Transactional public List<String> importDevices(Actor a,List<Map<String,Object>> input) {
        require(input.size()<=200,400,"单次最多导入 200 台设备");
        a.allow("device.edit");
        var result=new ArrayList<String>();
        for(var item:input) {
            String deviceId=text(item,"id");
            if(!deviceId.isBlank())require(number(repository.get(a,deviceId,false),"ipType")==2,400,"只能导入编辑自有设备");
            result.add(save(a,deviceId.isBlank()?null:deviceId,item));
        }
        return result;
    }
    @Transactional public String importOwnRow(Actor a,Map<String,Object> item) {
        a.allow("device.edit");var input=new HashMap<>(item);
        String host=required(input,"host",255),deviceId=text(input,"id");long port=number(input,"port");
        input.put("region",required(input,"region",120));input.put("protocol",required(input,"protocol",10).toLowerCase(Locale.ROOT));
        if(deviceId.isBlank()){
            var matches=repository.ownByEndpoint(a,host,port);
            require(matches.size()<=1,409,"存在多个相同地址和端口的自有设备，请在列表中逐台编辑");
            if(!matches.isEmpty())deviceId=text(matches.get(0),"id");
        }
        if(!deviceId.isBlank()){
            var previous=repository.get(a,deviceId,false);require(number(previous,"ipType")==2,400,"只能导入编辑自有设备");
            if(text(input,"name").isBlank())input.put("name",previous.get("name"));
            if(text(input,"password").isBlank())input.remove("password");
            input.putIfAbsent("remark",previous.get("remark"));
        }
        if(text(input,"name").isBlank())input.put("name",host+":"+port);
        return save(a,deviceId.isBlank()?null:deviceId,input);
    }
}
