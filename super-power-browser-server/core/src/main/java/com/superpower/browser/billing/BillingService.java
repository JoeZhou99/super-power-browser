package com.superpower.browser.billing;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.device.*;
import com.superpower.browser.shared.BusinessException;
import java.time.Instant;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class BillingService {
    private static final Set<String> ONLINE=Set.of("ali","wx","cmb");
    private final BillingRepository repository;
    private final OrderTransactions transactions;
    private final PaymentGateway payments;
    private final DeviceSupplier supplier;
    private final DeviceService devices;
    public BillingService(BillingRepository repository,OrderTransactions transactions,PaymentGateway payments,DeviceSupplier supplier,DeviceService devices) {
        this.repository=repository; this.transactions=transactions; this.payments=payments; this.supplier=supplier; this.devices=devices;
    }
    public Map<String,Object> wallet(Actor a) { a.allow("wallet.view"); return repository.wallet(a.tenantId()); }
    public Map<String,Object> capabilities() {
        return Map.of("currency","CNY","channels",ONLINE.stream().filter(payments::available).sorted().toList(),"deviceSupply",supplier.available());
    }
    public List<DeviceSupplier.Product> catalog(Actor a) {
        require(a.permissions().contains("device.buy") || a.permissions().contains("device.renew"),403,"没有购买或续费权限");
        return supplier.catalog().stream().filter(p->Set.of(1,20).contains(p.ipType()) || p.acceleration()).toList();
    }
    public Map<String,Object> quote(Actor a,Map<String,Object> request) {
        String kind=text(request,"kind");
        require(Set.of("PURCHASE","RENEW","ACCELERATION").contains(kind),400,"订单类型不支持");
        a.allow(kind.equals("PURCHASE")?"device.buy":"device.renew");
        require(supplier.available(),503,"新设备供应接口尚未配置");
        String productId=required(request,"productId",120);
        var product=catalog(a).stream().filter(p->p.id().equals(productId)).findFirst().orElseThrow(()->new BusinessException(404,"套餐不存在或已下架"));
        int quantity=Math.toIntExact(number(request,"quantity"));
        require(quantity>=1 && quantity<=20 && product.priceCents()>0 && product.months()>0,400,"套餐或数量不合法");
        if(product.attributes().containsKey("stock"))require(quantity<=number(product.attributes(),"stock"),409,"所选套餐库存不足");
        boolean autoRenew=flag(request,"autoRenew");
        if(autoRenew){a.allow("device.renew");require(kind.equals("PURCHASE")&&flag(product.attributes(),"autoRenewSupported"),400,"该套餐不支持购买时开启自动续费");}
        require(product.acceleration()==kind.equals("ACCELERATION"),400,"套餐与业务类型不匹配");
        String deviceId=text(request,"deviceId");
        if(!kind.equals("PURCHASE")) {
            require(quantity==1,400,"续费每次选择一台设备");
            var device=devices.get(a,deviceId);
            require(!flag(device,"recycled"),409,"请先恢复设备");
            require(kind.equals("ACCELERATION")?number(device,"ipType")==2:number(device,"ipType")==product.ipType(),400,"设备类型与套餐不匹配");
        }
        var snapshot=new LinkedHashMap<String,Object>();
        snapshot.put("productId",product.id()); snapshot.put("productName",product.name()); snapshot.put("zone",product.zone());
        snapshot.put("platform",product.platform()); snapshot.put("region",product.region()); snapshot.put("area",product.area());
        snapshot.put("ipType",product.ipType()); snapshot.put("months",product.months()); snapshot.put("unitPriceCents",product.priceCents());
        snapshot.put("quantity",quantity); snapshot.put("deviceId",deviceId); snapshot.put("kind",kind);
        snapshot.put("specification",product.specification());snapshot.put("attributes",product.attributes());snapshot.put("autoRenew",autoRenew);
        return Map.of("amountCents",Math.multiplyExact(product.priceCents(),quantity),"currency","CNY","snapshot",snapshot);
    }
    public Map<String,Object> recharge(Actor a,Map<String,Object> request) {
        a.allow("wallet.recharge");
        long amount=number(request,"amountCents"); require(amount>=1 && amount<=100_000_000,400,"充值金额范围为 0.01—1,000,000 元");
        return create(a,request,"RECHARGE",amount,Map.of("amountCents",amount));
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> buy(Actor a,Map<String,Object> request) {
        var quote=quote(a,request);
        return create(a,request,text(request,"kind"),number(quote,"amountCents"),(Map<String,Object>)quote.get("snapshot"));
    }
    private Map<String,Object> create(Actor a,Map<String,Object> request,String kind,long amount,Map<String,Object> snapshot) {
        String channel=required(request,"channel",12),requestId=required(request,"requestId",80);
        require(ONLINE.contains(channel) || (!kind.equals("RECHARGE") && channel.equals("balance")),400,"支付方式不支持");
        if(!channel.equals("balance")) require(payments.available(channel),503,"新支付通道尚未配置");
        String orderId;
        try { orderId=transactions.create(a,requestId,kind,amount,channel,snapshot); }
        catch(DuplicateKeyException e) {
            // 同一请求并发提交时，唯一键胜出的事务已提交；重读并验证请求内容。
            orderId=transactions.create(a,requestId,kind,amount,channel,snapshot);
        }
        if(!channel.equals("balance") && text(repository.get(orderId),"paymentStatus").equals("PENDING")) ensureCheckout(repository.get(orderId));
        return repository.get(orderId);
    }
    private void ensureCheckout(Map<String,Object> order) {
        require(text(order,"paymentStatus").equals("PENDING"),409,"订单当前不可支付");
        Instant expiry=Instant.parse(text(order,"expiresAt")); require(expiry.isAfter(Instant.now()),409,"支付期限已过，请重新下单");
        if(text(order,"paymentUrl").isEmpty()) repository.checkout(text(order,"id"),payments.create(text(order,"id"),number(order,"amountCents"),text(order,"channel"),expiry));
    }
    public Map<String,Object> order(Actor a,String orderId) {
        a.allow("order.view"); return owned(a,orderId);
    }
    private Map<String,Object> owned(Actor a,String id) {
        var order=repository.get(id); require(text(order,"tenantId").equals(a.tenantId()),404,"订单不存在"); return order;
    }
    public Map<String,Object> list(Actor a,String query,String status,int page,int size) {
        return filtered(a,query,status,page,size,Map.of());
    }
    public Map<String,Object> filtered(Actor a,String query,String status,int page,int size,Map<String,String> filters) {
        a.allow("order.view"); require(page>0 && size>0 && size<=200,400,"分页参数不合法");
        require(Set.of("","PENDING","PAID","CANCELLED").contains(status),400,"订单状态不支持");
        require(Set.of("","RECHARGE","PURCHASE","RENEW","ACCELERATION").contains(filters.getOrDefault("kind","")),400,"订单类型不支持");
        require(Set.of("","balance","ali","wx","cmb").contains(filters.getOrDefault("channel","")),400,"支付方式不支持");
        try{for(String field:List.of("from","to"))if(!filters.getOrDefault(field,"").isBlank())java.time.LocalDate.parse(filters.get(field));}catch(java.time.format.DateTimeParseException ex){throw new BusinessException(400,"日期格式不正确");}
        return repository.list(a,query,status,page,size,filters);
    }
    public Map<String,Object> continuePayment(Actor a,String id) {
        var order=owned(a,id); a.allow(text(order,"kind").equals("RECHARGE")?"wallet.recharge":text(order,"kind").equals("PURCHASE")?"device.buy":"device.renew");
        require(a.owner() || text(order,"creatorId").equals(a.id()),403,"只能支付自己创建的订单");
        ensureCheckout(order); return repository.get(id);
    }
    public Map<String,Object> refresh(Actor a,String id) {
        var order=owned(a,id);
        if(!a.permissions().contains("order.view")) {
            require(text(order,"creatorId").equals(a.id()),403,"没有订单查询权限");
            a.allow(text(order,"kind").equals("RECHARGE")?"wallet.recharge":text(order,"kind").equals("PURCHASE")?"device.buy":"device.renew");
        }
        if(!text(order,"channel").equals("balance") && !text(order,"paymentStatus").equals("PAID")) {
            var payment=payments.query(id,text(order,"channel"));
            if(payment.paid()) transactions.confirmPayment(id,payment);
        }
        return repository.get(id);
    }
    public void cancel(Actor a,String id) { a.allow("order.view"); transactions.cancel(a,id); }
}
