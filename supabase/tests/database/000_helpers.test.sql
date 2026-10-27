-- Test helpers. Not wrapped in a transaction so later files can use them.
-- Runs first (file order) under both `supabase test db` and `npm run test:sql`.

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

/** Creates an auth user (the signup trigger adds profile and passenger role). */
create or replace function tests.create_user(p_phone text, p_name text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  insert into auth.users (id, phone, raw_user_meta_data)
  values (gen_random_uuid(), p_phone, jsonb_build_object('full_name', p_name))
  returning id into v;
  return v;
end $$;

create or replace function tests.grant_role(p_user uuid, p_role public.app_role) returns void
language sql security definer set search_path = '' as $$
  insert into public.user_roles (user_id, role) values (p_user, p_role) on conflict do nothing
$$;

/** Switches to the API role for a user, the way PostgREST does per request. */
create or replace function tests.authenticate_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function tests.authenticate_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create or replace function tests.clear_authentication() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

select plan(1);
select ok(true, 'test helpers installed');
select * from finish();
