ALTER TABLE device ADD COLUMN provider VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE device ADD COLUMN change_ip_url VARCHAR(4000) NOT NULL DEFAULT '';
ALTER TABLE device ADD COLUMN check_connected BOOLEAN NULL;
ALTER TABLE device ADD COLUMN check_ip VARCHAR(45) NOT NULL DEFAULT '';
ALTER TABLE device ADD COLUMN check_country_name VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE device ADD COLUMN check_latency_ms INT NULL;
ALTER TABLE device ADD COLUMN check_message VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE device ADD COLUMN checked_at TIMESTAMP NULL;
CREATE INDEX proxy_list ON device(tenant_id,ip_type,recycled,web_type,created_at);
