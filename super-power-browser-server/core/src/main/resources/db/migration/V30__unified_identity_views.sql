-- Unified read model for the operations service.
-- The browser service still owns the legacy identity records and writes them
-- transactionally. These views expose one stable account/member contract to
-- the admin service without copying credentials or splitting the source of truth.
CREATE OR REPLACE VIEW accounts AS
SELECT id, name
FROM tenant;

CREATE OR REPLACE VIEW users AS
SELECT
    id,
    tenant_id AS account_id,
    tenant_id,
    username,
    password_hash,
    display_name,
    phone,
    owner,
    enabled,
    deleted,
    department_id,
    created_at
FROM app_user;

CREATE OR REPLACE VIEW account_members AS
SELECT
    u.id,
    u.tenant_id AS account_id,
    u.id AS user_id,
    t.name AS account_name,
    u.username,
    u.phone,
    COALESCE(
        (
            SELECT r.name
            FROM member_role mr
            JOIN role r ON r.id = mr.role_id
            WHERE mr.user_id = u.id
              AND r.enabled = TRUE
            ORDER BY r.member_type DESC, r.name
            LIMIT 1
        ),
        CASE WHEN u.owner = TRUE THEN '超级管理员' ELSE '普通成员' END
    ) AS member_role,
    CASE
        WHEN u.deleted = TRUE THEN 'DELETED'
        WHEN u.enabled = TRUE THEN 'ACTIVE'
        ELSE 'DISABLED'
    END AS status,
    CAST('{}' AS VARCHAR(2000)) AS permissions_json,
    u.created_at
FROM app_user u
JOIN tenant t ON t.id = u.tenant_id;
