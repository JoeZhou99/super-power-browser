package com.superpower.browser.ai;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.billing.*;
import com.superpower.browser.shared.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import java.sql.Timestamp;
import java.time.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Short database transactions; payment network calls never hold order or quota locks. */
@Service
public class AiSubscriptions {
    private final Db db; private final AiIds ids; private final AiBilling billing; private final PaymentGateway payments;
    private final AiCoupons coupons; private final AiCatalog catalog; private final TransactionTemplate tx;
    public AiSubscriptions(Db db,AiIds ids,AiBilling billing,PaymentGateway payments,AiCatalog catalog,AiCoupons coupons,PlatformTransactionManager tm){this.db=db;this.ids=ids;this.billing=billing;this.payments=payments;this.catalog=catalog;this.coupons=coupons;tx=new TransactionTemplate(tm);}
    private static Timestamp now(){return Timestamp.from(Instant.now());}
    private Map<String,Object> plan(long id){return one(db.select("SELECT * FROM ai_plan WHERE id=? AND enabled=TRUE",id));}
    private Map<String,Object> order(Actor a,String id,boolean lock){return one(db.select("SELECT o.*,p.name,p.token_limit,p.duration_months,p.trial_days,p.unlimited,s.start_at,s.end_at FROM ai_order o JOIN ai_plan p ON p.id=o.plan_id LEFT JOIN ai_subscription s ON s.id=o.subscription_id WHERE o.order_no=? AND o.user_id=? AND o.tenant_id=?"+(lock?" FOR UPDATE":""),id,a.id(),a.tenantId()));}
    public List<Map<String,Object>> plans(Actor a){a.allow("ai.use");return rows(db.select("SELECT id,name,price,display_price,discount,token_limit AS total_amount,duration_months AS duration_value,unlimited FROM ai_plan WHERE enabled=TRUE ORDER BY price,id")).stream().map(m->{m.put("duration_unit","month");m.put("quota_reset_period","none");return snake(m);}).toList();}
    public List<Map<String,Object>> subscriptions(Actor a){
        a.allow("ai.use");var rows=rows(db.select("SELECT s.*,p.name FROM ai_subscription s JOIN ai_plan p ON p.id=s.plan_id WHERE s.tenant_id=? AND s.user_id=? ORDER BY s.end_at DESC",a.tenantId(),a.id()));
        return rows.stream().map(m->{m.put("subscriptionId",m.get("id"));m.put("totalAmount",number(m,"tokenLimit"));m.put("usedAmount",number(m,"usedTokens"));m.put("remainAmount",Math.max(0,number(m,"tokenLimit")-number(m,"usedTokens")-number(m,"reservedTokens")));m.put("quotaResetPeriod","none");m.put("cycleEndAt",m.get("endAt"));if(instant(m.get("endAt")).isBefore(Instant.now()))m.put("status","expired");if(instant(m.get("startAt")).isAfter(Instant.now()))m.put("status","pending");m.remove("tenantId");m.remove("userId");return snake(m);}).toList();
    }
    private void lockUser(Actor a){one(db.select("SELECT id FROM app_user WHERE id=? AND tenant_id=? FOR UPDATE",a.id(),a.tenantId()));}
    public Map<String,Object> trial(Actor a){
        a.allow("ai.use");var eligible=rows(db.select("SELECT * FROM ai_plan WHERE enabled=TRUE AND trial_days>0 ORDER BY id LIMIT 1"));
        var claimedRows=rows(db.select("SELECT * FROM ai_subscription WHERE user_id=? AND trial=TRUE ORDER BY id LIMIT 1",a.id()));
        boolean claimed=!claimedRows.isEmpty();
        var result=new LinkedHashMap<String,Object>();result.put("enabled",!eligible.isEmpty());result.put("can_claim",!claimed&&!eligible.isEmpty());result.put("reason",claimed?"已领取过体验套餐":eligible.isEmpty()?"暂无体验活动":"");
        if(!eligible.isEmpty()){var p=eligible.get(0);result.put("unlimited",p.get("unlimited"));result.put("plan_id",p.get("id"));result.put("name",p.get("name"));result.put("duration_days",p.get("trialDays"));result.put("total_amount",p.get("tokenLimit"));}
        if(claimed){var previous=claimedRows.get(0);result.put("subscription_id",previous.get("id"));result.put("order_no",previous.get("orderNo"));result.put("grant_status",2);result.put("start_at",previous.get("startAt"));result.put("end_at",previous.get("endAt"));}
        return result;
    }
    public Object claim(Actor a){
        a.allow("ai.use");return tx.execute(status->{lockUser(a);var activity=trial(a);require(flag(activity,"can_claim"),409,text(activity,"reason"));
            long plan=number(activity,"plan_id");String no="AIT"+id();
            db.execute("INSERT INTO ai_order(order_no,tenant_id,user_id,request_id,plan_id,price,pay_type,expires_at,trial) VALUES(?,?,?,?,?,0,0,?,TRUE)",no,a.tenantId(),a.id(),"trial",plan,now());
            grant(a,no,true,null);return info(a,no,false);
        });
    }
    public Object create(Actor a,Map<String,Object> b,boolean renewal){
        a.allow("ai.use");a.allow("ai.purchase");String request=required(b,"request_id",100);long planId=number(b,"plan_id");int type=(int)number(b,"pay_type");
        require(Set.of(1,4).contains(type),400,"仅支持支付宝或微信支付");String coupon=text(b,"coupon_sn");
        String channel=type==1?"alipay":"wechat";
        String no=tx.execute(status->{lockUser(a);var old=rows(db.select("SELECT * FROM ai_order WHERE user_id=? AND tenant_id=? AND request_id=?",a.id(),a.tenantId(),request));
            if(!old.isEmpty()){var o=old.get(0);require(number(o,"planId")==planId&&number(o,"payType")==type&&flag(o,"renewal")==renewal&&text(o,"couponSn").equals(coupon),409,"请求编号已用于其他订单");return text(o,"orderNo");}
            var p=plan(planId);long price=number(p,"price");
            String oid=id();long discount=coupons.hold(a,coupon,planId,price,oid);price-=discount;require(price==0||payments.available(channel),503,"支付渠道尚未配置");billing.create(a,oid,price,channel,Map.of("planId",planId,"tokenLimit",number(p,"tokenLimit"),"durationMonths",number(p,"durationMonths")));
            db.execute("INSERT INTO ai_order(order_no,tenant_id,user_id,request_id,plan_id,price,pay_type,balance_amount,online_amount,renewal,pay_status,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,1,?)",oid,a.tenantId(),a.id(),request,planId,price,type,0,price,renewal,Timestamp.from(Instant.now().plusSeconds(1800)));
            db.execute("UPDATE ai_order SET coupon_sn=?,discount_amount=? WHERE order_no=?",coupon,discount,oid);
            if(price==0)grant(a,oid,false,null);return oid;
        });
        var o=order(a,no,false);
        if(number(o,"payStatus")==1&&text(o,"payUrl").isBlank()&&instant(o.get("expiresAt")).isAfter(Instant.now())){
            var checkout=payments.create(no,number(o,"onlineAmount"),channel,instant(o.get("expiresAt")));
            require(checkout.paymentUrl()!=null&&!checkout.paymentUrl().isBlank(),502,"支付渠道未返回支付地址");
            tx.executeWithoutResult(s->{var current=order(a,no,true);if(number(current,"payStatus")!=1)return;db.execute("UPDATE ai_order SET pay_url=? WHERE order_no=?",checkout.paymentUrl(),no);billing.checkout(no,checkout);});
        }
        return info(a,no,false);
    }
    public Map<String,Object> info(Actor a,String no,boolean refresh){
        a.allow("ai.use");var o=order(a,no,false);
        if(refresh&&number(o,"payStatus")==1){
            int type=(int)number(o,"payType");String channel=type==1?"alipay":"wechat";
            var p=payments.query(no,channel);
            if(p.paid())tx.executeWithoutResult(s->{var current=order(a,no,true);require(p.transactionId()!=null&&!p.transactionId().isBlank()&&p.amountCents()==number(current,"onlineAmount")&&"CNY".equals(p.currency()),409,"支付流水金额或币种不匹配");grant(a,no,false,p.transactionId());});
            else if(instant(o.get("expiresAt")).isBefore(Instant.now()))tx.executeWithoutResult(s->{var current=order(a,no,true);if(number(current,"payStatus")==1){billing.cancel(no);coupons.release(no);db.execute("UPDATE ai_order SET pay_status=3,grant_status=3 WHERE order_no=?",no);}});
            o=order(a,no,false);
        }
        var result=new LinkedHashMap<String,Object>();for(String key:List.of("orderNo","planId","name","price","payType","payUrl","payStatus","grantStatus","subscriptionId","startAt","endAt","createdAt"))result.put(key,o.get(key));
        result.put("payAmount",o.get("onlineAmount"));result.put("totalAmount",o.get("tokenLimit"));result.put("expectedEndAt",o.get("endAt"));return snake(result);
    }
    private void grant(Actor a,String no,boolean trial,String transaction){
        var o=order(a,no,true);if(number(o,"grantStatus")==2)return;
        long sid=ids.next();Instant start=Instant.now();
        if(flag(o,"renewal")){var previous=rows(db.select("SELECT end_at FROM ai_subscription WHERE user_id=? AND plan_id=? AND status='active' AND end_at>? ORDER BY end_at DESC LIMIT 1 FOR UPDATE",a.id(),number(o,"planId"),now()));if(!previous.isEmpty())start=instant(previous.get(0).get("endAt"));}
        Instant end=trial?start.plusSeconds(number(o,"trialDays")*86400):start.atZone(ZoneOffset.UTC).plusMonths(number(o,"durationMonths")).toInstant();
        db.execute("INSERT INTO ai_subscription(id,tenant_id,user_id,plan_id,order_no,token_limit,start_at,end_at,status,trial) VALUES(?,?,?,?,?,?,?,?, 'active',?)",sid,a.tenantId(),a.id(),number(o,"planId"),no,number(o,"tokenLimit"),Timestamp.from(start),Timestamp.from(end),trial);
        db.execute("UPDATE ai_subscription SET unlimited=? WHERE id=?",flag(o,"unlimited"),sid);
        if(!trial){billing.paid(no,transaction);coupons.paid(no);}
        db.execute("UPDATE ai_order SET pay_status=2,grant_status=2,subscription_id=?,provider_transaction=? WHERE order_no=?",sid,transaction,no);
    }
    public Object usage(Actor a,Map<String,Object> b){
        a.allow("ai.use");int page=(int)Math.max(1,number(b.containsKey("page")?b:Map.of("page",1),"page")),limit=(int)Math.max(1,Math.min(100,b.containsKey("limit")?number(b,"limit"):20));
        String where="tenant_id=? AND user_id=?";var args=new ArrayList<Object>(List.of(a.tenantId(),a.id()));
        if(!text(b,"model").isBlank()){where+=" AND model_name=?";args.add(text(b,"model"));}
        for(String field:List.of("start_at","end_at"))if(b.containsKey(field)&&number(b,field)>0){where+=" AND started_at"+(field.equals("start_at")?">=":"<=")+"?";args.add(Timestamp.from(Instant.ofEpochSecond(number(b,field))));}
        long total=number(one(db.select("SELECT COUNT(*) total FROM ai_usage WHERE "+where,args.toArray())),"total");args.add(limit);args.add((page-1)*limit);
        var items=rows(db.select("SELECT id,id request_id,model_name model,input_tokens,output_tokens,charged_tokens quota,started_at created_at,subscription_id,status,estimated FROM ai_usage WHERE "+where+" ORDER BY started_at DESC LIMIT ? OFFSET ?",args.toArray()));
        return Map.of("list",items.stream().map(AiSubscriptions::snake).toList(),"total",total);
    }
    public String reserve(Actor a,String model,long tokens){
        require(tokens>0&&tokens<=2000000,400,"请求额度超限");return tx.execute(s->{lockUser(a);var available=rows(db.select("SELECT * FROM ai_subscription WHERE user_id=? AND tenant_id=? AND status='active' AND start_at<=? AND end_at>? AND (unlimited=TRUE OR token_limit-used_tokens-reserved_tokens>=?) ORDER BY end_at,id LIMIT 1 FOR UPDATE",a.id(),a.tenantId(),now(),now(),tokens));
            require(!available.isEmpty(),402,"模型套餐未开通、已到期或剩余额度不足");long sid=number(available.get(0),"id");String request=id();
            db.execute("UPDATE ai_subscription SET reserved_tokens=reserved_tokens+? WHERE id=?",tokens,sid);
            db.execute("INSERT INTO ai_usage(id,tenant_id,user_id,subscription_id,model_name,status,reserved_tokens) VALUES(?,?,?,?,?,'running',?)",request,a.tenantId(),a.id(),sid,model,tokens);return request;});
    }
    public void settle(String request,long input,long output,boolean estimated,boolean success){tx.executeWithoutResult(s->{
        var use=one(db.select("SELECT * FROM ai_usage WHERE id=? FOR UPDATE",request));if(!text(use,"status").equals("running"))return;
        long held=number(use,"reservedTokens"),charged=Math.max(0,input)+Math.max(0,output);
        db.execute("UPDATE ai_subscription SET reserved_tokens=reserved_tokens-?,used_tokens=used_tokens+? WHERE id=?",held,charged,number(use,"subscriptionId"));
        db.execute("UPDATE ai_usage SET input_tokens=?,output_tokens=?,charged_tokens=?,estimated=?,status=?,finished_at=CURRENT_TIMESTAMP WHERE id=?",input,output,charged,estimated,success?"completed":"interrupted",request);
    });}
    public void savePlan(Actor a,Map<String,Object> b){catalog.operator(a);long id=number(b,"id"),price=number(b,"price"),tokens=number(b,"tokenLimit"),months=number(b,"durationMonths"),days=number(b,"trialDays");require(price>0&&price<=100000000&&tokens>0&&tokens<=100000000000L&&months>=1&&months<=120&&days>=0&&days<=90,400,"套餐参数不正确");
        tx.executeWithoutResult(s->{var old=rows(db.select("SELECT id FROM ai_plan WHERE id=? FOR UPDATE",id));if(old.isEmpty())db.execute("INSERT INTO ai_plan(id,name,price,display_price,discount,token_limit,duration_months,trial_days,enabled) VALUES(?,?,?,?,?,?,?,?,?)",id,required(b,"name",120),price,number(b,"displayPrice"),number(b,"discount"),tokens,months,days,flag(b,"enabled"));else {require(rows(db.select("SELECT order_no FROM ai_order WHERE plan_id=? LIMIT 1",id)).isEmpty(),409,"已售套餐不能修改，请新建套餐并停用旧套餐");db.execute("UPDATE ai_plan SET name=?,price=?,display_price=?,discount=?,token_limit=?,duration_months=?,trial_days=?,enabled=? WHERE id=?",required(b,"name",120),price,number(b,"displayPrice"),number(b,"discount"),tokens,months,days,flag(b,"enabled"),id);}db.execute("UPDATE ai_plan SET unlimited=? WHERE id=?",flag(b,"unlimited"),id);});
    }
    public void disablePlan(Actor a,long id){catalog.operator(a);db.execute("UPDATE ai_plan SET enabled=FALSE WHERE id=?",id);}
    /** Reconcile interrupted requests and pending checkout reservations after process restarts. */
    public void reconcile(){
        var cutoff=Timestamp.from(Instant.now().minusSeconds(17*60));
        for(var use:rows(db.select("SELECT id,reserved_tokens FROM ai_usage WHERE status='running' AND started_at<? LIMIT 100",cutoff)))
            settle(text(use,"id"),0,number(use,"reservedTokens"),true,false);
        for(var o:rows(db.select("SELECT order_no,user_id,tenant_id,pay_type FROM ai_order WHERE pay_status=1 ORDER BY created_at LIMIT 100"))){
            String channel=number(o,"payType")==1?"alipay":"wechat";
            if(!payments.available(channel))continue;
            try{info(new Actor(text(o,"userId"),text(o,"tenantId"),"reconciliation",false,Set.of("ai.use")),text(o,"orderNo"),true);}
            catch(Exception e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("AI payment reconciliation pending order={} error={}",text(o,"orderNo"),e.getClass().getSimpleName());}
        }
    }
    static Instant instant(Object value){if(value instanceof Timestamp t)return t.toInstant();if(value instanceof LocalDateTime t)return t.toInstant(ZoneOffset.UTC);if(value instanceof OffsetDateTime t)return t.toInstant();return Instant.parse(String.valueOf(value));}
    static Map<String,Object> snake(Map<String,Object> source){var out=new LinkedHashMap<String,Object>();source.forEach((k,v)->out.put(k.replaceAll("([a-z0-9])([A-Z])","$1_$2").toLowerCase(Locale.ROOT),v instanceof Timestamp t?t.toInstant().toString():v));return out;}
}
