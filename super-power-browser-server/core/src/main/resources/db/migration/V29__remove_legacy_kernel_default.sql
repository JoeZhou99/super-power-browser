-- Kernel versions are selected from the published runtime catalog.
-- Existing environments keep their stored version; new writes must provide one explicitly.
ALTER TABLE environment ALTER COLUMN kernel_version SET DEFAULT '';
