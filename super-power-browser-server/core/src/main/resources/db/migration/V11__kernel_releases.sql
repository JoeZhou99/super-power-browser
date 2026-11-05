CREATE TABLE kernel_catalog_lock (id INT PRIMARY KEY);
INSERT INTO kernel_catalog_lock(id) VALUES(1);

CREATE TABLE kernel_release (
 id VARCHAR(36) PRIMARY KEY,
 version VARCHAR(30) NOT NULL,
 platform VARCHAR(20) NOT NULL,
 arch VARCHAR(20) NOT NULL,
 full_version VARCHAR(50) NOT NULL,
 sha256 VARCHAR(64) NOT NULL,
 archive_bytes BIGINT NOT NULL,
 descriptor MEDIUMTEXT NOT NULL,
 storage_type VARCHAR(10) NOT NULL,
 storage_key VARCHAR(512) NOT NULL,
 object_version VARCHAR(200),
 state VARCHAR(16) NOT NULL,
 recommended BOOLEAN NOT NULL DEFAULT FALSE,
 revision BIGINT NOT NULL DEFAULT 0,
 created_by VARCHAR(36),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(version,platform,arch)
);
CREATE INDEX kernel_release_state ON kernel_release(state,platform,arch);
