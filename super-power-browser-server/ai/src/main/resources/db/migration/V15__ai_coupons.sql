CREATE TABLE ai_coupon (
 coupon_sn VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 name VARCHAR(120) NOT NULL, amount_cents BIGINT NOT NULL, minimum_cents BIGINT NOT NULL DEFAULT 0,
 plan_id BIGINT, state VARCHAR(16) NOT NULL DEFAULT 'available', order_no VARCHAR(80),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NOT NULL,
 FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(plan_id) REFERENCES ai_plan(id),
 CHECK(amount_cents>0), CHECK(minimum_cents>=0)
);
CREATE INDEX ai_coupon_owner ON ai_coupon(tenant_id,user_id,state);
ALTER TABLE ai_order ADD COLUMN coupon_sn VARCHAR(36) NOT NULL DEFAULT '';
ALTER TABLE ai_order ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0;
