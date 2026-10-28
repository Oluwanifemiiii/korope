-- Launch corridor seed: Lekki to Victoria Island and Lagos Island.
-- Idempotent: safe to run again (upserts on natural keys). Run with `npm run db:seed`.
--
-- Coordinates: 'osm' stops are mapped OpenStreetMap bus stops or roads; 'estimate'
-- stops (Ajah, Jakande, Ikota, CMS) need a site survey before launch (see PLAN launch
-- checklist). is_lit / is_sheltered are working assumptions for the same survey.
-- Vehicles, plates and drivers are placeholders for the simulator, not real people.

-- ---------------------------------------------------------------------------
-- Stops, east to west along Lekki-Epe Expressway, then VI and Lagos Island
-- ---------------------------------------------------------------------------
insert into public.stops (code, name, landmark, location, is_lit, is_sheltered, coords_source) values
  ('abraham-adesanya', 'Abraham Adesanya',      'Inbound side of the expressway, by the pedestrian bridge',          'SRID=4326;POINT(3.584282 6.469561)', true,  true,  'osm'),
  ('ajah',             'Ajah',                  'Under the Ajah flyover, inbound lay-by',                             'SRID=4326;POINT(3.573100 6.467900)', true,  false, 'estimate'),
  ('ikota',            'Ikota',                 'Opposite Ikota Shopping Complex, by VGC gate',                       'SRID=4326;POINT(3.554800 6.463300)', true,  false, 'estimate'),
  ('chevron',          'Chevron Roundabout',    'Beside Access Bank, facing the expressway',                          'SRID=4326;POINT(3.532017 6.441715)', true,  true,  'osm'),
  ('jakande',          'Jakande',               'Jakande first gate, inbound side near Osapa London',                 'SRID=4326;POINT(3.509500 6.444000)', true,  false, 'estimate'),
  ('ikate',            'Ikate',                 'Ikate bus stop, Lekki-Epe Expressway',                                'SRID=4326;POINT(3.481146 6.432643)', true,  true,  'osm'),
  ('lekki-phase-1',    'Lekki Phase 1 Gate',    'Expressway lay-by at the Phase 1 gate',                               'SRID=4326;POINT(3.451890 6.437650)', true,  true,  'osm'),
  ('admiralty-way',    'Admiralty Way',         'Admiralty Way, near the Phase 1 roundabout',                          'SRID=4326;POINT(3.454312 6.443052)', true,  false, 'osm'),
  ('lekki-toll-gate',  'Lekki Toll Gate',       'Admiralty Toll Plaza, city side after the booths',                    'SRID=4326;POINT(3.447211 6.435933)', true,  false, 'osm'),
  ('falomo',           'Falomo',                'Falomo bus stop, Awolowo Road under the bridge',                      'SRID=4326;POINT(3.426035 6.444413)', true,  true,  'osm'),
  ('oniru',            'Oniru',                 'Ozumba Mbadiwe Avenue, by the Oniru market turn',                     'SRID=4326;POINT(3.418226 6.436387)', true,  true,  'osm'),
  ('adeola-odeku',     'Adeola Odeku',          'Adeola Odeku Street, near the Ahmadu Bello junction',                 'SRID=4326;POINT(3.416430 6.430527)', true,  false, 'osm'),
  ('ahmadu-bello-way', 'Ahmadu Bello Way',      'Ahmadu Bello Way, Victoria Island, opposite the bank towers',         'SRID=4326;POINT(3.411409 6.422548)', true,  false, 'osm'),
  ('bonny-camp',       'Bonny Camp',            'Bonny Camp bus stop, Ozumba Mbadiwe Avenue',                          'SRID=4326;POINT(3.408765 6.437665)', true,  true,  'osm'),
  ('cms',              'CMS',                   'CMS bus stop, Marina, by the Broad Street junction',                  'SRID=4326;POINT(3.390500 6.451500)', true,  true,  'estimate'),
  ('marina',           'Marina',                'Marina Road, near Tinubu Square',                                     'SRID=4326;POINT(3.381451 6.454831)', true,  false, 'osm')
