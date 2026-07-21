alter table admin_security_settings
  add column resend_api_key text;

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  entity_type text not null check (entity_type in ('gift_contribution', 'guest')),
  entity_id text not null,
  sent_at timestamptz not null default now(),
  unique (kind, entity_type, entity_id)
);

alter table notification_log enable row level security;

-- Same model as every other table here: only trusted server code using
-- the service-role key reads/writes this, so no policies are granted
-- to the anon/authenticated roles.
