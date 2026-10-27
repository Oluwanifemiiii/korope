-- M0 foundation: extensions, organizations, identity, roles, drivers (sign-in only),
-- audit log and rate limiting. Every table has RLS on. See docs/ARCHITECTURE.md section 6.

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Internal helpers live in `private`, which API roles cannot reach directly.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
-- Nothing in `private` is callable unless granted explicitly below.
alter default privileges in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Organizations: one row in v1. Every operational table carries organization_id
-- so Korope+ corporate and School fleets can be added without reshaping data.
-- ---------------------------------------------------------------------------
create type public.organization_kind as enum ('public', 'corporate', 'school');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.organization_kind not null default 'public',
  created_at timestamptz not null default now()
);

insert into public.organizations (id, name, kind)
values ('00000000-0000-0000-0000-00000000c0de', 'Korope Public', 'public');

create function private.default_org() returns uuid
language sql immutable as $$ select '00000000-0000-0000-0000-00000000c0de'::uuid $$;
grant execute on function private.default_org() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Phone numbers are stored as E.164 digits without the plus, which is how
-- Supabase Auth stores auth.users.phone (2348034127765).
-- ---------------------------------------------------------------------------
create function private.normalize_phone(raw text) returns text
language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if length(d) = 11 and left(d, 1) = '0' then return '234' || substr(d, 2); end if;
  if length(d) = 10 and left(d, 1) in ('7', '8', '9') then return '234' || d; end if;
  return d;
end $$;
grant execute on function private.normalize_phone(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique,
  avatar_path text,
  theme_pref text not null default 'system' check (theme_pref in ('system', 'light', 'dark')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.app_role as enum ('passenger', 'driver', 'ops_admin');

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  organization_id uuid not null default private.default_org() references public.organizations (id),
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (user_id, role, organization_id)
);

-- Role checks read the table, not JWT claims, so a revoked role takes effect at once (D-004).
create function private.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = r
  )
$$;

create function private.is_ops() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role('ops_admin'::public.app_role)
$$;

grant execute on function private.has_role(public.app_role), private.is_ops() to authenticated;

-- ---------------------------------------------------------------------------
-- Drivers. Ops pre-register them by phone; the first OTP sign-in with that
-- phone links the account and grants the driver role. Fleet fields arrive in M1.
-- ---------------------------------------------------------------------------
create type public.driver_status as enum ('active', 'suspended', 'left');

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.default_org() references public.organizations (id),
  user_id uuid unique references auth.users (id) on delete set null,
  phone text not null unique check (phone ~ '^234[0-9]{10}$'),
  full_name text not null,
  photo_path text,
  license_no text,
  license_expires_on date,
  languages text[] not null default '{English}',
  status public.driver_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.normalize_driver_phone() returns trigger
language plpgsql as $$
begin
  new.phone := private.normalize_phone(new.phone);
  new.updated_at := now();
  return new;
end $$;

create trigger drivers_normalize before insert or update on public.drivers
for each row execute function private.normalize_driver_phone();

/** Used by the /driver sign-in route (service role) before an OTP is sent. */
create function private.can_driver_sign_in(raw_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.drivers d
    where d.phone = private.normalize_phone(raw_phone) and d.status = 'active'
  )
$$;
grant execute on function private.can_driver_sign_in(text) to service_role;

-- Links a signed-in user to a pre-registered driver with the same phone.
create function private.link_driver(p_user uuid, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_driver public.drivers;
begin
  if p_phone is null then return; end if;
  update public.drivers d set user_id = p_user
  where d.phone = private.normalize_phone(p_phone) and d.user_id is null and d.status = 'active'
  returning * into v_driver;
  if found then
    insert into public.user_roles (user_id, role, organization_id)
    values (p_user, 'driver', v_driver.organization_id)
    on conflict do nothing;
  end if;
end $$;

-- New auth user: profile, passenger role, driver link.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    private.normalize_phone(new.phone)
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'passenger') on conflict do nothing;
  perform private.link_driver(new.id, new.phone);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- A Google user who later verifies a phone (D-014) also gets linked.
create function private.handle_user_phone_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set phone = private.normalize_phone(new.phone), updated_at = now()
  where id = new.id;
  perform private.link_driver(new.id, new.phone);
  return new;
