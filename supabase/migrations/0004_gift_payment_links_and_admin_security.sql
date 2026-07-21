-- Gift payment links (Mercado Pago fixed checkout links, phase 1) and
-- admin-managed security settings (Mercado Pago Access Token + the
-- secret key gating gift price changes).

alter table gifts
  add column if not exists mercado_pago_preference_id text,
  add column if not exists mercado_pago_checkout_url text;

create table if not exists admin_security_settings (
  id integer primary key default 1 check (id = 1),
  mercadopago_access_token text,
  price_change_secret_hash text,
  price_change_secret_salt text,
  updated_at timestamptz not null default now()
);

alter table admin_security_settings enable row level security;

-- Same model as every other table here: only trusted server code using
-- the service-role key reads/writes this, so no policies are granted
-- to the anon/authenticated roles.

insert into admin_security_settings (id) values (1)
  on conflict (id) do nothing;
