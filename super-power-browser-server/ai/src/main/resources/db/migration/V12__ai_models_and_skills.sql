CREATE TABLE ai_sequence (id INT PRIMARY KEY, next_id BIGINT NOT NULL);
INSERT INTO ai_sequence(id,next_id) VALUES(1,1000);
CREATE TABLE ai_personal_model (
 id BIGINT PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 provider_name VARCHAR(120) NOT NULL, model_name VARCHAR(160) NOT NULL, api_url VARCHAR(2000) NOT NULL,
 api_key VARCHAR(4000) NOT NULL, api_protocol VARCHAR(16) NOT NULL, remark VARCHAR(1000) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(tenant_id) REFERENCES tenant(id)
);
CREATE INDEX ai_personal_model_owner ON ai_personal_model(tenant_id,user_id);
CREATE TABLE ai_ticket (
 token_hash VARCHAR(64) PRIMARY KEY, session_hash VARCHAR(64) NOT NULL, user_id VARCHAR(36) NOT NULL,
 tenant_id VARCHAR(36) NOT NULL, kind VARCHAR(20) NOT NULL, resource_id VARCHAR(100) NOT NULL,
 expires_at TIMESTAMP NOT NULL, FOREIGN KEY(user_id) REFERENCES app_user(id)
);
CREATE INDEX ai_ticket_expiry ON ai_ticket(expires_at);
CREATE TABLE ai_plan (
 id BIGINT PRIMARY KEY, name VARCHAR(120) NOT NULL, price BIGINT NOT NULL, display_price BIGINT NOT NULL DEFAULT 0,
 discount INT NOT NULL DEFAULT 0, token_limit BIGINT NOT NULL, duration_months INT NOT NULL,
 trial_days INT NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT TRUE,
 CHECK(price>=0), CHECK(token_limit>0), CHECK(duration_months>0), CHECK(trial_days>=0)
);
CREATE TABLE ai_subscription (
 id BIGINT PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, plan_id BIGINT NOT NULL,
 order_no VARCHAR(80) NOT NULL UNIQUE, token_limit BIGINT NOT NULL, used_tokens BIGINT NOT NULL DEFAULT 0,
 reserved_tokens BIGINT NOT NULL DEFAULT 0, start_at TIMESTAMP NOT NULL, end_at TIMESTAMP NOT NULL,
 status VARCHAR(20) NOT NULL, trial BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(plan_id) REFERENCES ai_plan(id)
);
CREATE INDEX ai_subscription_owner ON ai_subscription(tenant_id,user_id,status);
CREATE TABLE ai_order (
 order_no VARCHAR(80) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 request_id VARCHAR(100) NOT NULL, plan_id BIGINT NOT NULL, price BIGINT NOT NULL,
 pay_type INT NOT NULL, pay_url VARCHAR(4000) NOT NULL DEFAULT '', pay_status INT NOT NULL DEFAULT 0,
 grant_status INT NOT NULL DEFAULT 0, subscription_id BIGINT, provider_transaction VARCHAR(160),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NOT NULL,
 UNIQUE(tenant_id,user_id,request_id), FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(plan_id) REFERENCES ai_plan(id)
);
CREATE TABLE ai_usage (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 subscription_id BIGINT NOT NULL, model_name VARCHAR(160) NOT NULL, input_tokens BIGINT NOT NULL DEFAULT 0,
 output_tokens BIGINT NOT NULL DEFAULT 0, charged_tokens BIGINT NOT NULL DEFAULT 0,
 status VARCHAR(20) NOT NULL, estimated BOOLEAN NOT NULL DEFAULT FALSE,
 started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at TIMESTAMP NULL,
 FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(subscription_id) REFERENCES ai_subscription(id)
);
CREATE INDEX ai_usage_owner ON ai_usage(tenant_id,user_id,started_at);
CREATE TABLE ai_skill_category (id BIGINT PRIMARY KEY, parent_id BIGINT NOT NULL DEFAULT 0, name VARCHAR(100) NOT NULL);
INSERT INTO ai_skill_category(id,parent_id,name) VALUES(1,0,'店铺运营'),(2,0,'日常办公'),(3,0,'数据分析'),(4,0,'其他');
CREATE TABLE ai_skill (
 id BIGINT PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, family_id BIGINT NOT NULL,
 name VARCHAR(160) NOT NULL, description VARCHAR(2000) NOT NULL, version VARCHAR(64) NOT NULL,
 category_id BIGINT NOT NULL DEFAULT 0, sub_category_id BIGINT NOT NULL DEFAULT 0,
 source INT NOT NULL DEFAULT 0, scope INT NOT NULL, review_status INT NOT NULL, review_reason VARCHAR(1000),
 review_at TIMESTAMP NULL, filename VARCHAR(255) NOT NULL, file_hash VARCHAR(64) NOT NULL, file_md5 VARCHAR(32) NOT NULL,
 status INT NOT NULL DEFAULT 1, download_count BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES app_user(id), CHECK(scope IN (1,2,3)), CHECK(review_status IN (0,1,2,3))
);
CREATE INDEX ai_skill_catalog ON ai_skill(scope,review_status,status,category_id);
CREATE INDEX ai_skill_owner ON ai_skill(tenant_id,user_id);
CREATE TABLE ai_skill_binding (
 user_id VARCHAR(36) NOT NULL, skill_id BIGINT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,skill_id), FOREIGN KEY(user_id) REFERENCES app_user(id), FOREIGN KEY(skill_id) REFERENCES ai_skill(id)
);
CREATE TABLE ai_skill_share (
 id BIGINT PRIMARY KEY, skill_id BIGINT NOT NULL, user_id VARCHAR(36) NOT NULL, code_hash VARCHAR(64) NOT NULL UNIQUE,
 code_cipher VARCHAR(1000) NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(skill_id) REFERENCES ai_skill(id), FOREIGN KEY(user_id) REFERENCES app_user(id)
);
