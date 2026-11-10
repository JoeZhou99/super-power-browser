CREATE TABLE department (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL,
 is_default BOOLEAN NOT NULL DEFAULT FALSE, deleted BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);
CREATE INDEX department_tenant ON department(tenant_id,deleted);
ALTER TABLE app_user ADD COLUMN department_id VARCHAR(36);
ALTER TABLE app_user ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_user ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE role ADD COLUMN department_id VARCHAR(36);
ALTER TABLE role ADD COLUMN builtin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE role ADD COLUMN legacy_member_type INT NULL;
INSERT INTO department(id,tenant_id,name,is_default) SELECT id,id,'默认部门',TRUE FROM tenant;
UPDATE app_user SET department_id=tenant_id;
UPDATE role SET department_id=tenant_id;
-- Previously member_type was a display label only. Preserve it for reference, but do not
-- silently broaden any existing role's resource scope when department hierarchy takes effect.
UPDATE role SET legacy_member_type=member_type,member_type=1;
ALTER TABLE app_user ADD CONSTRAINT app_user_department_fk FOREIGN KEY(department_id) REFERENCES department(id);
ALTER TABLE role ADD CONSTRAINT role_department_fk FOREIGN KEY(department_id) REFERENCES department(id);
CREATE INDEX user_department ON app_user(tenant_id,department_id,deleted);
CREATE INDEX role_department ON role(tenant_id,department_id);
INSERT INTO role(id,tenant_id,name,department_id,builtin,member_type)
 SELECT CONCAT('p1-',REPLACE(id,'-','')),id,'普通成员',id,TRUE,1 FROM tenant;
INSERT INTO role(id,tenant_id,name,department_id,builtin,member_type)
 SELECT CONCAT('p2-',REPLACE(id,'-','')),id,'管理员',id,TRUE,2 FROM tenant;
INSERT INTO role(id,tenant_id,name,department_id,builtin,member_type)
 SELECT CONCAT('p3-',REPLACE(id,'-','')),id,'超级管理员',id,TRUE,3 FROM tenant;
INSERT INTO role_permission(role_id,permission)
 SELECT r.id,p.permission FROM role r CROSS JOIN (
 SELECT 'shop.view' AS permission,1 AS min_type UNION ALL SELECT 'shop.open',1 UNION ALL SELECT 'device.view',1
 UNION ALL SELECT 'shop.create',2 UNION ALL SELECT 'shop.edit',2 UNION ALL SELECT 'shop.delete',2
 UNION ALL SELECT 'shop.grant',2 UNION ALL SELECT 'device.edit',2 UNION ALL SELECT 'member.manage',2 UNION ALL SELECT 'role.manage',2
 UNION ALL SELECT 'ai.use',3 UNION ALL SELECT 'ai.purchase',3 UNION ALL SELECT 'shop.export',3
 UNION ALL SELECT 'device.buy',3 UNION ALL SELECT 'device.renew',3 UNION ALL SELECT 'device.export',3
 UNION ALL SELECT 'wallet.view',3 UNION ALL SELECT 'wallet.recharge',3 UNION ALL SELECT 'order.view',3 UNION ALL SELECT 'order.export',3
 ) p WHERE r.builtin=TRUE AND r.member_type>=p.min_type;
CREATE TABLE member_invitation (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, department_id VARCHAR(36) NOT NULL,
 token VARCHAR(64) NOT NULL UNIQUE, created_by VARCHAR(36) NOT NULL,
 expires_at TIMESTAMP NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(tenant_id) REFERENCES tenant(id), FOREIGN KEY(department_id) REFERENCES department(id),
 FOREIGN KEY(created_by) REFERENCES app_user(id)
);
CREATE INDEX invitation_tenant ON member_invitation(tenant_id,department_id);
CREATE TABLE member_application (
 id VARCHAR(36) PRIMARY KEY, tenant_id VARCHAR(36) NOT NULL, department_id VARCHAR(36) NOT NULL,
 invitation_id VARCHAR(36) NOT NULL, username VARCHAR(80) NOT NULL, display_name VARCHAR(120) NOT NULL,
 password_hash VARCHAR(100), phone VARCHAR(40) NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 reason VARCHAR(500) NOT NULL DEFAULT '', reviewed_by VARCHAR(36), reviewed_at TIMESTAMP NULL, user_id VARCHAR(36),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(tenant_id) REFERENCES tenant(id), FOREIGN KEY(department_id) REFERENCES department(id),
 FOREIGN KEY(invitation_id) REFERENCES member_invitation(id), FOREIGN KEY(reviewed_by) REFERENCES app_user(id),
 FOREIGN KEY(user_id) REFERENCES app_user(id), CHECK(status IN ('PENDING','APPROVED','REJECTED'))
);
CREATE INDEX application_tenant ON member_application(tenant_id,department_id,status);
