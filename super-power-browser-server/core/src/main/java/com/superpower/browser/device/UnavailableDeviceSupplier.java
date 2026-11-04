package com.superpower.browser.device;

import com.superpower.browser.shared.BusinessException;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class UnavailableDeviceSupplier implements DeviceSupplier {
    public boolean available() { return false; }
    public List<Product> catalog() { return List.of(); }
    public Delivery deliver(String id,Map<String,Object> snapshot) { throw new BusinessException(503,"新设备供应接口尚未配置"); }
}
