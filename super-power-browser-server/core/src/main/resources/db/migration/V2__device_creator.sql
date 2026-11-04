ALTER TABLE device ADD COLUMN created_by VARCHAR(36);
CREATE INDEX device_creator ON device(tenant_id,created_by);
