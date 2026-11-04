package com.superpower.browser.billing;

import java.time.Instant;

/** 新支付商户适配口。创建与查询必须以 orderId 幂等，不得调用旧费用接口。 */
public interface PaymentGateway {
    boolean available(String channel);
    Checkout create(String orderId, long amountCents, String channel, Instant expiresAt);
    Payment query(String orderId, String channel);
    record Checkout(String providerOrderId, String paymentUrl) {}
    record Payment(boolean paid, String transactionId, long amountCents, String currency) {}
}
