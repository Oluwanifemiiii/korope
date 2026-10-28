begin;
select plan(8);

select tests.create_user('+2348032000001', 'Rider') as pax \gset
select tests.create_user('+2348032000002', 'Other') as other \gset
select tests.create_user('+2348032000009', 'Ops') as ops \gset
select tests.grant_role(:'ops', 'ops_admin');
select id as chevron from public.stops where code = 'chevron' \gset
select id as marina from public.stops where code = 'marina' \gset

-- Make sure there is a departure in the window regardless of the day the test runs.
select public.generate_departures((now() at time zone 'Africa/Lagos')::date, (now() at time zone 'Africa/Lagos')::date + 3);
insert into public.timetables (route_id, days, depart_local)
select id, array[1,2,3,4,5,6,7]::smallint[], ((now() at time zone 'Africa/Lagos') + interval '2 hours')::time(0)
from public.routes where code = 'L2';
select public.generate_departures((now() at time zone 'Africa/Lagos')::date, (now() at time zone 'Africa/Lagos')::date + 1);

-- Public timetable ---------------------------------------------------------------
select tests.authenticate_anon();
select ok((select count(*) > 0 from public.stop_departures(:'chevron')), 'anon sees upcoming buses from Chevron');
select ok(
  (select bool_and(to_name <> 'Chevron Roundabout') from public.stop_departures(:'chevron', 20)),
  'buses that end at Chevron are not offered as boardable from it'
);
select is(
  (select array_agg(distinct to_name) from public.stop_departures(:'marina', 20)),
  array['Abraham Adesanya'],
  'from Marina the only bus is the return trip to Abraham Adesanya'
);
select tests.clear_authentication();

-- Korope+ leads -----------------------------------------------------------------------
select tests.authenticate_anon();
select lives_ok(
  $$insert into public.korope_plus_leads (organisation, riders, contact) values ('Acme School', '40', 'ops@acme.example')$$,
  'anyone can register interest'
);
select throws_ok($$select * from public.korope_plus_leads$$, '42501', null, 'anon cannot read leads');
select tests.clear_authentication();

select tests.authenticate_as(:'pax');
select throws_ok(
  format($$insert into public.korope_plus_leads (user_id, organisation, riders, contact) values (%L, 'X Ltd', '5', 'x@x.example')$$, :'other'),
  '42501', null,
  'a rider cannot file a lead in someone else''s name'
);
select is((select count(*)::int from public.korope_plus_leads), 0, 'riders cannot read leads, even their own');
select tests.clear_authentication();

select tests.authenticate_as(:'ops');
select is((select count(*)::int from public.korope_plus_leads), 1, 'ops read leads');
select tests.clear_authentication();

select * from finish();
rollback;
