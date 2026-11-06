package com.superpower.browser.billing;

import com.superpower.browser.auth.Actor;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** 本地资金事务边界；不在数据库事务中等待支付网络请求。 */
@Service
public class OrderTransactions {
    private final BillingRepository repository;
    public OrderTransactions(BillingRepository repository) { this.repository=repository; }

    @Transactional
    public String create(Actor a,String requestId,String kind,long amount,String channel,Map<String,Object> snapshot) {
        var previous=repository.requested(a.tenantId(),requestId);
        if(previous.isPresent()) {
            var order=previous.get();
            require(text(order,"creatorId").equals(a.id()) && text(order,"kind").equals(kind) && number(order,"amountCents")==amount && text(order,"channel").equals(channel) && object(text(order,"snapshot")).equals(object(json(snapshot))),409,"请求编号已用于其他订单");
            return text(order,"id");
        }
        String orderId=id();
        repository.insert(orderId,a,requestId,kind,amount,channel,snapshot,Instant.now().plusSeconds(1800));
        if(channel.equals("balance")) {
            require(repository.debit(a.tenantId(),amount),409,"账户余额不足");
            repository.ledger(a.tenantId(),orderId,"PURCHASE",-amount);
            repository.paid(orderId,null,"PENDING");
            repository.task(orderId);
        }
        return orderId;
    }

    @Transactional
    public void confirmPayment(String orderId,PaymentGateway.Payment payment) {
        var order=repository.lock(orderId);
        require(!text(order,"channel").equals("balance"),400,"余额订单不能接收线上支付结果");
        require(payment.paid() && payment.transactionId()!=null && !payment.transactionId().isBlank(),400,"支付尚未完成");
        require(payment.amountCents()==number(order,"amountCents") && "CNY".equals(payment.currency()),409,"支付金额或币种不匹配");
        if(text(order,"paymentStatus").equals("PAID")) {
            require(payment.transactionId().equals(text(order,"providerTransactionId")),409,"订单支付流水不匹配"); return;
        }
        // 取消与过期只阻止再次发起支付；供应商确认的迟到到账仍须记账。
        boolean recharge=text(order,"kind").equals("RECHARGE");
        if(recharge) {
            repository.credit(text(order,"tenantId"),payment.amountCents());
            repository.ledger(text(order,"tenantId"),orderId,"RECHARGE",payment.amountCents());
        }
        repository.paid(orderId,payment.transactionId(),recharge?"NONE":"PENDING");
        if(!recharge) repository.task(orderId);
    }

    @Transactional public void cancel(Actor a,String orderId) {
        var order=repository.lock(orderId);
        require(text(order,"tenantId").equals(a.tenantId()),404,"订单不存在");
        require(a.owner() || text(order,"creatorId").equals(a.id()),403,"只能取消自己创建的订单");
        require(!text(order,"kind").equals("AI_PLAN"),409,"请在 AI 套餐中处理订单，避免中断额度开通");
        require(text(order,"paymentStatus").equals("PENDING"),409,"只能取消待支付订单");
        repository.cancel(orderId);
    }
}
