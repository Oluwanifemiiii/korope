-- Test helpers. Not wrapped in a transaction so later files can use them.
-- Runs first (file order). Only ever applied to a test database or the Neon `ci` branch.

create extension if not exists pgtap;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

/** Creates a user the way Better Auth's phone sign-up does (signup trigger adds profile and role). */
create or replace function tests.create_user(p_phone text, p_name text default null, p_verified boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  insert into public.auth_user (name, email, "phoneNumber", "phoneNumberVerified")
  values (
    coalesce(p_name, p_phone),
    regexp_replace(p_phone, '\D', '', 'g') || '@phone.korope.test',
    p_phone,
    p_verified
  )
  returning id into v;
  return v;
end $$;

create or replace function tests.grant_role(p_user uuid, p_role public.app_role) returns void
language sql security definer set search_path = '' as $$
  insert into public.user_roles (user_id, role) values (p_user, p_role) on conflict do nothing
$$;

/** Switches to the API role for a user, the way src/lib/db.ts does per request. */
create or replace function tests.authenticate_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function tests.authenticate_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

create or replace function tests.clear_authentication() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select ok(true, 'test helpers installed');
select * from finish();
