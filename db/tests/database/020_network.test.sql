begin;
select plan(24);

select tests.create_user('+2348031000001', 'Passenger') as pax \gset
select tests.create_user('+2348031000009', 'Ops') as ops \gset
select tests.grant_role(:'ops', 'ops_admin');
select id as l1 from public.routes where code = 'L1' \gset
select id as l3 from public.routes where code = 'L3' \gset

-- Seed shape -------------------------------------------------------------------
select is((select count(*)::int from public.stops), 16, 'corridor has 16 stops');
select is((select count(*)::int from public.routes), 6, 'three routes in both directions');
select is(
  (select array_agg(n order by code) from (select l.code, count(s.*)::int as n from public.seat_layouts l join public.layout_seats s on s.layout_id = l.id group by l.code) x),
  array[16, 18, 14],
  'layouts have 16, 18 and 14 seats (coaster-16, coaster-18, hiace-14)'
);
select ok((select bool_and(path is not null) from public.routes), 'every route has a path');
select ok(
  (select bool_and(distance_m > 0 and baseline_offset_s > 0) from public.route_stops where seq > 0),
  'stops after the first have distance and a scheduled offset'
);
select ok(
  (select bool_and(a.baseline_offset_s < b.baseline_offset_s)
   from public.route_stops a join public.route_stops b on b.route_id = a.route_id and b.seq = a.seq + 1),
  'scheduled offsets increase along every route'
);

-- Fares ----------------------------------------------------------------------------------
select is(
  (public.quote_fare(:'l1', 3::smallint, 10::smallint) ->> 'total_kobo')::bigint,
  150000::bigint,
  'Chevron to CMS on L1 totals ₦1,500 (design 10a)'
);
select is(
  public.quote_fare(:'l1', 3::smallint, 10::smallint) -> 'lines' -> 0 ->> 'label',
  'Seat fare, Chevron Roundabout to CMS',
  'fare line names both stops'
);
select is(
  (public.quote_fare(:'l1', 3::smallint, 10::smallint) -> 'adjustment_kobo'),
  'null'::jsonb,
  'adjustment line exists and is empty in v1'
);
select is(
  (public.quote_fare(:'l3', 0::smallint, 3::smallint) ->> 'total_kobo')::bigint,
  180000::bigint,
  'Lekki Phase 1 to CMS Express totals ₦1,800 (design 07)'
);
select throws_ok(
  format('select public.quote_fare(%L, 5::smallint, 2::smallint)', :'l1'),
  '22023', null,
  'cannot quote backwards along a route'
);

-- Search and nearby -----------------------------------------------------------------------
select is((select name from public.search_places('chevron') limit 1), 'Chevron Roundabout', '"chevron" finds Chevron Roundabout first');
select is((select name from public.search_places('vgc') limit 1), 'Ikota', '"VGC" finds Ikota through an alias');
select is((select name from public.search_places('toll') limit 1), 'Lekki Toll Gate', '"toll" finds the toll gate');
select is((select count(*)::int from public.search_places('c')), 0, 'one letter returns nothing');
select is(
  (select name from public.nearby_stops(6.4420, 3.5330) limit 1),
  'Chevron Roundabout',
  'nearest stop to a point by Chevron is Chevron Roundabout'
);
select ok(
  (select walk_min between 1 and 3 from public.nearby_stops(6.4420, 3.5330) limit 1),
  'walk time to a stop about 100 m away is 1 to 3 minutes'
);

-- Departures ------------------------------------------------------------------------------
select ok((select count(*) > 0 from public.departures), 'seed generated departures');
select is(
  public.generate_departures((now() at time zone 'Africa/Lagos')::date, (now() at time zone 'Africa/Lagos')::date + 14),
  0,
  'generating the same range again creates nothing (idempotent)'
);

-- RLS -------------------------------------------------------------------------------------
select tests.authenticate_anon();
select ok((select count(*) from public.stops) = 16, 'anon reads stops (map before sign-in)');
select throws_ok('select count(*) from public.departures', '42501', null, 'anon cannot read departures');
select tests.clear_authentication();

select tests.authenticate_as(:'pax');
select throws_ok(
  $$insert into public.stops (code, name, location) values ('fake', 'Fake', 'SRID=4326;POINT(3.4 6.4)')$$,
  '42501', null,
  'passenger cannot add stops'
);
select throws_ok(
  'select public.generate_departures(current_date, current_date + 1)',
  '42501', 'ops only',
  'passenger cannot generate departures'
);
select tests.clear_authentication();

select tests.authenticate_as(:'ops');
select lives_ok(
  $$insert into public.stops (code, name, location) values ('ops-test', 'Ops Test', 'SRID=4326;POINT(3.40 6.43)')$$,
  'ops can add stops'
);
select tests.clear_authentication();

select * from finish();
rollback;
