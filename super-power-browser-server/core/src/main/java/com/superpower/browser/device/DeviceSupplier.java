package com.superpower.browser.device;

import java.util.List;
import java.util.Map;

/** 新设备供应适配口；商品分类和 ipType 必须由供应商适配器显式映射。 */
public interface DeviceSupplier {
    boolean available();
    List<Product> catalog();
    Delivery deliver(String orderId, Map<String,Object> snapshot);
    record Product(String id,String name,String zone,String platform,String region,String area,int ipType,
        String specification,int months,long priceCents,boolean acceleration,Map<String,Object> attributes) {
        public Product(String id,String name,String zone,String platform,String region,String area,int ipType,String specification,int months,long priceCents,boolean acceleration) {
            this(id,name,zone,platform,region,area,ipType,specification,months,priceCents,acceleration,Map.of());
        }
        public Product { attributes=attributes==null?Map.of():Map.copyOf(attributes); }
    }
    record Connection(String providerId,String name,int ipType,String protocol,String host,int port,String username,
        String password,String region,String expiresAt,Map<String,Object> proxyOptions) {
        public Connection(String providerId,String name,int ipType,String protocol,String host,int port,String username,String password,String region,String expiresAt) {
            this(providerId,name,ipType,protocol,host,port,username,password,region,expiresAt,Map.of());
        }
        public Connection {proxyOptions=proxyOptions==null?Map.of():Map.copyOf(proxyOptions);}
    }
    record Delivery(List<Connection> devices,String expiresAt) {}
}
