package com.superpower.browser.billing;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.Db;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
class BillingRepository {
    private final Db db;
    BillingRepository(Db db) { this.db=db; }
    Map<String,Object> wallet(String tenantId) { return one(db.select("SELECT balance_cents FROM wallet WHERE tenant_id=?",tenantId)); }
    Optional<Map<String,Object>> requested(String tenantId,String requestId) { return rows(db.select("SELECT * FROM business_order WHERE tenant_id=? AND request_id=?",tenantId,requestId)).stream().findFirst(); }
    Map<String,Object> get(String id) { return one(db.select("SELECT * FROM business_order WHERE id=?",id)); }
    Map<String,Object> lock(String id) { return one(db.select("SELECT * FROM business_order WHERE id=? FOR UPDATE",id)); }
    void insert(String id,Actor a,String requestId,String kind,long amount,String channel,Object snapshot,Instant expiry) {
        db.execute("INSERT INTO business_order(id,tenant_id,creator_id,request_id,kind,amount_cents,channel,snapshot,expires_at) VALUES(?,?,?,?,?,?,?,?,?)",id,a.tenantId(),a.id(),requestId,kind,amount,channel,json(snapshot),Timestamp.from(expiry));
    }
    Map<String,Object> list(Actor a,String query,String status,int page,int size) {
        return list(a,query,status,page,size,Map.of());
    }
    Map<String,Object> list(Actor a,String query,String status,int page,int size,Map<String,String> filters) {
        String where="o.tenant_id=? AND o.id LIKE ?";
        var args=new ArrayList<Object>(List.of(a.tenantId(),"%"+query+"%"));
        if(!status.isEmpty()) { where+=" AND o.payment_status=?"; args.add(status); }
        for(var filter:Map.of("kind","o.kind","channel","o.channel","delivery","o.delivery_status").entrySet())if(!filters.getOrDefault(filter.getKey(),"").isBlank()){where+=" AND "+filter.getValue()+"=?";args.add(filters.get(filter.getKey()));}
        if(!filters.getOrDefault("payer","").isBlank()){where+=" AND (u.username LIKE ? OR u.display_name LIKE ?)";args.add("%"+filters.get("payer")+"%");args.add("%"+filters.get("payer")+"%");}
        if(!filters.getOrDefault("from","").isBlank()){where+=" AND o.paid_at>=?";args.add(Timestamp.valueOf(java.time.LocalDate.parse(filters.get("from")).atStartOfDay()));}
        if(!filters.getOrDefault("to","").isBlank()){where+=" AND o.paid_at<?";args.add(Timestamp.valueOf(java.time.LocalDate.parse(filters.get("to")).plusDays(1).atStartOfDay()));}
        String source="business_order o JOIN app_user u ON u.id=o.creator_id";
        long total=number(one(db.select("SELECT COUNT(*) AS total FROM "+source+" WHERE "+where,args.toArray())),"total");
        args.add(size);args.add((page-1)*size);
        return Map.of("items",rows(db.select("SELECT o.*,u.display_name AS payer_name,u.username AS payer_username FROM "+source+" WHERE "+where+" ORDER BY o.created_at DESC LIMIT ? OFFSET ?",args.toArray())),"total",total);
    }
    void checkout(String id,PaymentGateway.Checkout checkout) {
        db.execute("UPDATE business_order SET provider_order_id=?,payment_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND payment_status='PENDING'",checkout.providerOrderId(),checkout.paymentUrl(),id);
    }
    boolean debit(String tenantId,long cents) { return db.execute("UPDATE wallet SET balance_cents=balance_cents-? WHERE tenant_id=? AND balance_cents>=?",cents,tenantId,cents)==1; }
    void credit(String tenantId,long cents) { db.execute("UPDATE wallet SET balance_cents=balance_cents+? WHERE tenant_id=?",cents,tenantId); }
    void ledger(String tenantId,String orderId,String kind,long cents) { db.execute("INSERT INTO ledger(id,tenant_id,order_id,kind,amount_cents) VALUES(?,?,?,?,?)",id(),tenantId,orderId,kind,cents); }
    void paid(String id,String transaction,String deliveryStatus) {
        db.execute("UPDATE business_order SET payment_status='PAID',provider_transaction_id=?,delivery_status=?,updated_at=CURRENT_TIMESTAMP,paid_at=CURRENT_TIMESTAMP WHERE id=?",transaction,deliveryStatus,id);
    }
    void task(String orderId) { db.execute("INSERT INTO task(id,order_id,kind) VALUES(?,?,'DELIVER')",id(),orderId); }
    void cancel(String id) { db.execute("UPDATE business_order SET payment_status='CANCELLED',updated_at=CURRENT_TIMESTAMP WHERE id=?",id); }
}
