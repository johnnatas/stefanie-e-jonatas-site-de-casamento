alter table admin_security_settings
  add column secret_reset_token_hash text,
  add column secret_reset_token_salt text,
  add column secret_reset_expires_at timestamptz;
