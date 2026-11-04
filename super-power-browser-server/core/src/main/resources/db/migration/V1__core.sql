CREATE TABLE tenant (id VARCHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL);
CREATE TABLE app_user (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL, display_name VARCHAR(120) NOT NULL, owner BOOLEAN NOT NULL DEFAULT FALSE,
 enabled BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);
CREATE TABLE auth_session (
 token_hash VARCHAR(64) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, expires_at TIMESTAMP NOT NULL,
 FOREIGN KEY (user_id) REFERENCES app_user(id)
);
CREATE TABLE role (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);
CREATE TABLE role_permission (role_id VARCHAR(36) NOT NULL, permission VARCHAR(80) NOT NULL, PRIMARY KEY(role_id,permission), FOREIGN KEY(role_id) REFERENCES role(id));
CREATE TABLE member_role (user_id VARCHAR(36) NOT NULL, role_id VARCHAR(36) NOT NULL, PRIMARY KEY(user_id,role_id), FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(role_id) REFERENCES role(id));
CREATE TABLE device (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(120) NOT NULL, ip_type INT NOT NULL,
 protocol VARCHAR(10) NOT NULL, host VARCHAR(255) NOT NULL, port INT NOT NULL, username VARCHAR(255) NOT NULL DEFAULT '', password VARCHAR(1000) NOT NULL DEFAULT '',
 remark VARCHAR(1000) NOT NULL DEFAULT '', region VARCHAR(150) NOT NULL DEFAULT '', expires_at TIMESTAMP NULL,
 auto_renew BOOLEAN NOT NULL DEFAULT FALSE, recycled BOOLEAN NOT NULL DEFAULT FALSE,
 provider_id VARCHAR(120), package_id VARCHAR(120), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (ip_type IN (1,20,2)), CHECK (port BETWEEN 1 AND 65535), FOREIGN KEY(tenant_id) REFERENCES tenant(id)
);
CREATE TABLE environment (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, owner_id VARCHAR(36) NOT NULL,
 name VARCHAR(120) NOT NULL, platform VARCHAR(100) NOT NULL DEFAULT '', start_url VARCHAR(2000) NOT NULL,
 account_name VARCHAR(200) NOT NULL DEFAULT '', account_password VARCHAR(1000) NOT NULL DEFAULT '',
 remark VARCHAR(1000) NOT NULL DEFAULT '', device_id VARCHAR(36), kernel_version VARCHAR(30) NOT NULL DEFAULT '137',
 fingerprint_seed VARCHAR(36) NOT NULL, fingerprint TEXT NOT NULL, config_version INT NOT NULL DEFAULT 1,
 favorite BOOLEAN NOT NULL DEFAULT FALSE, recycled BOOLEAN NOT NULL DEFAULT FALSE, last_opened_at TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(tenant_id) REFERENCES tenant(id), FOREIGN KEY(owner_id) REFERENCES app_user(id), FOREIGN KEY(device_id) REFERENCES device(id)
);
CREATE TABLE environment_grant (
 environment_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, granted_by VARCHAR(36) NOT NULL,
 PRIMARY KEY(environment_id,user_id), FOREIGN KEY(environment_id) REFERENCES environment(id), FOREIGN KEY(user_id) REFERENCES app_user(id)
);
CREATE TABLE audit_event (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, actor_id VARCHAR(36) NOT NULL,
 action VARCHAR(100) NOT NULL, resource_id VARCHAR(36) NOT NULL, detail TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE wallet (tenant_id VARCHAR(36) PRIMARY KEY, balance_cents BIGINT NOT NULL DEFAULT 0, CHECK (balance_cents >= 0), FOREIGN KEY(tenant_id) REFERENCES tenant(id));
CREATE TABLE business_order (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, creator_id VARCHAR(36) NOT NULL, request_id VARCHAR(80) NOT NULL,
 kind VARCHAR(20) NOT NULL, amount_cents BIGINT NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'CNY', channel VARCHAR(12) NOT NULL,
 payment_status VARCHAR(25) NOT NULL DEFAULT 'PENDING', delivery_status VARCHAR(25) NOT NULL DEFAULT 'NONE',
 provider_order_id VARCHAR(120), provider_transaction_id VARCHAR(120), payment_url TEXT,
 snapshot TEXT NOT NULL, failure_reason VARCHAR(1000), expires_at TIMESTAMP NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(tenant_id,request_id), UNIQUE(channel,provider_transaction_id), CHECK(amount_cents > 0), FOREIGN KEY(tenant_id) REFERENCES tenant(id)
);
CREATE TABLE ledger (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, order_id VARCHAR(36) NOT NULL,
 kind VARCHAR(20) NOT NULL, amount_cents BIGINT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(order_id,kind), FOREIGN KEY(order_id) REFERENCES business_order(id)
);
CREATE TABLE task (
 id VARCHAR(36) PRIMARY KEY, order_id VARCHAR(36) NOT NULL, kind VARCHAR(30) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 attempts INT NOT NULL DEFAULT 0, available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, lease_until TIMESTAMP NULL,
 lease_owner VARCHAR(36), error_message VARCHAR(1000), UNIQUE(order_id,kind), FOREIGN KEY(order_id) REFERENCES business_order(id)
);
CREATE INDEX environment_scope ON environment(tenant_id,recycled);
CREATE INDEX device_scope ON device(tenant_id,ip_type,recycled);
CREATE INDEX order_scope ON business_order(tenant_id,created_at);
CREATE INDEX task_poll ON task(status,available_at);
