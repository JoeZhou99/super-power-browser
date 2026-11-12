ALTER TABLE device ADD COLUMN relay_binding_revision BIGINT NOT NULL DEFAULT 1;
-- Existing proxies deliberately start unbound. Enterprise grants only make nodes eligible.
CREATE TABLE device_relay_node (
 device_id VARCHAR(36) NOT NULL,
 node_id VARCHAR(36) NOT NULL,
 sort_order INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (device_id,node_id),
 CONSTRAINT device_relay_position UNIQUE (device_id,sort_order),
 CONSTRAINT device_relay_device_fk FOREIGN KEY (device_id) REFERENCES device(id) ON DELETE CASCADE,
 CONSTRAINT device_relay_node_fk FOREIGN KEY (node_id) REFERENCES relay_node(id) ON DELETE CASCADE,
 CONSTRAINT device_relay_order CHECK (sort_order>=0 AND sort_order<8)
);
CREATE INDEX device_relay_node_reverse ON device_relay_node(node_id,device_id);
