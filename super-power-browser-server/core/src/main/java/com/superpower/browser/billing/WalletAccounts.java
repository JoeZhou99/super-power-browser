package com.superpower.browser.billing;

import com.superpower.browser.shared.Db;
import org.springframework.stereotype.Repository;

/** 开户是账务域拥有的操作；创建企业的事务会包含此操作。 */
@Repository
public class WalletAccounts {
    private final Db db;
    public WalletAccounts(Db db) { this.db = db; }
    public void open(String tenantId) { db.execute("INSERT INTO wallet(tenant_id,balance_cents) VALUES(?,0)",tenantId); }
}
