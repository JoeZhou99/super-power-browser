package com.superpower.browser.ai;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.Db;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import java.math.BigDecimal;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Coupon holds participate in the same transaction as the native wallet reservation. */
@Service
public class AiCoupons {
    private final Db db;private final AiCatalog catalog;
    public AiCoupons(Db db,AiCatalog catalog){this.db=db;this.catalog=catalog;}
    private Map<String,Object> contract(Map<String,Object> r){
        var out=new LinkedHashMap<String,Object>();out.put("coupon_sn",r.get("couponSn"));out.put("coupon_name",r.get("name"));out.put("activity_name",r.get("name"));out.put("coupon_amount",BigDecimal.valueOf(number(r,"amountCents"),2));out.put("minimum_amount",BigDecimal.valueOf(number(r,"minimumCents"),2));out.put("range",9);out.put("type",1);out.put("collection_at",r.get("createdAt"));out.put("expire_at",r.get("expiresAt"));out.put("collection_at_string",r.get("createdAt"));out.put("expire_at_string",r.get("expiresAt"));return out;
    }
    public Map<String,Object> list(Actor a){
        a.allow("ai.use");var unused=new ArrayList<Map<String,Object>>();var used=new ArrayList<Map<String,Object>>();var expired=new ArrayList<Map<String,Object>>();
        for(var r:rows(db.select("SELECT * FROM ai_coupon WHERE tenant_id=? AND user_id=? ORDER BY amount_cents DESC,expires_at",a.tenantId(),a.id()))){
            if(!text(r,"state").equals("available"))used.add(contract(r));
            else if(AiSubscriptions.instant(r.get("expiresAt")).isAfter(Instant.now()))unused.add(contract(r));else expired.add(contract(r));
        }
        return Map.of("not_use",unused,"use",used,"uinvalide",expired);
    }
    public Map<String,Object> quote(Actor a,Map<String,Object>b){
        a.allow("ai.use");long planId=number(b,"plan_id");var plan=one(db.select("SELECT price FROM ai_plan WHERE id=? AND enabled=TRUE",planId));
        var available=rows(db.select("SELECT * FROM ai_coupon WHERE tenant_id=? AND user_id=? AND state='available' AND expires_at>CURRENT_TIMESTAMP AND minimum_cents<=? AND (plan_id IS NULL OR plan_id=?) ORDER BY amount_cents DESC,expires_at",a.tenantId(),a.id(),number(plan,"price"),planId));
        return Map.of("discount_list",available.stream().map(r->{r.put("amountCents",Math.min(number(r,"amountCents"),number(plan,"price")));return contract(r);}).toList());
    }
    @Transactional public long hold(Actor a,String sn,long plan,long price,String order){
        if(sn.isBlank())return 0;
        var c=one(db.select("SELECT * FROM ai_coupon WHERE coupon_sn=? AND tenant_id=? AND user_id=? FOR UPDATE",sn,a.tenantId(),a.id()));
        require(text(c,"state").equals("available")&&AiSubscriptions.instant(c.get("expiresAt")).isAfter(Instant.now()),409,"优惠券已使用或过期");
        require((c.get("planId")==null||number(c,"planId")==plan)&&price>=number(c,"minimumCents"),400,"优惠券不适用于当前套餐");
        db.execute("UPDATE ai_coupon SET state='held',order_no=? WHERE coupon_sn=?",order,sn);return Math.min(price,number(c,"amountCents"));
    }
    public void paid(String order){db.execute("UPDATE ai_coupon SET state='used' WHERE order_no=? AND state='held'",order);}
    public void release(String order){db.execute("UPDATE ai_coupon SET state='available',order_no=NULL WHERE order_no=? AND state='held'",order);}
    @Transactional public String issue(Actor a,Map<String,Object>b){
        catalog.operator(a);String user=required(b,"userId",36);var target=one(db.select("SELECT tenant_id FROM app_user WHERE id=? AND enabled=TRUE",user));
        long amount=number(b,"amountCents"),minimum=b.containsKey("minimumCents")?number(b,"minimumCents"):0;require(amount>0&&amount<=100000000&&minimum>=0&&minimum<=100000000,400,"优惠券金额不正确");
        Instant expiry;try{expiry=Instant.parse(text(b,"expiresAt"));}catch(Exception e){throw new com.superpower.browser.shared.BusinessException(400,"优惠券有效期格式不正确");}require(expiry.isAfter(Instant.now()),400,"优惠券有效期必须晚于当前时间");
        Long plan=b.containsKey("planId")?number(b,"planId"):null;if(plan!=null)one(db.select("SELECT id FROM ai_plan WHERE id=?",plan));String sn=id();
        db.execute("INSERT INTO ai_coupon(coupon_sn,tenant_id,user_id,name,amount_cents,minimum_cents,plan_id,expires_at) VALUES(?,?,?,?,?,?,?,?)",sn,text(target,"tenantId"),user,required(b,"name",120),amount,minimum,plan,Timestamp.from(expiry));return sn;
    }
}
