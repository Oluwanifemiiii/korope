begin;
select plan(29);

-- Personas
select tests.create_user('+2348030000001', 'Adaeze Okafor') as ada \gset
select tests.create_user('+2348030000002', 'Chidi Okafor') as chidi \gset
select tests.create_user('+2348030000009', 'Ops Admin') as ops \gset
select tests.grant_role(:'ops', 'ops_admin');

-- Signup trigger -------------------------------------------------------------
select is(
  (select full_name from public.profiles where id = :'ada'),
  'Adaeze Okafor',
  'signup creates a profile with the name'
);
select is(
  (select phone from public.profiles where id = :'ada'),
  '2348030000001',
  'profile stores the verified phone as E.164 digits'
);
select is(
  (select array_agg(role::text) from public.user_roles where user_id = :'ada'),
  array['passenger'],
  'signup grants only the passenger role'
);
select tests.create_user('+2348030000003') as phoneonly \gset
select is(
  (select full_name from public.profiles where id = :'phoneonly'),
  null,
  'phone sign-up without a name leaves full_name empty, not the phone number'
);

-- Phone normalisation ----------------------------------------------------------
select is(private.normalize_phone('0803 412 7765'), '2348034127765', 'local 0-prefixed number');
select is(private.normalize_phone('803 412 7765'), '2348034127765', 'number without leading 0');
select is(private.normalize_phone('+234 803 412 7765'), '2348034127765', 'international format');

-- Driver pre-registration and linking ----------------------------------------------
insert into public.drivers (phone, full_name) values ('0803 000 0050', 'Tunde Adeyemi');
select ok(private.can_driver_sign_in('+2348030000050'), 'pre-registered driver may sign in');
select ok(not private.can_driver_sign_in('2348030000051'), 'unknown phone may not use driver sign-in');

select tests.create_user('+2348030000050', 'Tunde Adeyemi') as tunde \gset
select is(
  (select user_id from public.drivers where phone = '2348030000050'),
  :'tunde'::uuid,
  'first verified sign-in links the driver row'
);
select is(
  private.user_roles_of(:'tunde'),
  array['passenger', 'driver']::public.app_role[],
  'linked driver gets the driver role'
);

-- An unverified phone must never link a driver account.
insert into public.drivers (phone, full_name) values ('2348030000070', 'Kemi Bello');
select tests.create_user('+2348030000070', 'Impostor', false) as impostor \gset
select ok(
  not exists (select 1 from public.user_roles where user_id = :'impostor' and role = 'driver'),
  'unverified phone does not get the driver role'
);
select is((select phone from public.profiles where id = :'impostor'), null, 'unverified phone is not put on the profile');

-- Google user who verifies the driver phone later
insert into public.drivers (phone, full_name) values ('2348030000060', 'Bisi Lawal');
insert into public.auth_user (name, email) values ('Bisi Lawal', 'bisi@example.com') returning id as bisi \gset
update public.auth_user set "phoneNumber" = '+2348030000060', "phoneNumberVerified" = true where id = :'bisi';
select ok(
  exists (select 1 from public.user_roles where user_id = :'bisi' and role = 'driver'),
  'verifying a matching phone later links the driver'
);

-- RLS: passenger ------------------------------------------------------------------------
select tests.authenticate_as(:'ada');
select is((select count(*)::int from public.profiles), 1, 'passenger sees only their own profile');
select is((select count(*)::int from public.user_roles), 1, 'passenger sees only their own roles');
select is((select count(*)::int from public.drivers), 0, 'passenger cannot list drivers');
select is((select count(*)::int from public.audit_log), 0, 'passenger cannot read the audit log');

update public.profiles set full_name = 'Chidi hacked' where id = :'chidi';
select tests.clear_authentication();
select is((select full_name from public.profiles where id = :'chidi'), 'Chidi Okafor', 'passenger cannot edit another profile');

select tests.authenticate_as(:'ada');
select lives_ok(
  format($$update public.profiles set full_name = 'Adaeze O.' where id = %L$$, :'ada'),
  'passenger can edit their own name'
);
select throws_ok(
  format($$update public.profiles set phone = '2348039999999' where id = %L$$, :'ada'),
  '42501', 'phone is managed by sign-in',
  'passenger cannot change their phone through the table'
);
select throws_ok(
  format($$insert into public.user_roles (user_id, role) values (%L, 'ops_admin')$$, :'ada'),
  '42501', null,
  'passenger cannot grant themselves ops_admin'
);
select throws_ok(
  $$insert into public.drivers (phone, full_name) values ('2348030000080', 'Fake Driver')$$,
  '42501', null,
  'passenger cannot register drivers'
);
select throws_ok($$select * from public.rate_limits$$, '42501', null, 'API roles cannot read rate limits');
select throws_ok($$select * from public.auth_session$$, '42501', null, 'API roles cannot read sessions');

-- RLS: driver ---------------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(:'tunde');
select is((select count(*)::int from public.drivers), 1, 'driver sees only their own driver row');

-- RLS: anon -----------------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_anon();
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot read profiles');

-- RLS: ops ------------------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(:'ops');
select lives_ok(
  format($$insert into public.user_roles (user_id, role) values (%L, 'ops_admin')$$, :'chidi'),
  'ops can grant roles'
);
select tests.clear_authentication();
select ok(
  exists (select 1 from public.audit_log where entity = 'user_roles' and actor_id = :'ops'::uuid),
  'role grants are audited with the actor'
);

select * from finish();
rollback;
