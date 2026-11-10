package com.superpower.browser.device;

import com.superpower.browser.shared.*;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static com.superpower.browser.shared.Data.*;
import static org.junit.jupiter.api.Assertions.*;

/** Paid delivery must not leave resources owned by a deleted member or revive their renewal consent. */
class DeviceDeliveryRepositoryTest {
    private HikariDataSource source;
    private JdbcTemplate jdbc;
    private TransactionTemplate transactions;
    private DeviceFulfillment fulfillment;

    @BeforeEach void setup() throws Exception {
        source=new HikariDataSource();
        source.setJdbcUrl("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        source.setMaximumPoolSize(3);
        Flyway.configure().dataSource(source).load().migrate();
        jdbc=new JdbcTemplate(source);
        var factory=new SqlSessionFactoryBean();factory.setDataSource(source);factory.afterPropertiesSet();
        var sessionFactory=factory.getObject();sessionFactory.getConfiguration().addMapper(Db.class);
        var mapper=new SqlSessionTemplate(sessionFactory).getMapper(Db.class);
        fulfillment=new DeviceFulfillment(new DeviceDeliveryRepository(mapper,new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]))));
        transactions=new TransactionTemplate(new DataSourceTransactionManager(source));
        jdbc.update("INSERT INTO tenant(id,name) VALUES('tenant','Delivery team'),('other-tenant','Other team')");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name,owner) VALUES('owner','tenant','owner','unused','Owner',TRUE),('other-owner','other-tenant','other-owner','unused','Other owner',TRUE)");
        jdbc.update("INSERT INTO app_user(id,tenant_id,username,password_hash,display_name,enabled,deleted) VALUES('active','tenant','active','unused','Active member',TRUE,FALSE),('disabled','tenant','disabled','unused','Disabled member',FALSE,FALSE),('departed','tenant','departed','unused','Departed member',FALSE,TRUE)");
    }
    @AfterEach void close() { if(jdbc!=null)jdbc.execute("DROP ALL OBJECTS");if(source!=null)source.close(); }

    @Test void delayedPurchasesRespectCurrentMembershipAndPreserveOrderHistory() {
        for(String creator:List.of("active","disabled","departed")) {
            String orderId=id();
            var snapshot=Map.<String,Object>of("quantity",1,"ipType",1,"productId","synthetic-package","autoRenew",true);
            jdbc.update("INSERT INTO business_order(id,tenant_id,creator_id,request_id,kind,amount_cents,channel,payment_status,snapshot,expires_at) VALUES(?,'tenant',?,?,'PURCHASE',100,'balance','PAID',?,?)",orderId,creator,orderId,json(snapshot),Timestamp.from(Instant.now().plusSeconds(3600)));
            var order=row(jdbc.queryForMap("SELECT * FROM business_order WHERE id=?",orderId));
            var connection=new DeviceSupplier.Connection("synthetic-provider",creator+" device",1,"socks5","proxy.example.com",1080,"account","synthetic-password","Test region","2099-01-01T00:00:00Z");
            transactions.executeWithoutResult(status->fulfillment.apply(order,new DeviceSupplier.Delivery(List.of(connection),connection.expiresAt())));
            var delivered=row(jdbc.queryForMap("SELECT created_by,auto_renew,auto_renew_user_id FROM device WHERE purchase_order_id=?",orderId));
            assertEquals(creator.equals("departed")?"owner":creator,delivered.get("createdBy"));
            assertEquals(creator.equals("active"),delivered.get("autoRenew"));
            assertEquals(creator.equals("active")?creator:null,delivered.get("autoRenewUserId"));
            assertEquals(creator,jdbc.queryForObject("SELECT creator_id FROM business_order WHERE id=?",String.class,orderId));
        }
    }

    @Test void supplierTransportOptionsUseTheSameEncryptedValidatedContract() {
        String orderId=id();var snapshot=Map.<String,Object>of("quantity",1,"ipType",1,"productId","synthetic-package","autoRenew",false);
        jdbc.update("INSERT INTO business_order(id,tenant_id,creator_id,request_id,kind,amount_cents,channel,payment_status,snapshot,expires_at) VALUES(?,'tenant','active',?,'PURCHASE',100,'balance','PAID',?,?)",orderId,orderId,json(snapshot),Timestamp.from(Instant.now().plusSeconds(3600)));
        var order=row(jdbc.queryForMap("SELECT * FROM business_order WHERE id=?",orderId));
        var options=Map.<String,Object>of("encryption","aes-256-gcm","transit",Map.of("protocol","socks5","host","relay.example.com","port",1080,"password","relay-secret"));
        var connection=new DeviceSupplier.Connection("synthetic","SS node",1,"ss","proxy.example.com",8388,"","ss-secret","Test","2099-01-01T00:00:00Z",options);
        transactions.executeWithoutResult(status->fulfillment.apply(order,new DeviceSupplier.Delivery(List.of(connection),connection.expiresAt())));
        String encrypted=jdbc.queryForObject("SELECT proxy_options FROM device WHERE purchase_order_id=?",String.class,orderId);
        assertFalse(encrypted.contains("relay-secret"));
        var cipher=new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        assertEquals("aes-256-gcm",object(cipher.decrypt(encrypted)).get("encryption"));
        var bad=new DeviceSupplier.Connection("synthetic","bad",1,"ss","proxy.example.com",8388,"","ss-secret","Test","2099-01-01T00:00:00Z",Map.of("outbounds",List.of()));
        assertEquals(400,assertThrows(BusinessException.class,()->transactions.executeWithoutResult(status->fulfillment.apply(order,new DeviceSupplier.Delivery(List.of(bad),bad.expiresAt())))).status);
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM device WHERE purchase_order_id=?",Integer.class,orderId));
    }
}