on conflict (code) do update set
  name = excluded.name, landmark = excluded.landmark, location = excluded.location,
  is_lit = excluded.is_lit, is_sheltered = excluded.is_sheltered, coords_source = excluded.coords_source,
  updated_at = now();

-- Local names ("Chevron" finds Chevron Roundabout, "VGC" finds Ikota, ...)
delete from public.place_aliases where stop_id in (select id from public.stops);
insert into public.place_aliases (alias, stop_id, weight)
select a.alias, s.id, a.weight from (values
  ('Chevron', 'chevron', 3), ('Chevron bus stop', 'chevron', 2), ('Igbo Efon', 'chevron', 1),
  ('Abraham Adesanya roundabout', 'abraham-adesanya', 2),
  ('Ajah under bridge', 'ajah', 2), ('Ajah roundabout', 'ajah', 2),
  ('VGC', 'ikota', 2), ('Ikota shopping complex', 'ikota', 2),
  ('Jakande first gate', 'jakande', 2), ('Osapa London', 'jakande', 1),
  ('Phase 1', 'lekki-phase-1', 3), ('Lekki Phase One', 'lekki-phase-1', 2), ('Phase one gate', 'lekki-phase-1', 2),
  ('Admiralty', 'admiralty-way', 2),
  ('Toll gate', 'lekki-toll-gate', 3), ('Lekki toll', 'lekki-toll-gate', 3), ('Admiralty toll plaza', 'lekki-toll-gate', 2),
  ('Falomo bridge', 'falomo', 2), ('Falomo roundabout', 'falomo', 2), ('Awolowo Road', 'falomo', 1),
  ('Oniru market', 'oniru', 2),
  ('Eko Hotel', 'ahmadu-bello-way', 1), ('VI', 'ahmadu-bello-way', 1), ('Victoria Island', 'ahmadu-bello-way', 1),
  ('CMS bus stop', 'cms', 3), ('Church Missionary Society', 'cms', 1), ('Broad Street', 'cms', 1),
  ('Tinubu Square', 'marina', 2), ('Lagos Island', 'marina', 1)
) as a(alias, code, weight)
join public.stops s on s.code = a.code;

-- ---------------------------------------------------------------------------
-- Routes and stop order
-- ---------------------------------------------------------------------------
insert into public.routes (code, name, service) values
  ('L1',  'Abraham Adesanya to Marina',    'all_stops'),
  ('L1R', 'Marina to Abraham Adesanya',    'all_stops'),
  ('L2',  'Chevron to Ahmadu Bello Way',   'all_stops'),
  ('L2R', 'Ahmadu Bello Way to Chevron',   'all_stops'),
  ('L3',  'Lekki Phase 1 to CMS Express',  'express'),
  ('L3R', 'CMS to Lekki Phase 1 Express',  'express')
on conflict (code) do update set name = excluded.name, service = excluded.service, updated_at = now();

delete from public.route_stops where route_id in (select id from public.routes where code in ('L1', 'L1R', 'L2', 'L2R', 'L3', 'L3R'));

with plan(route, stops) as (values
  ('L1',  array['abraham-adesanya', 'ajah', 'ikota', 'chevron', 'jakande', 'ikate', 'lekki-phase-1', 'lekki-toll-gate', 'oniru', 'bonny-camp', 'cms', 'marina']),
  ('L2',  array['chevron', 'jakande', 'ikate', 'lekki-phase-1', 'admiralty-way', 'lekki-toll-gate', 'adeola-odeku', 'ahmadu-bello-way']),
  ('L3',  array['lekki-phase-1', 'admiralty-way', 'falomo', 'cms'])
), both_ways as (
  select route, stops from plan
  union all
  select route || 'R', array(select s from unnest(stops) with ordinality u(s, i) order by i desc) from plan
)
insert into public.route_stops (route_id, seq, stop_id, dwell_s)
select r.id, (u.i - 1)::smallint, s.id,
       case when u.s in ('chevron', 'lekki-toll-gate', 'cms', 'lekki-phase-1') then 75 else 45 end
from both_ways b
join public.routes r on r.code = b.route
cross join lateral unnest(b.stops) with ordinality u(s, i)
join public.stops s on s.code = u.s;

