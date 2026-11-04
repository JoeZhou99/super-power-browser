CREATE TABLE extension_session (
 id VARCHAR(36) PRIMARY KEY, token_hash VARCHAR(64) NOT NULL UNIQUE,
 environment_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 parent_hash VARCHAR(64) NOT NULL, expires_at TIMESTAMP NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(environment_id) REFERENCES environment(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES app_user(id)
);
CREATE INDEX extension_session_environment ON extension_session(environment_id);
CREATE TABLE extension_document (
 environment_id VARCHAR(36) NOT NULL, collection_name VARCHAR(60) NOT NULL,
 document_id VARCHAR(100) NOT NULL, payload MEDIUMTEXT NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(environment_id,collection_name,document_id),
 FOREIGN KEY(environment_id) REFERENCES environment(id) ON DELETE CASCADE
);
