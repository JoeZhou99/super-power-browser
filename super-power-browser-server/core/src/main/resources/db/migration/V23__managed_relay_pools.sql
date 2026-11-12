-- Shared schema is migrated by the business service; the operations service owns pool management.
CREATE TABLE relay_pool (
 id VARCHAR(36) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 candidate_limit INT NOT NULL DEFAULT 4,
 revision BIGINT NOT NULL DEFAULT 1,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(candidate_limit BETWEEN 1 AND 4)
);
CREATE TABLE relay_node (
 id VARCHAR(36) PRIMARY KEY,
 pool_id VARCHAR(36) NOT NULL,
 name VARCHAR(120) NOT NULL,
 region VARCHAR(150) NOT NULL DEFAULT '',
 protocol VARCHAR(10) NOT NULL,
 host VARCHAR(255) NOT NULL,
 port INT NOT NULL,
 username VARCHAR(255) NOT NULL,
 password VARCHAR(2000) NOT NULL,
 proxy_options TEXT NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 sort_order INT NOT NULL DEFAULT 0,
 revision BIGINT NOT NULL DEFAULT 1,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(pool_id) REFERENCES relay_pool(id),
 CHECK(CASE protocol WHEN 'http' THEN 1 WHEN 'https' THEN 1 WHEN 'socks5' THEN 1 ELSE 0 END=1),
 CHECK(port BETWEEN 1 AND 65535),
 UNIQUE(pool_id,host,port)
);
CREATE INDEX relay_node_pool ON relay_node(pool_id,enabled,sort_order);
CREATE TABLE relay_pool_tenant (
 pool_id VARCHAR(36) NOT NULL,
 tenant_id VARCHAR(36) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 expires_at TIMESTAMP NULL,
 PRIMARY KEY(pool_id,tenant_id),
 FOREIGN KEY(pool_id) REFERENCES relay_pool(id),
 FOREIGN KEY(tenant_id) REFERENCES tenant(id)
);
ALTER TABLE device ADD COLUMN relay_pool_id VARCHAR(36) NULL;
ALTER TABLE device ADD CONSTRAINT device_relay_pool_fk FOREIGN KEY(relay_pool_id) REFERENCES relay_pool(id);
CREATE INDEX device_relay_pool ON device(relay_pool_id);
