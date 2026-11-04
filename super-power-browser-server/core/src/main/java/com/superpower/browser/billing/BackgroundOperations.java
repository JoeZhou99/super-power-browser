package com.superpower.browser.billing;

import com.superpower.browser.device.DeviceSupplier;
import com.superpower.browser.device.DeviceService;
import com.superpower.browser.auth.AuthService;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.Data.*;

@Service
public class BackgroundOperations {
    private static final Logger LOG=LoggerFactory.getLogger(BackgroundOperations.class);
    private final BillingRepository orders;
    private final TaskRepository tasks;
    private final OrderTransactions payments;
    private final DeliveryTransactions delivery;
    private final PaymentGateway gateway;
    private final DeviceSupplier supplier;
    private final DeviceService devices;
    private final AuthService auth;
    private final BillingService billing;
    public BackgroundOperations(BillingRepository orders,TaskRepository tasks,OrderTransactions payments,DeliveryTransactions delivery,PaymentGateway gateway,DeviceSupplier supplier,DeviceService devices,AuthService auth,BillingService billing) {
        this.orders=orders;this.tasks=tasks;this.payments=payments;this.delivery=delivery;this.gateway=gateway;this.supplier=supplier;this.devices=devices;this.auth=auth;this.billing=billing;
    }
    public void pollPayments() {
        for(var order:tasks.pendingPayments()) {
            String channel=text(order,"channel"),id=text(order,"id");
            if(!gateway.available(channel)) continue;
            try { var payment=gateway.query(id,channel); if(payment.paid()) payments.confirmPayment(id,payment); }
            catch(Exception e) { LOG.warn("支付对账未完成 order={} exception={}",id,e.getClass().getSimpleName()); }
        }
    }
    public void deliverOne(String worker) {
        if(!supplier.available()) return;
        delivery.claim(worker).ifPresent(task->{
            String taskId=text(task,"id"),orderId=text(task,"orderId");
            try {
                var order=orders.get(orderId);
                var result=supplier.deliver(orderId,object(text(order,"snapshot")));
                delivery.complete(taskId,worker,result);
            } catch(Exception e) {
                delivery.failed(taskId,worker);
                LOG.warn("设备交付未完成 order={} exception={}",orderId,e.getClass().getSimpleName());
            }
        });
    }
    public void renewDueDevices() {
        if(!supplier.available())return;
        for(var device:devices.renewalCandidates()) {
            String id=text(device,"id");
            try {
                var actor=auth.authorizedUser(text(device,"autoRenewUserId"));
                String requestId="renew-"+UUID.nameUUIDFromBytes((id+":"+text(device,"expiresAt")).getBytes(StandardCharsets.UTF_8));
                // 同一到期周期只创建一笔订单；交付未完成时重复轮询不再次扣款。
                if(orders.requested(actor.tenantId(),requestId).isPresent())continue;
                billing.buy(actor,Map.of("requestId",requestId,"kind","RENEW","productId",text(device,"packageId"),"deviceId",id,"quantity",1,"channel","balance"));
            }catch(Exception e){LOG.warn("自动续费未完成 device={} exception={}",id,e.getClass().getSimpleName());}
        }
    }
}