end $$;

create trigger on_auth_user_phone_changed after update of phone on auth.users
for each row when (new.phone is distinct from old.phone)
execute function private.handle_user_phone_change();

-- ---------------------------------------------------------------------------
-- Custom access token hook: adds `app_roles` to the JWT for proxy routing only.
-- ---------------------------------------------------------------------------
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  roles jsonb;
begin
  select coalesce(jsonb_agg(distinct ur.role), '[]'::jsonb) into roles
  from public.user_roles ur where ur.user_id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{app_roles}', roles);
  return jsonb_set(event, '{claims}', claims);
end $$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Audit log, written by triggers on ops-editable tables.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);

create function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(v_after ->> 'id', v_before ->> 'id', v_after ->> 'user_id', v_before ->> 'user_id'),
    v_before,
    v_after
  );
  return coalesce(new, old);
end $$;

create trigger audit_user_roles after insert or update or delete on public.user_roles
for each row execute function private.audit();
create trigger audit_drivers after insert or update or delete on public.drivers
for each row execute function private.audit();

-- ---------------------------------------------------------------------------
-- Rate limiting (D-013): fixed windows in a small table.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

/** Returns true if the call is allowed and records it; false once `max` is reached. */
create function private.rate_limit(p_key text, p_max integer, p_window interval) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := to_timestamp(
    floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window)
  );
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;
  return v_count <= p_max;
end $$;
grant execute on function private.rate_limit(text, integer, interval) to service_role;

-- ---------------------------------------------------------------------------
-- Service-only RPCs. `private` is never exposed through the API, so route handlers
-- using the service role call these thin public wrappers instead.
-- ---------------------------------------------------------------------------
create function public.svc_can_driver_sign_in(raw_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_driver_sign_in(raw_phone)
$$;

create function public.svc_rate_limit(p_key text, p_max integer, p_window_seconds integer) returns boolean
language sql security definer set search_path = '' as $$
  select private.rate_limit(p_key, p_max, make_interval(secs => p_window_seconds))
$$;

revoke all on function public.svc_can_driver_sign_in(text) from public, anon, authenticated;
revoke all on function public.svc_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.svc_can_driver_sign_in(text) to service_role;
grant execute on function public.svc_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.drivers enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- organizations: signed-in users read; ops edit.
create policy organizations_read on public.organizations for select to authenticated using (true);
create policy organizations_ops_update on public.organizations for update to authenticated
  using ((select private.is_ops())) with check ((select private.is_ops()));

-- profiles: own row read and update; ops read and update all. Inserts come from the trigger.
create policy profiles_own_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_ops()));
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_ops()))
  with check (id = (select auth.uid()) or (select private.is_ops()));

-- Passengers may not change their own phone through the table; it follows auth.users.
create function private.guard_profile_phone() returns trigger
language plpgsql as $$
begin
  if new.phone is distinct from old.phone and current_user = 'authenticated' then
    raise exception 'phone is managed by sign-in' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
for each row execute function private.guard_profile_phone();

-- user_roles: read own; only ops grant or revoke.
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_ops()));
create policy user_roles_ops_insert on public.user_roles for insert to authenticated
  with check ((select private.is_ops()));
create policy user_roles_ops_update on public.user_roles for update to authenticated
  using ((select private.is_ops())) with check ((select private.is_ops()));
create policy user_roles_ops_delete on public.user_roles for delete to authenticated
  using ((select private.is_ops()));

-- drivers: a driver reads their own row; ops manage all.
create policy drivers_read on public.drivers for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_ops()));
create policy drivers_ops_insert on public.drivers for insert to authenticated
  with check ((select private.is_ops()));
create policy drivers_ops_update on public.drivers for update to authenticated
  using ((select private.is_ops())) with check ((select private.is_ops()));
create policy drivers_ops_delete on public.drivers for delete to authenticated
  using ((select private.is_ops()));

-- audit_log: ops read only. rate_limits: no API access at all.
create policy audit_log_ops_read on public.audit_log for select to authenticated
  using ((select private.is_ops()));

-- Anonymous visitors get nothing from these tables.
revoke all on public.organizations, public.profiles, public.user_roles, public.drivers,
  public.audit_log, public.rate_limits from anon;
revoke all on public.rate_limits from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
