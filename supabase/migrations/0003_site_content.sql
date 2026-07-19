-- Generic content-block store for admin-editable page/section text and
-- photos (wedding date, Home Hero, Save the Date milestone photos, Home
-- topics carousel, and the 3 Dicas e Instruções pages).

create table if not exists site_content (
  slug text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table site_content enable row level security;

-- Same model as guests/gifts/gift_contributions/admin_users: the
-- application only reads/writes this table from trusted server code
-- using the service-role key (which bypasses RLS), so no policies are
-- granted to the anon/authenticated roles here.

insert into storage.buckets (id, name, public)
values ('site-content', 'site-content', true)
on conflict (id) do nothing;
