package com.superpower.browser.device;

import com.superpower.browser.shared.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Repository;
import static com.superpower.browser.shared.Data.*;

@Repository
class DeviceDeliveryRepository {
    private final Db db;
    private final SecretCipher secrets;
    DeviceDeliveryRepository(Db db,SecretCipher secrets) { this.db=db;this.secrets=secrets; }
    void provision(Map<String,Object> order,Map<String,Object> snapshot,DeviceSupplier.Connection device,int sequence) {
        db.execute("INSERT INTO device(id,tenant_id,created_by,name,ip_type,protocol,host,port,username,password,region,expires_at,provider_id,package_id,purchase_order_id,purchase_sequence,auto_renew,auto_renew_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            id(),text(order,"tenantId"),text(order,"creatorId"),device.name(),device.ipType(),device.protocol(),device.host(),device.port(),device.username(),secrets.encrypt(device.password()),device.region(),Timestamp.from(Instant.parse(device.expiresAt())),device.providerId(),text(snapshot,"productId"),text(order,"id"),sequence,flag(snapshot,"autoRenew"),flag(snapshot,"autoRenew")?text(order,"creatorId"):null);
    }
    int extend(Map<String,Object> order,Map<String,Object> snapshot,String expiry) {
        String column=text(order,"kind").equals("RENEW")?"expires_at":"acceleration_expires_at";
        return db.execute("UPDATE device SET "+column+"=?,package_id=? WHERE id=? AND tenant_id=?",Timestamp.from(Instant.parse(expiry)),text(snapshot,"productId"),text(snapshot,"deviceId"),text(order,"tenantId"));
    }
}
