CREATE TABLE free_proxy_claim (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 offer_id VARCHAR(120) NOT NULL, device_id VARCHAR(36) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(tenant_id), UNIQUE(tenant_id,offer_id),
 FOREIGN KEY(tenant_id) REFERENCES tenant(id), FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(device_id) REFERENCES device(id)
);
CREATE INDEX free_proxy_claim_offer ON free_proxy_claim(offer_id);
