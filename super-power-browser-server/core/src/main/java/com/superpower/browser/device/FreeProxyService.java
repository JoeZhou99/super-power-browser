package com.superpower.browser.device;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.config.BrowserConfiguration;
import com.superpower.browser.shared.Db;
import com.superpower.browser.shared.SecretCipher;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Allocates one operator-published VPS proxy to a new tenant without charging the wallet. */
@Service
public class FreeProxyService {
    private final Db db; private final BrowserConfiguration configs; private final DeviceService devices; private final SecretCipher secrets;
    public FreeProxyService(Db db, BrowserConfiguration configs, DeviceService devices, SecretCipher secrets) { this.db=db; this.configs=configs; this.devices=devices; this.secrets=secrets; }
    public Map<String,Object> availability(Actor actor) {
        actor.allow("proxy.view");
        boolean claimed=!db.select("SELECT id FROM free_proxy_claim WHERE tenant_id=?",actor.tenantId()).isEmpty();
        long available=0;
        for(var offer:configs.freeProxyPool()) if(flag(offer,"enabled")) {
            long stock=Math.max(0,number(offer,"stock")); long used=number(one(db.select("SELECT COUNT(*) AS total FROM free_proxy_claim WHERE offer_id=?",text(offer,"id"))),"total"); available+=Math.max(0,stock-used);
        }
        return Map.of("eligible",actor.owner()&&!claimed,"claimed",claimed,"available",available);
    }
    @Transactional
    public Map<String,Object> claim(Actor actor) {
        actor.allow("proxy.view"); require(actor.owner(),403,"只有企业所有者可以领取免费代理");
        require(db.select("SELECT id FROM free_proxy_claim WHERE tenant_id=? FOR UPDATE",actor.tenantId()).isEmpty(),409,"当前企业已经领取过免费代理");
        db.select("SELECT config_key FROM browser_config WHERE config_key=? FOR UPDATE","free-proxies");
        Map<String,Object> selected=null;
        for(var offer:configs.freeProxyPool()) {
            if(!flag(offer,"enabled")) continue;
            long stock=Math.max(0,number(offer,"stock")); long used=number(one(db.select("SELECT COUNT(*) AS total FROM free_proxy_claim WHERE offer_id=?",text(offer,"id"))),"total");
            if(used<stock){ selected=offer; break; }
        }
        require(selected!=null,409,"免费代理已领取完，请关注后续活动");
        var input=new LinkedHashMap<String,Object>();
        input.put("name",text(selected,"name")); input.put("protocol",text(selected,"protocol")); input.put("host",text(selected,"host")); input.put("port",number(selected,"port"));
        input.put("username",text(selected,"username")); input.put("password",secrets.decrypt(text(selected,"password"))); input.put("region",text(selected,"region")); input.put("remark","新用户免费领取"); input.put("webType",2); input.put("provider",text(selected,"provider"));
        String deviceId=devices.save(actor,null,input);
        db.execute("INSERT INTO free_proxy_claim(id,tenant_id,user_id,offer_id,device_id) VALUES(?,?,?,?,?)",id(),actor.tenantId(),actor.id(),text(selected,"id"),deviceId);
        return Map.of("deviceId",deviceId,"name",text(selected,"name"),"region",text(selected,"region"));
    }
}