-- Straight-line paths and distances until the Routes API snaps them to roads.
select private.rebuild_route_path(id) from public.routes where code in ('L1', 'L1R', 'L2', 'L2R', 'L3', 'L3R');

-- Baseline schedule: 5.5 m/s (about 20 km/h, Lekki peak) plus dwell at each earlier stop.
update public.route_stops rs set baseline_offset_s = x.offset_s
from (
  select route_id, seq,
         (distance_m / 5.5 + coalesce(sum(dwell_s) over (partition by route_id order by seq rows between unbounded preceding and 1 preceding), 0))::int as offset_s
  from public.route_stops
) x
where rs.route_id = x.route_id and rs.seq = x.seq;

-- ---------------------------------------------------------------------------
-- Fares: Chevron to CMS on L1 is 7 segments: 500 + 7 x 130 = 1,410, rounds to ₦1,400,
-- plus ₦100 service fee = ₦1,500 (matches design screen 10a).
-- ---------------------------------------------------------------------------
insert into public.fare_rules (route_id, base_kobo, per_segment_kobo, service_fee_kobo)
select id, 50000, 13000, 10000 from public.routes where code in ('L1', 'L1R', 'L2', 'L2R')
on conflict (route_id) do update set base_kobo = excluded.base_kobo, per_segment_kobo = excluded.per_segment_kobo,
  service_fee_kobo = excluded.service_fee_kobo, updated_at = now();

-- Express: fewer stops, priced by journey (screen 07 shows ₦1,800 total from Lekki Phase 1).
insert into public.fare_rules (route_id, base_kobo, per_segment_kobo, service_fee_kobo)
select id, 80000, 30000, 10000 from public.routes where code in ('L3', 'L3R')
on conflict (route_id) do update set base_kobo = excluded.base_kobo, per_segment_kobo = excluded.per_segment_kobo,
  service_fee_kobo = excluded.service_fee_kobo, updated_at = now();

-- ---------------------------------------------------------------------------
-- Seat layouts (C04): A window, B middle, C aisle by the door; aisle between B and C.
-- ---------------------------------------------------------------------------
insert into public.seat_layouts (code, name, rows, cols) values
  ('hiace-14', '14-seat minibus', 5, 4),
  ('coaster-16', '16-seat minibus', 6, 4),
  ('coaster-18', '18-seat minibus', 6, 4)
on conflict (code) do update set name = excluded.name, rows = excluded.rows, cols = excluded.cols;

delete from public.layout_seats where layout_id in (select id from public.seat_layouts where code in ('hiace-14', 'coaster-16', 'coaster-18'));

insert into public.layout_seats (layout_id, label, row, col, attrs)
select l.id, x.label, x.row, x.col, x.attrs
from public.seat_layouts l
cross join lateral (
  -- Front row beside the driver: 1A (door side), 1B (window)
  select '1A' as label, 1::smallint as row, 1::smallint as col, array['front', 'near_exit'] as attrs
  union all select '1B', 1, 2, array['front', 'window']
  -- Main rows
  union all
  select r || c, r::smallint, (case c when 'A' then 1 when 'B' then 2 else 4 end)::smallint,
         case c when 'A' then array['window'] when 'B' then array['middle'] else array['aisle', 'near_exit'] end
  from generate_series(2, case l.code when 'hiace-14' then 5 else 5 end) r, unnest(array['A', 'B', 'C']) c
  -- Back row on the larger buses
  union all
  select '6' || c, 6, (case c when 'A' then 1 when 'B' then 2 when 'C' then 3 else 4 end)::smallint,
         case when c in ('A', 'D') then array['window', 'rear'] else array['rear'] end
  from unnest(case l.code when 'coaster-16' then array['A', 'D'] when 'coaster-18' then array['A', 'B', 'C', 'D'] else array[]::text[] end) c
) x
where l.code in ('hiace-14', 'coaster-16', 'coaster-18');

-- Accessible and priority seat: 1A on every layout (step-free from the door).
update public.layout_seats set attrs = attrs || array['priority', 'accessible']
where label = '1A' and layout_id in (select id from public.seat_layouts where code in ('hiace-14', 'coaster-16', 'coaster-18'));

