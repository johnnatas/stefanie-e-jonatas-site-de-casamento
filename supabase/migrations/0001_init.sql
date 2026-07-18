-- Wedding site schema: guests (RSVP), gifts, gift contributions (Mercado Pago) and admin allowlist.

create extension if not exists "pgcrypto";

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  companions_count integer not null default 0,
  message text,
  attendance_confirmed boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  image_url text not null,
  price numeric(10, 2) not null check (price > 0),
  category text not null,
  status text not null default 'available' check (status in ('available', 'reserved', 'paid')),
  created_at timestamptz not null default now()
);

create table if not exists gift_contributions (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references gifts (id),
  guest_name text not null,
  guest_email text not null,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  mercado_pago_preference_id text,
  mercado_pago_payment_id text,
  created_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null
);

-- Row Level Security: the application only reads/writes these tables from
-- trusted server code using the service-role key (which bypasses RLS), so no
-- policies are granted to the anon/authenticated roles here — defense in depth
-- in case a client ever obtains the anon key.
alter table guests enable row level security;
alter table gifts enable row level security;
alter table gift_contributions enable row level security;
alter table admin_users enable row level security;

-- Exception: an authenticated user may check whether *their own* id is in the
-- admin allowlist, so the login flow and middleware can grant/deny access to
-- the admin panel without needing the service-role key on every request.
create policy "Authenticated users can read their own admin row"
  on admin_users for select
  to authenticated
  using (auth.uid() = id);
