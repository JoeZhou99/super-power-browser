ALTER TABLE app_user ADD COLUMN email VARCHAR(254) NOT NULL DEFAULT '';
CREATE INDEX app_user_email_lookup ON app_user(email);