-- ---------------------------------------------------------------------------
-- Simulated fleet and placeholder drivers
-- ---------------------------------------------------------------------------
insert into public.vehicles (fleet_no, plate, make_model, livery, layout_id, simulated)
select v.fleet_no, v.plate, v.make_model, 'White body, emerald skirt', l.id, true
from (values
  ('KR 011', 'SIM-011-KR', 'Toyota Hiace',   'hiace-14'),
  ('KR 012', 'SIM-012-KR', 'Toyota Hiace',   'hiace-14'),
  ('KR 013', 'SIM-013-KR', 'Toyota Coaster', 'coaster-16'),
  ('KR 014', 'SIM-014-KR', 'Toyota Coaster', 'coaster-18'),
  ('KR 015', 'SIM-015-KR', 'Toyota Hiace',   'hiace-14')
) v(fleet_no, plate, make_model, layout)
join public.seat_layouts l on l.code = v.layout
on conflict (fleet_no) do update set plate = excluded.plate, make_model = excluded.make_model, layout_id = excluded.layout_id;

-- Placeholder driver phones. Nothing is ever sent to them unless someone signs in with
-- one of these numbers on a build that sends real SMS. Replace with real drivers in ops.
insert into public.drivers (phone, full_name, languages) values
  ('2348030009011', 'Simulated Driver 11', '{English,Yoruba}'),
  ('2348030009012', 'Simulated Driver 12', '{English,Pidgin}'),
  ('2348030009013', 'Simulated Driver 13', '{English,Igbo}'),
  ('2348030009014', 'Simulated Driver 14', '{English,Yoruba}'),
  ('2348030009015', 'Simulated Driver 15', '{English,Hausa}')
on conflict (phone) do update set full_name = excluded.full_name, languages = excluded.languages;

-- ---------------------------------------------------------------------------
-- Weekday peak timetable (Mon to Fri). Each bus runs a block that fits its journey time.
-- ---------------------------------------------------------------------------
delete from public.timetables where route_id in (select id from public.routes where code in ('L1', 'L1R', 'L2', 'L2R', 'L3', 'L3R'));

insert into public.timetables (route_id, days, depart_local, vehicle_id, driver_id)
select r.id, array[1, 2, 3, 4, 5]::smallint[], t.at::time, v.id, d.id
from (values
  ('L1',  '06:00', 'KR 011'), ('L1',  '08:00', 'KR 011'), ('L1R', '17:00', 'KR 011'), ('L1R', '19:00', 'KR 011'),
  ('L1',  '06:30', 'KR 012'), ('L1',  '08:30', 'KR 012'), ('L1R', '17:30', 'KR 012'), ('L1R', '19:30', 'KR 012'),
  ('L2',  '06:15', 'KR 013'), ('L2',  '07:30', 'KR 013'), ('L2',  '08:45', 'KR 013'),
  ('L2R', '16:30', 'KR 013'), ('L2R', '17:45', 'KR 013'), ('L2R', '19:00', 'KR 013'),
  ('L2',  '06:45', 'KR 014'), ('L2',  '08:00', 'KR 014'), ('L2',  '09:15', 'KR 014'),
  ('L2R', '17:00', 'KR 014'), ('L2R', '18:15', 'KR 014'), ('L2R', '19:30', 'KR 014'),
  ('L3',  '07:00', 'KR 015'), ('L3',  '08:00', 'KR 015'), ('L3',  '09:00', 'KR 015'),
  ('L3R', '17:00', 'KR 015'), ('L3R', '18:00', 'KR 015'), ('L3R', '19:00', 'KR 015')
) t(route, at, fleet_no)
join public.routes r on r.code = t.route
join public.vehicles v on v.fleet_no = t.fleet_no
join public.drivers d on d.phone = '23480300090' || right(t.fleet_no, 2);

-- Departures for today and the next 14 days (Lagos time). Nightly job extends this.
select public.generate_departures((now() at time zone 'Africa/Lagos')::date, (now() at time zone 'Africa/Lagos')::date + 14);
