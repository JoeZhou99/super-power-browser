-- Per-account shop creation limits. A value of -1 means unlimited.
-- The policy belongs to the account member, while environments remain owned by
-- the actor that created them. Department permissions therefore cannot bypass
-- another member's quota.
CREATE TABLE shop_creation_quota (
    user_id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    limit_count BIGINT NOT NULL DEFAULT -1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    revision BIGINT NOT NULL DEFAULT 1,
    note VARCHAR(500) NOT NULL DEFAULT '',
    updated_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shop_creation_quota_limit CHECK (limit_count BETWEEN -1 AND 1000000),
    FOREIGN KEY (user_id) REFERENCES app_user(id),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);
CREATE INDEX shop_creation_quota_tenant ON shop_creation_quota(tenant_id);
CREATE INDEX environment_owner_scope ON environment(tenant_id,owner_id);

CREATE TABLE shop_quota_audit (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    operator_id VARCHAR(36) NOT NULL,
    operator_name VARCHAR(80) NOT NULL,
    before_limit BIGINT NULL,
    after_limit BIGINT NOT NULL,
    before_enabled BOOLEAN NULL,
    after_enabled BOOLEAN NOT NULL,
    before_revision BIGINT NULL,
    after_revision BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(id),
    FOREIGN KEY (user_id) REFERENCES app_user(id)
);
CREATE INDEX shop_quota_audit_user ON shop_quota_audit(tenant_id,user_id,created_at);
