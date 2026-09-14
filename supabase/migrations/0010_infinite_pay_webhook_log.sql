create table if not exists infinite_pay_webhook_events (
  id uuid primary key default gen_random_uuid(),
  order_nsu text,
  transaction_nsu text,
  invoice_slug text,
  paid_amount numeric(10, 2),
  raw_payload jsonb not null,
  processed boolean not null default false,
  error_message text,
  received_at timestamptz not null default now()
);

-- No public RLS policies: only server-side service-role code (the webhook
-- route handler) reads or writes this table, same rationale as 0001_init.sql.
alter table infinite_pay_webhook_events enable row level security;

alter table gift_contributions
  add column if not exists infinite_pay_invoice_slug text;
