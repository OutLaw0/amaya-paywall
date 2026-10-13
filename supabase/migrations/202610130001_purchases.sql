create table public.purchases (
  id uuid primary key,
  offer_id text not null check (offer_id in ('monthly', 'yearly')),
  device_id uuid not null,
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at)
);

create index purchases_device_expiry on public.purchases (device_id, expires_at desc);
alter table public.purchases enable row level security;
revoke all on public.purchases from anon, authenticated;
grant select, insert on public.purchases to service_role;
comment on table public.purchases is 'Demo purchases only. No real payments or personal information.';
