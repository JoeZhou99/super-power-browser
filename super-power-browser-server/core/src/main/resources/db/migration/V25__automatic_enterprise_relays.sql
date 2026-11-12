-- Enterprise grants now select acceleration automatically; exits no longer bind individual pools.
ALTER TABLE device DROP FOREIGN KEY device_relay_pool_fk;
DROP INDEX device_relay_pool ON device;
ALTER TABLE device DROP COLUMN relay_pool_id;
ALTER TABLE relay_pool ADD COLUMN code VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE relay_pool ADD COLUMN remark VARCHAR(1000) NOT NULL DEFAULT '';
UPDATE relay_pool SET code=id WHERE code='';
CREATE UNIQUE INDEX relay_pool_code ON relay_pool(code);
