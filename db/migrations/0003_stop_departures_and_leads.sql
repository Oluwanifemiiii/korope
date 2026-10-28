-- Public timetable for one stop (screen 08) and Korope+ interest leads (screen 20).

/** Upcoming boardable departures from a stop, with the time the bus reaches it. Public. */
create function public.stop_departures(p_stop uuid, p_limit integer default 6)
returns table (departure_id uuid, route_code text, route_name text, service public.route_service, at timestamptz, to_name text, status public.departure_status)
language sql stable security definer set search_path = '' as $$
  select d.id, r.code, r.name, r.service, dst.scheduled_at + make_interval(secs => d.delay_s),
         (select s2.name from public.route_stops rs2 join public.stops s2 on s2.id = rs2.stop_id
          where rs2.route_id = r.id order by rs2.seq desc limit 1),
         d.status
  from public.route_stops rs
  join public.routes r on r.id = rs.route_id and r.active
  join public.departures d on d.route_id = r.id and d.status in ('scheduled', 'boarding', 'in_progress', 'cancelled')
  join public.departure_stop_times dst on dst.departure_id = d.id and dst.seq = rs.seq
  where rs.stop_id = p_stop
    and dst.scheduled_at > now() - interval '5 minutes'
    and dst.scheduled_at < now() + interval '36 hours'
    and rs.seq < (select max(seq) from public.route_stops x where x.route_id = r.id)
  order by dst.scheduled_at
  limit least(p_limit, 20)
$$;
grant execute on function public.stop_departures(uuid, integer) to anon, authenticated;

-- Korope+ "coming soon" interest form. Insert-only for the public; ops read.
create table public.korope_plus_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.auth_user (id) on delete set null,
  organisation text not null check (length(organisation) between 2 and 120),
  riders text not null check (length(riders) between 1 and 40),
  contact text not null check (length(contact) between 5 and 120),
  created_at timestamptz not null default now()
);
alter table public.korope_plus_leads enable row level security;

create policy leads_insert on public.korope_plus_leads for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy leads_ops_read on public.korope_plus_leads for select to authenticated using ((select private.is_ops()));
grant insert on public.korope_plus_leads to anon, authenticated;
grant select on public.korope_plus_leads to authenticated;
