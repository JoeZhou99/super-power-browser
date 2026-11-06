package com.superpower.browser.billing;

import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.time.Instant;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** AI online purchases use existing business orders without wallet debits. */
@Service
public class AiBilling {
    private final BillingRepository repository;
    public AiBilling(BillingRepository repository){this.repository=repository;}
    @Transactional public void create(Actor a,String id,long price,String channel,Map<String,Object> snapshot){
        a.allow("ai.purchase");
        require(Set.of("alipay","wechat").contains(channel),400,"仅支持支付宝或微信支付");
        repository.insert(id,a,"ai:"+id,"AI_PLAN",price,channel,snapshot,Instant.now().plusSeconds(1800));
    }
    public void checkout(String id,PaymentGateway.Checkout checkout){repository.checkout(id,checkout);}
    @Transactional public void paid(String id,String transaction){
        var o=repository.lock(id);if(text(o,"paymentStatus").equals("PAID"))return;
        require(text(o,"paymentStatus").equals("PENDING"),409,"订单已关闭，请联系客服处理到账");
        repository.paid(id,transaction,"DELIVERED");
    }
    @Transactional public void cancel(String id){
        var o=repository.lock(id);if(!text(o,"paymentStatus").equals("PENDING"))return;
        repository.cancel(id);
    }
}
