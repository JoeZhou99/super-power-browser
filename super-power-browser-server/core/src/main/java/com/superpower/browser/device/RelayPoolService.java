package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Explicit per-proxy relay bindings, rechecked against current enterprise grants. */
@Service
public class RelayPoolService {
    private final Db db;
    private final SecretCipher secrets;
    private static final Set<String> SUPPORTED=Set.of("http","https","socks5","ss","vmess","vless");
    private static final String GRANTED="g.tenant_id=? AND g.enabled=TRUE AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP)";
    private record Selection(int boundCount,List<Map<String,Object>> nodes) {}
    public RelayPoolService(Db db,SecretCipher secrets) { this.db=db;this.secrets=secrets; }
    public Map<String,Object> available(Actor actor) {
        require(actor.permissions().contains("device.view")||actor.permissions().contains("proxy.view"),403,"没有该操作权限");
        return Map.of("items",rows(db.select("SELECT p.id,p.name,(SELECT COUNT(*) FROM relay_node n WHERE n.pool_id=p.id AND n.enabled=TRUE) AS node_count FROM relay_pool p JOIN relay_pool_tenant g ON g.pool_id=p.id WHERE p.enabled=TRUE AND "+GRANTED+" ORDER BY p.name,p.id",actor.tenantId())));
    }
    private Selection select(Actor actor,Map<String,Object> device) {
        String deviceId=text(device,"id");
        int count=(int)number(one(db.select("SELECT COUNT(*) AS total FROM device_relay_node b JOIN device d ON d.id=b.device_id WHERE b.device_id=? AND d.tenant_id=?",deviceId,actor.tenantId())),"total");
        if(count==0||!ineligible(device).isEmpty())return new Selection(count,List.of());
        var nodes=rows(db.select("SELECT n.*,p.name AS pool_name,p.revision AS pool_revision FROM device_relay_node b JOIN device d ON d.id=b.device_id JOIN relay_node n ON n.id=b.node_id JOIN relay_pool p ON p.id=n.pool_id JOIN relay_pool_tenant g ON g.pool_id=p.id WHERE b.device_id=? AND d.tenant_id=? AND p.enabled=TRUE AND n.enabled=TRUE AND "+GRANTED+" ORDER BY b.sort_order,n.id LIMIT 8",deviceId,actor.tenantId(),actor.tenantId()));
        return new Selection(count,nodes);
    }
    private static String ineligible(Map<String,Object> device) {
        if(flag(device,"recycled")||(device.get("expiresAt")!=null&&!Instant.parse(text(device,"expiresAt")).isAfter(Instant.now())))return "inactive";
        if(number(device,"ipType")!=2||number(device,"webType")!=2||!SUPPORTED.contains(text(device,"protocol").toLowerCase(Locale.ROOT)))return "unsupported";
        return "";
    }
    private static Map<String,Object> status(Map<String,Object> device,Selection selection) {
        String state=ineligible(device),reason;
        if(state.equals("inactive"))reason="inactive_device";
        else if(state.equals("unsupported"))reason="unsupported_proxy";
        else if(selection.boundCount()==0){state="direct";reason="no_bindings";}
        else if(selection.nodes().isEmpty()){state="unavailable";reason="no_available_bound_nodes";}
        else {state="auto";reason="available";}
        return Map.of("mode","bindings","status",state,"reason",reason,"poolCount",selection.nodes().stream().map(n->text(n,"poolId")).distinct().count(),"candidateCount",selection.nodes().size(),"boundCount",selection.boundCount(),"directAvailable",!state.equals("inactive"));
    }
    private Map<String,Object> described(Actor actor,Map<String,Object> device) {
        return described(device,select(actor,device));
    }
    private static Map<String,Object> described(Map<String,Object> device,Selection selection) {
        var result=new LinkedHashMap<>(device);
        result.put("acceleration",status(device,selection));result.put("relayCount",selection.boundCount());result.put("relayAvailableCount",selection.nodes().size());return result;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> describe(Actor actor,Map<String,Object> device) {return described(actor,device);}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @SuppressWarnings("unchecked")
    public Map<String,Object> describePage(Actor actor,Map<String,Object> page) {
        var result=new LinkedHashMap<>(page);
        var devices=(List<Map<String,Object>>)page.get("items");
        if(devices.isEmpty())return result;
        var ids=devices.stream().map(d->text(d,"id")).distinct().toList();
        var countArgs=new ArrayList<Object>();countArgs.add(actor.tenantId());countArgs.addAll(ids);
        var counts=new HashMap<String,Integer>();
        for(var row:rows(db.select("SELECT b.device_id,COUNT(*) AS total FROM device_relay_node b JOIN device d ON d.id=b.device_id WHERE d.tenant_id=? AND b.device_id IN ("+placeholders(ids.size())+") GROUP BY b.device_id",countArgs.toArray())))
            counts.put(text(row,"deviceId"),(int)number(row,"total"));
        var nodes=new HashMap<String,List<Map<String,Object>>>();
        var eligible=devices.stream().filter(d->ineligible(d).isEmpty()&&counts.getOrDefault(text(d,"id"),0)>0).map(d->text(d,"id")).distinct().toList();
        if(!eligible.isEmpty()) {
            var nodeArgs=new ArrayList<Object>();nodeArgs.add(actor.tenantId());nodeArgs.add(actor.tenantId());nodeArgs.addAll(eligible);
            // List decoration needs only node/group identities, never encrypted credentials.
            for(var row:rows(db.select("SELECT b.device_id,n.id,n.pool_id FROM device_relay_node b JOIN device d ON d.id=b.device_id JOIN relay_node n ON n.id=b.node_id JOIN relay_pool p ON p.id=n.pool_id JOIN relay_pool_tenant g ON g.pool_id=p.id WHERE d.tenant_id=? AND p.enabled=TRUE AND n.enabled=TRUE AND "+GRANTED+" AND b.device_id IN ("+placeholders(eligible.size())+") ORDER BY b.device_id,b.sort_order,n.id",nodeArgs.toArray()))) {
                var selected=nodes.computeIfAbsent(text(row,"deviceId"),key->new ArrayList<>());
                if(selected.size()<8)selected.add(row);
            }
        }
        result.put("items",devices.stream().map(d->described(d,new Selection(counts.getOrDefault(text(d,"id"),0),nodes.getOrDefault(text(d,"id"),List.of())))).toList());return result;
    }
    private static String placeholders(int count){return String.join(",",Collections.nCopies(count,"?"));}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @SuppressWarnings("unchecked")
    public Map<String,Object> decorate(Actor actor,Map<String,Object> device,Map<String,Object> proxy) {
        var selection=select(actor,device);var result=new LinkedHashMap<String,Object>(proxy);
        result.put("acceleration",status(device,selection));
        if(!ineligible(device).isEmpty())return result;
        var exitOptions=new LinkedHashMap<String,Object>(ProxyOptions.protocolOnly((Map<String,Object>)proxy.getOrDefault("proxyOptions",Map.of())));
        var metadata=new ArrayList<Map<String,Object>>();
        metadata.add(Map.of("id","direct","name","直连代理","kind","direct","region",text(proxy,"region")));
        var alternatives=new ArrayList<Map<String,Object>>();
        for(var node:selection.nodes()) {
            var transit=new LinkedHashMap<String,Object>();
            for(String key:List.of("protocol","host","port","username"))transit.put(key,node.get(key));
            transit.put("password",secrets.decrypt(text(node,"password")));transit.put("proxyOptions",object(text(node,"proxyOptions")));
            var options=new LinkedHashMap<String,Object>(exitOptions);options.put("transit",transit);
            var candidate=new LinkedHashMap<String,Object>();
            for(String key:List.of("protocol","host","port","username","password"))candidate.put(key,proxy.get(key));
            candidate.put("proxyOptions",options);alternatives.add(candidate);
            metadata.add(Map.of("id",text(node,"id"),"name",text(node,"name"),"kind","relay","region",text(node,"region"),"poolId",text(node,"poolId"),"poolName",text(node,"poolName")));
        }
        if(!alternatives.isEmpty())exitOptions.put("alternatives",alternatives);result.put("proxyOptions",exitOptions);
        result.put("relayPool",Map.of("id","bindings","name","已绑定中继","revision",number(device,"relayBindingRevision"),"automatic",true,"probeIntervalMs",60000,"failureThreshold",3,"cooldownMs",120000,"candidates",metadata));
        return result;
    }
    /** Node identities and credentials/config both participate in snapshot invalidation. */
    public static String snapshot(Map<String,Object> proxy) {
        var connection=new LinkedHashMap<String,Object>();
        for(String key:List.of("id","protocol","host","port","username","password","proxyOptions","relayPool"))if(proxy.containsKey(key))connection.put(key,proxy.get(key));
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json(ordered(connection)).getBytes(StandardCharsets.UTF_8)));}
        catch(Exception error){throw new IllegalStateException("Cannot calculate proxy snapshot",error);}
    }
    private static Object ordered(Object value) {
        if(value instanceof Map<?,?> map){var sorted=new TreeMap<String,Object>();map.forEach((k,v)->sorted.put(String.valueOf(k),ordered(v)));return sorted;}
        if(value instanceof List<?> list)return list.stream().map(RelayPoolService::ordered).toList();return value;
    }
}
