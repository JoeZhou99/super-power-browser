-- Proxy management used to share the device permissions. Preserve each existing role's
-- scope when splitting the menus, without granting permissions the role did not have.
INSERT INTO role_permission(role_id,permission)
 SELECT old.role_id,'proxy.view' FROM role_permission old
 WHERE old.permission='device.view'
 AND NOT EXISTS (SELECT 1 FROM role_permission current_permission
                 WHERE current_permission.role_id=old.role_id AND current_permission.permission='proxy.view');
INSERT INTO role_permission(role_id,permission)
 SELECT old.role_id,'proxy.edit' FROM role_permission old
 WHERE old.permission='device.edit'
 AND NOT EXISTS (SELECT 1 FROM role_permission current_permission
                 WHERE current_permission.role_id=old.role_id AND current_permission.permission='proxy.edit');
INSERT INTO role_permission(role_id,permission)
 SELECT old.role_id,'proxy.export' FROM role_permission old
 WHERE old.permission='device.export'
 AND NOT EXISTS (SELECT 1 FROM role_permission current_permission
                 WHERE current_permission.role_id=old.role_id AND current_permission.permission='proxy.export');
