-- M0 foundation on Neon: API roles, request identity, Better Auth tables, organizations,
-- profiles, roles, drivers (sign-in only), audit log and rate limiting.
-- Every table has RLS on. See docs/ARCHITECTURE.md section 6 and DECISIONS D-025 to D-028.

create extension if not exists postgis;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- API roles. The app connects as the database owner (which bypasses RLS) and,
-- for anything done on a user's behalf, switches to `authenticated` or `anon`
-- inside the transaction with the user id in request.jwt.claims (src/lib/db.ts).
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
end $$;
grant anon, authenticated to current_user;
grant usage on schema public to anon, authenticated;

-- Identity of the current request, set per transaction by the app.
create schema if not exists auth;
grant usage on schema auth to anon, authenticated;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant execute on function auth.jwt(), auth.uid() to anon, authenticated;

-- Internal helpers live in `private`; nothing there is callable unless granted below.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Better Auth tables (self-hosted Better Auth, D-025). Column names are Better
-- Auth's own camelCase; ids are uuids so the rest of the schema can reference them.
-- API roles never touch these; only the app's Better Auth instance does.
-- ---------------------------------------------------------------------------
create table public.auth_user (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "phoneNumber" text unique,
  "phoneNumberVerified" boolean,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.auth_session (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.auth_user (id) on delete cascade,
  token text not null unique,
  "expiresAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index auth_session_user_idx on public.auth_session ("userId");

create table public.auth_account (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.auth_user (id) on delete cascade,
  "accountId" text not null,
  "providerId" text not null,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index auth_account_user_idx on public.auth_account ("userId");

create table public.auth_verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index auth_verification_identifier_idx on public.auth_verification (identifier);

create table public.auth_rate_limit (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count integer not null,
  "lastRequest" bigint not null
);

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
grant execute on function private.default_org() to authenticated;

-- ---------------------------------------------------------------------------
-- Phone numbers are stored as E.164 digits without the plus (2348034127765).
-- Better Auth keeps its own copy with the plus ("+2348034127765").
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
grant execute on function private.normalize_phone(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references public.auth_user (id) on delete cascade,
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
  user_id uuid not null references public.auth_user (id) on delete cascade,
  role public.app_role not null,
  organization_id uuid not null default private.default_org() references public.organizations (id),
  granted_by uuid references public.auth_user (id),
  created_at timestamptz not null default now(),
  primary key (user_id, role, organization_id)
);

-- Role checks read the table, so a revoked role takes effect at once (D-004).
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
-- Drivers. Ops pre-register them by phone; the first verified sign-in with that
-- phone links the account and grants the driver role. Fleet fields arrive in M1.
-- ---------------------------------------------------------------------------
create type public.driver_status as enum ('active', 'suspended', 'left');

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.default_org() references public.organizations (id),
  user_id uuid unique references public.auth_user (id) on delete set null,
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

/** Used by the /driver sign-in screen (server, owner connection) before a code is sent. */
create function private.can_driver_sign_in(raw_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.drivers d
    where d.phone = private.normalize_phone(raw_phone) and d.status = 'active'
  )
$$;

-- Links a user to a pre-registered driver with the same verified phone.
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

-- New user: profile, passenger role, and a driver link if the phone is verified.
-- Unverified phone numbers are never trusted: Better Auth lets a user type any
-- number into their profile, so only phoneNumberVerified = true counts.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := case when new."phoneNumberVerified" then private.normalize_phone(new."phoneNumber") end;
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, nullif(new.name, new."phoneNumber"), v_phone)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'passenger') on conflict do nothing;
  perform private.link_driver(new.id, v_phone);
  return new;
end $$;

create trigger on_auth_user_created after insert on public.auth_user
for each row execute function private.handle_new_user();

-- A Google user who later verifies a phone (D-014) gets it on their profile and,
-- if ops registered that number, the driver role.
create function private.handle_user_phone_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := case when new."phoneNumberVerified" then private.normalize_phone(new."phoneNumber") end;
begin
  update public.profiles set phone = v_phone, updated_at = now() where id = new.id;
  perform private.link_driver(new.id, v_phone);
  return new;
end $$;

create trigger on_auth_user_phone_changed after update of "phoneNumber", "phoneNumberVerified" on public.auth_user
for each row
when (new."phoneNumber" is distinct from old."phoneNumber" or new."phoneNumberVerified" is distinct from old."phoneNumberVerified")
execute function private.handle_user_phone_change();

/** Roles for a user, read by the app after Better Auth resolves the session. */
create function private.user_roles_of(p_user uuid) returns public.app_role[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct ur.role order by ur.role), '{}') from public.user_roles ur where ur.user_id = p_user
$$;

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
-- Rate limiting for our own endpoints (D-013). Better Auth rate-limits its own
-- routes in auth_rate_limit.
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.auth_user enable row level security;
alter table public.auth_session enable row level security;
alter table public.auth_account enable row level security;
alter table public.auth_verification enable row level security;
alter table public.auth_rate_limit enable row level security;
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

-- The phone on a profile follows the verified sign-in phone; nobody edits it directly.
create function private.guard_profile_phone() returns trigger
language plpgsql as $$
begin
  if new.phone is distinct from old.phone and current_user in ('authenticated', 'anon') then
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

-- audit_log: ops read only.
create policy audit_log_ops_read on public.audit_log for select to authenticated
  using ((select private.is_ops()));

-- Grants: API roles get only what the policies above are for.
grant select, update on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.drivers to authenticated;
grant select on public.audit_log to authenticated;
-- Better Auth tables and rate_limits: no API role access at all (not granted).
