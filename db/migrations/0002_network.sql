-- M1 network: stops, aliases, routes and stop order, fares, seat layouts, vehicles,
-- timetables, departures and live vehicle state. See docs/ARCHITECTURE.md section 3.

-- ---------------------------------------------------------------------------
-- Stops and how Lagos people name them
-- ---------------------------------------------------------------------------
create table public.stops (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]+$'),
  name text not null,
  landmark text,
  location public.geography(point, 4326) not null,
  is_lit boolean not null default false,
  is_sheltered boolean not null default false,
  accessibility_note text,
  photo_path text,
  -- 'osm' = taken from a mapped OpenStreetMap stop; 'estimate' = needs a site survey before launch.
  coords_source text not null default 'estimate' check (coords_source in ('osm', 'estimate', 'surveyed')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stops_location_idx on public.stops using gist (location);
create index stops_name_trgm_idx on public.stops using gin (lower(name) public.gin_trgm_ops);

create table public.place_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  alias_norm text generated always as (lower(regexp_replace(alias, '\s+', ' ', 'g'))) stored,
  stop_id uuid references public.stops (id) on delete cascade,
  google_place_id text,
  location public.geography(point, 4326),
  weight smallint not null default 1,
  check (stop_id is not null or location is not null)
);
create index place_aliases_trgm_idx on public.place_aliases using gin (alias_norm public.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Routes and their ordered stops
-- ---------------------------------------------------------------------------
create type public.route_service as enum ('all_stops', 'express');

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.default_org() references public.organizations (id),
  code text not null unique,
  name text not null,
  service public.route_service not null default 'all_stops',
  -- Straight lines between stops until ops saves the route with the Routes API.
  path public.geography(linestring, 4326),
  path_source text not null default 'stops' check (path_source in ('stops', 'routes_api')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_stops (
  route_id uuid not null references public.routes (id) on delete cascade,
  seq smallint not null check (seq >= 0),
  stop_id uuid not null references public.stops (id),
  -- Distance along the path from the first stop, and the scheduled time from departure.
  distance_m integer not null default 0,
  baseline_offset_s integer not null default 0,
  dwell_s smallint not null default 45,
  primary key (route_id, seq),
  unique (route_id, stop_id)
);

/** Rebuilds a route's path from its stops and recomputes distances (straight lines). */
create function private.rebuild_route_path(p_route uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.routes r set
    path = (
      select public.st_makeline(s.location::public.geometry order by rs.seq)::public.geography
      from public.route_stops rs join public.stops s on s.id = rs.stop_id
      where rs.route_id = p_route
    ),
    path_source = 'stops',
    updated_at = now()
  where r.id = p_route;

  update public.route_stops rs set distance_m = d.dist
  from (
    select x.seq, (sum(x.leg) over (order by x.seq))::int as dist
    from (
      select rs2.seq, coalesce(public.st_distance(s2.location, lag(s2.location) over (order by rs2.seq)), 0) as leg
      from public.route_stops rs2 join public.stops s2 on s2.id = rs2.stop_id
      where rs2.route_id = p_route
    ) x
  ) d
  where rs.route_id = p_route and rs.seq = d.seq;
end $$;

-- ---------------------------------------------------------------------------
-- Fares: base plus per segment, or a stop-to-stop matrix that overrides it.
-- ---------------------------------------------------------------------------
create table public.fare_rules (
  route_id uuid primary key references public.routes (id) on delete cascade,
  base_kobo bigint not null check (base_kobo >= 0),
  per_segment_kobo bigint not null check (per_segment_kobo >= 0),
  service_fee_kobo bigint not null default 10000 check (service_fee_kobo >= 0),
  -- Seat fares round to this step so they read cleanly (₦50 by default).
  rounding_kobo bigint not null default 5000 check (rounding_kobo > 0),
  updated_at timestamptz not null default now()
);

create table public.fare_matrix (
  route_id uuid not null references public.routes (id) on delete cascade,
  from_seq smallint not null,
  to_seq smallint not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  primary key (route_id, from_seq, to_seq),
  check (to_seq > from_seq)
);

/**
 * Fare breakdown for one seat from board_seq to alight_seq on a route.
 * Returns {lines:[{code,label,amount_kobo}], adjustment_kobo:null, total_kobo}.
 */
create function public.quote_fare(p_route uuid, p_board smallint, p_alight smallint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.fare_rules;
  seat bigint;
  board_name text;
  alight_name text;
begin
  if p_alight <= p_board then raise exception 'alight stop must come after boarding stop' using errcode = '22023'; end if;
  select * into r from public.fare_rules where route_id = p_route;
  if not found then raise exception 'no fare set for route' using errcode = 'P0002'; end if;

  select amount_kobo into seat from public.fare_matrix
  where route_id = p_route and from_seq = p_board and to_seq = p_alight;
  if seat is null then
    seat := r.base_kobo + r.per_segment_kobo * (p_alight - p_board);
    seat := round(seat::numeric / r.rounding_kobo) * r.rounding_kobo;
  end if;

  select s.name into board_name from public.route_stops rs join public.stops s on s.id = rs.stop_id
  where rs.route_id = p_route and rs.seq = p_board;
  select s.name into alight_name from public.route_stops rs join public.stops s on s.id = rs.stop_id
  where rs.route_id = p_route and rs.seq = p_alight;
  if board_name is null or alight_name is null then raise exception 'stop not on route' using errcode = '22023'; end if;

  return jsonb_build_object(
    'lines', jsonb_build_array(
      jsonb_build_object('code', 'seat_fare', 'label', 'Seat fare, ' || board_name || ' to ' || alight_name, 'amount_kobo', seat),
      jsonb_build_object('code', 'service_fee', 'label', 'Service fee', 'amount_kobo', r.service_fee_kobo)
    ),
    'adjustment_kobo', null,
    'total_kobo', seat + r.service_fee_kobo
  );
end $$;

-- ---------------------------------------------------------------------------
-- Seat layouts and vehicles
-- ---------------------------------------------------------------------------
create table public.seat_layouts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  rows smallint not null,
  cols smallint not null
);

create table public.layout_seats (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.seat_layouts (id) on delete cascade,
  label text not null,
  row smallint not null,
  col smallint not null,
  attrs text[] not null default '{}',
  unique (layout_id, label),
  unique (layout_id, row, col)
);

create type public.vehicle_status as enum ('active', 'maintenance', 'retired');

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.default_org() references public.organizations (id),
  fleet_no text not null unique,
  plate text not null unique,
  make_model text not null,
  livery text,
  layout_id uuid not null references public.seat_layouts (id),
  simulated boolean not null default true,
  status public.vehicle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_blocked_seats (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  seat_id uuid not null references public.layout_seats (id) on delete cascade,
  reason text not null default 'Out of use',
  primary key (vehicle_id, seat_id)
);

-- ---------------------------------------------------------------------------
-- Timetables and departures
-- ---------------------------------------------------------------------------
create table public.timetables (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  days smallint[] not null check (days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  depart_local time not null,
  vehicle_id uuid references public.vehicles (id),
  driver_id uuid references public.drivers (id),
  valid_from date not null default current_date,
  valid_to date,
  active boolean not null default true,
  unique (route_id, depart_local, days)
);

create type public.departure_status as enum ('scheduled', 'boarding', 'in_progress', 'completed', 'cancelled');

create table public.departures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.default_org() references public.organizations (id),
  route_id uuid not null references public.routes (id),
  timetable_id uuid references public.timetables (id) on delete set null,
  service_date date not null,
  scheduled_at timestamptz not null,
  vehicle_id uuid references public.vehicles (id),
  driver_id uuid references public.drivers (id),
  status public.departure_status not null default 'scheduled',
  current_seq smallint,
  delay_s integer not null default 0,
  delay_reason text,
  sim_offset_s integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (timetable_id, service_date)
);
create index departures_route_time_idx on public.departures (route_id, scheduled_at);
create index departures_time_idx on public.departures (scheduled_at) where status in ('scheduled', 'boarding', 'in_progress');

create table public.departure_stop_times (
  departure_id uuid not null references public.departures (id) on delete cascade,
  seq smallint not null,
  scheduled_at timestamptz not null,
  estimated_at timestamptz,
  eta_confidence text check (eta_confidence in ('high', 'moderate', 'low')),
  arrived_at timestamptz,
  departed_at timestamptz,
  primary key (departure_id, seq)
);

/**
 * Creates departures (and their stop times) from active timetables for a date range,
 * in Africa/Lagos time. Idempotent: existing (timetable, date) pairs are skipped.
 */
create function public.generate_departures(p_from date, p_to date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  -- Security definer: current_user is the owner here, so judge the caller by the request
  -- identity. App requests carry claims (asUser/asAnon); cron and migrations do not.
  if coalesce(auth.jwt() ->> 'role', '') in ('authenticated', 'anon') and not private.is_ops() then
    raise exception 'ops only' using errcode = '42501';
  end if;

  with days as (
    select d::date as service_date from generate_series(p_from, p_to, interval '1 day') d
  ), created as (
    insert into public.departures (route_id, timetable_id, service_date, scheduled_at, vehicle_id, driver_id)
    select t.route_id, t.id, days.service_date,
           (days.service_date + t.depart_local) at time zone 'Africa/Lagos',
           t.vehicle_id, t.driver_id
    from public.timetables t
    join days on extract(isodow from days.service_date)::smallint = any (t.days)
    join public.routes r on r.id = t.route_id and r.active
    where t.active
      and days.service_date >= t.valid_from
      and (t.valid_to is null or days.service_date <= t.valid_to)
    on conflict (timetable_id, service_date) do nothing
    returning id, route_id, scheduled_at
  ), stop_times as (
    insert into public.departure_stop_times (departure_id, seq, scheduled_at)
    select c.id, rs.seq, c.scheduled_at + make_interval(secs => rs.baseline_offset_s)
    from created c join public.route_stops rs on rs.route_id = c.route_id
    returning 1
  )
  select count(*) into v_count from created;
  return v_count;
end $$;
grant execute on function public.generate_departures(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Live vehicle state (written by ingestion in M1/M4)
-- ---------------------------------------------------------------------------
create table public.vehicle_live (
  vehicle_id uuid primary key references public.vehicles (id) on delete cascade,
  departure_id uuid references public.departures (id) on delete set null,
  location public.geography(point, 4326) not null,
  heading smallint,
  speed_mps real,
  progress_m integer,
  recorded_at timestamptz not null,
  simulated boolean not null
);

create table public.vehicle_positions (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  departure_id uuid references public.departures (id) on delete set null,
  recorded_at timestamptz not null,
  location public.geography(point, 4326) not null,
  speed_mps real,
  heading smallint,
  accuracy_m real,
  source text not null check (source in ('device', 'simulator'))
);
create index vehicle_positions_vehicle_time_idx on public.vehicle_positions (vehicle_id, recorded_at desc);

create table public.simulator_state (
  id boolean primary key default true check (id),
  running boolean not null default false,
  speed_multiplier numeric(4, 1) not null default 1 check (speed_multiplier between 0.5 and 20),
  updated_by uuid references public.auth_user (id),
  updated_at timestamptz not null default now()
);
insert into public.simulator_state default values;

-- ---------------------------------------------------------------------------
-- Search and nearby (used by Home and Search)
-- ---------------------------------------------------------------------------

/** Korope stops and local aliases matching what the passenger typed, best first. */
create function public.search_places(p_query text, p_near_lat double precision default null, p_near_lng double precision default null, p_limit integer default 8)
returns table (stop_id uuid, name text, landmark text, lat double precision, lng double precision, matched text, score real, distance_m integer)
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(p_query)) as q,
                    case when p_near_lat is not null then public.st_setsrid(public.st_makepoint(p_near_lng, p_near_lat), 4326)::public.geography end as near),
  hits as (
    select s.id, s.name, s.landmark, s.location, s.name as matched,
           greatest(public.similarity(lower(s.name), q.q), case when lower(s.name) like q.q || '%' then 1 else 0 end) as score
    from public.stops s, q where s.active and (lower(s.name) operator(public.%) q.q or lower(s.name) like '%' || q.q || '%')
    union all
    select s.id, s.name, s.landmark, s.location, a.alias,
           greatest(public.similarity(a.alias_norm, q.q), case when a.alias_norm like q.q || '%' then 1 else 0 end) * (1 + a.weight * 0.1)
    from public.place_aliases a join public.stops s on s.id = a.stop_id, q
    where s.active and (a.alias_norm operator(public.%) q.q or a.alias_norm like '%' || q.q || '%')
  ), best as (
    select distinct on (id) * from hits order by id, score desc
  )
  select b.id, b.name, b.landmark,
         public.st_y(b.location::public.geometry), public.st_x(b.location::public.geometry),
         b.matched, b.score::real,
         case when q.near is not null then public.st_distance(b.location, q.near)::int end
  from best b, q
  where length(q.q) >= 2
  order by b.score desc, public.st_distance(b.location, coalesce(q.near, b.location))
  limit least(p_limit, 20)
$$;

/** Stops within a radius, with the next departure from each (Home 05a/05b). */
create function public.nearby_stops(p_lat double precision, p_lng double precision, p_radius_m integer default 1500, p_limit integer default 5)
returns table (stop_id uuid, name text, landmark text, lat double precision, lng double precision, distance_m integer, walk_min integer,
               next_departure_id uuid, next_route_name text, next_at timestamptz, next_to text)
language sql stable security definer set search_path = '' as $$
  with me as (select public.st_setsrid(public.st_makepoint(p_lng, p_lat), 4326)::public.geography as g)
  select s.id, s.name, s.landmark,
         public.st_y(s.location::public.geometry), public.st_x(s.location::public.geometry),
         public.st_distance(s.location, me.g)::int,
         -- 75 m a minute, rounded up: a careful walk on Lagos pavements.
         ceil(public.st_distance(s.location, me.g) / 75)::int,
         nd.id, nd.route_name, nd.at, nd.to_name
  from public.stops s cross join me
  left join lateral (
    select d.id, r.name as route_name, dst.scheduled_at as at,
           (select s2.name from public.route_stops rs2 join public.stops s2 on s2.id = rs2.stop_id
            where rs2.route_id = r.id order by rs2.seq desc limit 1) as to_name
    from public.route_stops rs
    join public.routes r on r.id = rs.route_id and r.active
    join public.departures d on d.route_id = r.id and d.status in ('scheduled', 'boarding', 'in_progress')
    join public.departure_stop_times dst on dst.departure_id = d.id and dst.seq = rs.seq
    where rs.stop_id = s.id
      and dst.scheduled_at > now()
      -- Not the last stop of the route: you can't board where the bus ends.
      and rs.seq < (select max(seq) from public.route_stops x where x.route_id = r.id)
    order by dst.scheduled_at
    limit 1
  ) nd on true
  where s.active and public.st_dwithin(s.location, me.g, least(p_radius_m, 5000))
  order by public.st_distance(s.location, me.g)
  limit least(p_limit, 20)
$$;

grant execute on function public.search_places(text, double precision, double precision, integer) to anon, authenticated;
grant execute on function public.nearby_stops(double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.quote_fare(uuid, smallint, smallint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Audit for ops-editable network tables
-- ---------------------------------------------------------------------------
create trigger audit_stops after insert or update or delete on public.stops for each row execute function private.audit();
create trigger audit_routes after insert or update or delete on public.routes for each row execute function private.audit();
create trigger audit_fare_rules after insert or update or delete on public.fare_rules for each row execute function private.audit();
create trigger audit_vehicles after insert or update or delete on public.vehicles for each row execute function private.audit();
create trigger audit_timetables after insert or update or delete on public.timetables for each row execute function private.audit();

-- ---------------------------------------------------------------------------
-- Row Level Security (ARCHITECTURE section 6)
-- ---------------------------------------------------------------------------
alter table public.stops enable row level security;
alter table public.place_aliases enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.fare_rules enable row level security;
alter table public.fare_matrix enable row level security;
alter table public.seat_layouts enable row level security;
alter table public.layout_seats enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_blocked_seats enable row level security;
alter table public.timetables enable row level security;
alter table public.departures enable row level security;
alter table public.departure_stop_times enable row level security;
alter table public.vehicle_live enable row level security;
alter table public.vehicle_positions enable row level security;
alter table public.simulator_state enable row level security;

-- Public network data: anyone reads active rows; ops write.
create policy stops_read on public.stops for select to anon, authenticated using (active or (select private.is_ops()));
create policy aliases_read on public.place_aliases for select to anon, authenticated using (true);
create policy routes_read on public.routes for select to anon, authenticated using (active or (select private.is_ops()));
create policy route_stops_read on public.route_stops for select to anon, authenticated using (true);

-- Signed-in only: fares, layouts, vehicles (public fields), departures and stop times.
create policy fare_rules_read on public.fare_rules for select to authenticated using (true);
create policy fare_matrix_read on public.fare_matrix for select to authenticated using (true);
create policy seat_layouts_read on public.seat_layouts for select to authenticated using (true);
create policy layout_seats_read on public.layout_seats for select to authenticated using (true);
create policy vehicles_read on public.vehicles for select to authenticated using (status = 'active' or (select private.is_ops()));
create policy blocked_seats_read on public.vehicle_blocked_seats for select to authenticated using (true);
create policy departures_read on public.departures for select to authenticated using (true);
create policy stop_times_read on public.departure_stop_times for select to authenticated using (true);
create policy vehicle_live_read on public.vehicle_live for select to authenticated using (departure_id is not null or (select private.is_ops()));

-- Ops only.
create policy timetables_ops on public.timetables for all to authenticated using ((select private.is_ops())) with check ((select private.is_ops()));
create policy positions_ops_read on public.vehicle_positions for select to authenticated using ((select private.is_ops()));
create policy simulator_ops on public.simulator_state for all to authenticated using ((select private.is_ops())) with check ((select private.is_ops()));

do $$
declare t text;
begin
  foreach t in array array['stops', 'place_aliases', 'routes', 'route_stops', 'fare_rules', 'fare_matrix',
                           'seat_layouts', 'layout_seats', 'vehicles', 'vehicle_blocked_seats', 'departures', 'departure_stop_times']
  loop
    execute format('create policy %I on public.%I for all to authenticated using ((select private.is_ops())) with check ((select private.is_ops()))', t || '_ops_write', t);
  end loop;
end $$;

-- Grants (RLS filters rows; these say which operations exist at all).
grant select on public.stops, public.place_aliases, public.routes, public.route_stops to anon;
grant select, insert, update, delete on public.stops, public.place_aliases, public.routes, public.route_stops,
  public.fare_rules, public.fare_matrix, public.seat_layouts, public.layout_seats, public.vehicles,
  public.vehicle_blocked_seats, public.timetables, public.departures, public.departure_stop_times to authenticated;
grant select on public.vehicle_live, public.vehicle_positions to authenticated;
grant select, update on public.simulator_state to authenticated;
