package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Enterprise grants select platform relays; user proxy records contain only the exit. */
@Service
public class RelayPoolService {
    private final Db db;
    private final SecretCipher secrets;
    private static final Set<String> SUPPORTED=Set.of("http","https","socks5","ss","vmess","vless");
    private static final String GRANTED="g.tenant_id=? AND g.enabled=TRUE AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP)";
    private record Selection(int poolCount,List<Map<String,Object>> nodes) {}
    public RelayPoolService(Db db,SecretCipher secrets) { this.db=db;this.secrets=secrets; }

    public Map<String,Object> available(Actor actor) {
        require(actor.permissions().contains("device.view")||actor.permissions().contains("proxy.view"),403,"没有该操作权限");
        return Map.of("items",rows(db.select("SELECT p.id,p.name,(SELECT COUNT(*) FROM relay_node n WHERE n.pool_id=p.id AND n.enabled=TRUE) AS node_count FROM relay_pool p JOIN relay_pool_tenant g ON g.pool_id=p.id WHERE p.enabled=TRUE AND "+GRANTED+" AND EXISTS(SELECT 1 FROM relay_node n WHERE n.pool_id=p.id AND n.enabled=TRUE) ORDER BY p.name,p.id",actor.tenantId())));
    }

    /** Disabled pools still count as grants: configured acceleration must not silently fail open. */
    private Selection select(Actor actor) {
        var pools=rows(db.select("SELECT p.id,p.enabled,p.candidate_limit FROM relay_pool p JOIN relay_pool_tenant g ON g.pool_id=p.id WHERE "+GRANTED+" ORDER BY p.id",actor.tenantId()));
        if(pools.isEmpty())return new Selection(0,List.of());
        var nodes=rows(db.select("SELECT n.*,p.name AS pool_name,p.revision AS pool_revision FROM relay_node n JOIN relay_pool p ON p.id=n.pool_id JOIN relay_pool_tenant g ON g.pool_id=p.id WHERE p.enabled=TRUE AND n.enabled=TRUE AND "+GRANTED+" ORDER BY p.id,n.sort_order,n.id",actor.tenantId()));
        var byPool=new HashMap<String,List<Map<String,Object>>>();
        for(var node:nodes)byPool.computeIfAbsent(text(node,"poolId"),ignored->new ArrayList<>()).add(node);
        var candidates=new ArrayList<Map<String,Object>>();
        for(int round=0;round<4&&candidates.size()<4;round++) {
            for(var pool:pools) {
                var choices=byPool.getOrDefault(text(pool,"id"),List.of());
                if(flag(pool,"enabled")&&round<number(pool,"candidateLimit")&&round<choices.size())candidates.add(choices.get(round));
                if(candidates.size()==4)break;
            }
        }
        return new Selection(pools.size(),candidates);
    }

    private static String ineligible(Map<String,Object> device) {
        if(flag(device,"recycled")||(device.get("expiresAt")!=null&&!Instant.parse(text(device,"expiresAt")).isAfter(Instant.now())))return "inactive";
        if(number(device,"ipType")!=2||number(device,"webType")!=2||!SUPPORTED.contains(text(device,"protocol").toLowerCase(Locale.ROOT)))return "unsupported";
        return "";
    }
    private static Map<String,Object> status(Map<String,Object> device,Selection selection) {
        String state=ineligible(device),reason;
        int poolCount=0,candidateCount=0;
        if(state.equals("inactive"))reason="inactive_device";
        else if(state.equals("unsupported"))reason="unsupported_proxy";
        else {
            poolCount=selection.poolCount();candidateCount=selection.nodes().size();
            if(poolCount==0){state="direct";reason="no_authorization";}
            else if(candidateCount==0){state="unavailable";reason="no_available_nodes";}
            else {state="auto";reason="available";}
        }
        return Map.of("mode","automatic","status",state,"reason",reason,"poolCount",poolCount,"candidateCount",candidateCount);
    }

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> describe(Actor actor,Map<String,Object> device) {
        var result=new LinkedHashMap<>(device);
        result.put("acceleration",status(device,ineligible(device).isEmpty()?select(actor):new Selection(0,List.of())));
        return result;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @SuppressWarnings("unchecked")
    public Map<String,Object> describePage(Actor actor,Map<String,Object> page) {
        var devices=(List<Map<String,Object>>)page.get("items");
        var selection=devices.stream().anyMatch(device->ineligible(device).isEmpty())?select(actor):new Selection(0,List.of());
        var result=new LinkedHashMap<>(page);
        result.put("items",devices.stream().map(device->{var item=new LinkedHashMap<>(device);item.put("acceleration",status(device,selection));return item;}).toList());
        return result;
    }

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @SuppressWarnings("unchecked")
    public Map<String,Object> decorate(Actor actor,Map<String,Object> device,Map<String,Object> proxy) {
        var selection=ineligible(device).isEmpty()?select(actor):new Selection(0,List.of());
        var acceleration=status(device,selection);
        require(!text(acceleration,"status").equals("unavailable"),409,"企业加速服务暂不可用：已授权的线路组已停用或没有可用节点，请联系管理员");
        var result=new LinkedHashMap<String,Object>(proxy);result.put("acceleration",acceleration);
        if(!text(acceleration,"status").equals("auto"))return result;
        var metadata=new ArrayList<Map<String,Object>>();
        var candidates=new ArrayList<Map<String,Object>>();
        var selectedPools=new LinkedHashMap<String,Map<String,Object>>();
        var exitOptions=new LinkedHashMap<String,Object>((Map<String,Object>)proxy.getOrDefault("proxyOptions",Map.of()));
        for(var node:selection.nodes()) {
            var transit=new LinkedHashMap<String,Object>();
            for(String key:List.of("protocol","host","port","username"))transit.put(key,node.get(key));
            transit.put("password",secrets.decrypt(text(node,"password")));
            transit.put("proxyOptions",object(text(node,"proxyOptions")));
            var options=new LinkedHashMap<String,Object>(exitOptions);options.put("transit",transit);
            var candidate=new LinkedHashMap<String,Object>();
            for(String key:List.of("protocol","host","port","username","password"))candidate.put(key,proxy.get(key));
            candidate.put("proxyOptions",options);candidates.add(candidate);
            metadata.add(Map.of("id",text(node,"id"),"name",text(node,"name"),"region",text(node,"region"),"poolId",text(node,"poolId"),"poolName",text(node,"poolName")));
            selectedPools.put(text(node,"poolId"),node);
        }
        var primaryOptions=new LinkedHashMap<String,Object>((Map<String,Object>)candidates.get(0).get("proxyOptions"));
        primaryOptions.put("alternatives",new ArrayList<>(candidates.subList(1,candidates.size())));
        result.put("proxyOptions",primaryOptions);
        var first=selection.nodes().get(0);boolean single=selectedPools.size()==1;
        long revision=selectedPools.values().stream().mapToLong(node->number(node,"poolRevision")).sum();
        result.put("relayPool",Map.of("id",single?text(first,"poolId"):"automatic","name",single?text(first,"poolName"):"自动加速","revision",revision,"automatic",true,
            "probeIntervalMs",60000,"failureThreshold",3,"cooldownMs",120000,"candidates",metadata));
        return result;
    }
}
