-- Append newly supported locale modes once during configuration initialization.
-- A separate marker keeps subsequent operator removals/disabling intact on restart.
ALTER TABLE config_state ADD COLUMN locale_modes_initialized BOOLEAN NOT NULL DEFAULT FALSE;
