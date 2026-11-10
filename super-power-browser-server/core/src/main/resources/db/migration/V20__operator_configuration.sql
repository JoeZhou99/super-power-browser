-- Platform configuration is deliberately separate from tenant/company administration.
CREATE TABLE config_operator (
 id VARCHAR(36) PRIMARY KEY,
 username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE config_operator_session (
 token_hash VARCHAR(64) PRIMARY KEY,
 operator_id VARCHAR(36) NOT NULL,
 expires_at TIMESTAMP NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (operator_id) REFERENCES config_operator(id)
);
CREATE INDEX config_operator_session_expiry ON config_operator_session(expires_at);
CREATE TABLE config_state (
 id INT PRIMARY KEY,
 revision BIGINT NOT NULL DEFAULT 1
);
INSERT INTO config_state(id,revision) VALUES(1,1);
CREATE TABLE browser_config (
 config_key VARCHAR(40) PRIMARY KEY,
 payload LONGTEXT NOT NULL,
 revision BIGINT NOT NULL DEFAULT 1,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE config_audit (
 id VARCHAR(36) PRIMARY KEY,
 config_key VARCHAR(40) NOT NULL,
 operator_id VARCHAR(36) NOT NULL,
 operator_name VARCHAR(80) NOT NULL,
 revision BIGINT NOT NULL,
 before_json LONGTEXT NOT NULL,
 after_json LONGTEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (operator_id) REFERENCES config_operator(id)
);
CREATE INDEX config_audit_created ON config_audit(created_at);
