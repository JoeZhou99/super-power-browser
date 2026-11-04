ALTER TABLE device ADD COLUMN purchase_order_id VARCHAR(36);
ALTER TABLE device ADD COLUMN purchase_sequence INT;
ALTER TABLE device ADD COLUMN acceleration_expires_at TIMESTAMP NULL;
CREATE UNIQUE INDEX device_delivery ON device(purchase_order_id,purchase_sequence);
