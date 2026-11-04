package com.superpower.browser.billing;

import com.superpower.browser.shared.BusinessException;
import java.time.Instant;
import org.springframework.stereotype.Component;

/** 等待新商户资料；不生成虚假支付链接或模拟到账。 */
@Component
public class UnavailablePaymentGateway implements PaymentGateway {
    public boolean available(String channel) { return false; }
    public Checkout create(String id,long amount,String channel,Instant expiry) { throw unavailable(); }
    public Payment query(String id,String channel) { throw unavailable(); }
    private BusinessException unavailable() { return new BusinessException(503,"新支付通道尚未配置"); }
}
