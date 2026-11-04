package com.superpower.browser.device;

import java.util.Map;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** 已支付订单的本地交付持久化，参与账务域完成任务的同一个事务。 */
@Service
public class DeviceFulfillment {
    private final DeviceDeliveryRepository repository;
    public DeviceFulfillment(DeviceDeliveryRepository repository) { this.repository=repository; }
    public void apply(Map<String,Object> order,DeviceSupplier.Delivery delivery) {
        var snapshot=object(text(order,"snapshot"));
        if(text(order,"kind").equals("PURCHASE")) {
            require(delivery.devices().size()==number(snapshot,"quantity"),502,"供应商交付数量不匹配");
            int sequence=0;
            for(var device:delivery.devices()) {
                require(device.ipType()==number(snapshot,"ipType"),502,"供应商交付设备类型不匹配");
                repository.provision(order,snapshot,device,sequence++);
            }
        } else {
            int changed=repository.extend(order,snapshot,delivery.expiresAt());
            require(changed==1,409,"待交付设备不存在");
        }
    }
}
