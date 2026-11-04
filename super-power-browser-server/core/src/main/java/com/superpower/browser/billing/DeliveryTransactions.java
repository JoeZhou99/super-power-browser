package com.superpower.browser.billing;

import com.superpower.browser.device.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

@Service
public class DeliveryTransactions {
    private final TaskRepository tasks;
    private final BillingRepository orders;
    private final DeviceFulfillment devices;
    public DeliveryTransactions(TaskRepository tasks,BillingRepository orders,DeviceFulfillment devices) { this.tasks=tasks;this.orders=orders;this.devices=devices; }
    @Transactional public Optional<Map<String,Object>> claim(String worker) {
        var task=tasks.next(); task.ifPresent(t->{tasks.claim(text(t,"id"),worker);tasks.processing(text(t,"orderId"));}); return task;
    }
    @Transactional public void complete(String taskId,String worker,DeviceSupplier.Delivery result) {
        var task=tasks.lock(taskId);
        if(!text(task,"status").equals("RUNNING") || !text(task,"leaseOwner").equals(worker)) return;
        var order=orders.lock(text(task,"orderId"));
        require(text(order,"paymentStatus").equals("PAID"),409,"未支付订单不能交付");
        if(!text(order,"deliveryStatus").equals("DELIVERED")) devices.apply(order,result);
        tasks.complete(taskId,text(order,"id"));
    }
    @Transactional public void failed(String taskId,String worker) {
        var task=tasks.lock(taskId);
        if(text(task,"status").equals("RUNNING") && text(task,"leaseOwner").equals(worker)) tasks.failed(task,"设备供应交付失败，请联系管理员检查供应商状态");
    }
}
