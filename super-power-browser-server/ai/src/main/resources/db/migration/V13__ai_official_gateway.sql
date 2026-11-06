CREATE TABLE ai_official_model (
 id VARCHAR(160) PRIMARY KEY, name VARCHAR(160) NOT NULL, description VARCHAR(2000) NOT NULL DEFAULT '',
 upstream_model VARCHAR(160) NOT NULL, base_url VARCHAR(2000) NOT NULL, api_key VARCHAR(4000) NOT NULL,
 protocol VARCHAR(16) NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE, sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE ai_usage ADD reserved_tokens BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ai_order ADD balance_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ai_order ADD online_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ai_order ADD renewal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ai_order ADD trial BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX ai_order_provider_transaction ON ai_order(provider_transaction);
INSERT INTO ai_skill_category(id,parent_id,name) VALUES(101,2,'TikTok Shop'),(102,2,'Temu'),(103,2,'Shopee'),(104,2,'其他');
