-- The subset of pgTAP our tests use, for local runs without the extension.
-- Output matches pgTAP's TAP lines so the runner can read either.

create table if not exists public._tap (n int not null, planned int);
grant all on public._tap to public;

create or replace function public._tap_next() returns int language plpgsql as $$
declare v int;
begin
  update public._tap set n = n + 1 returning n into v;
  return v;
end $$;

create or replace function public.plan(p int) returns text language plpgsql as $$
begin
  delete from public._tap;
  insert into public._tap values (0, p);
  return '1..' || p;
end $$;

create or replace function public.ok(cond boolean, descr text default '') returns text language plpgsql as $$
declare v int := public._tap_next();
begin
  return case when coalesce(cond, false) then 'ok ' else 'not ok ' end || v || ' - ' || descr;
end $$;

create or replace function public.is(have anyelement, want anyelement, descr text default '') returns text language plpgsql as $$
declare v int := public._tap_next();
begin
  if have is not distinct from want then return 'ok ' || v || ' - ' || descr; end if;
  return 'not ok ' || v || ' - ' || descr || E'\n#   have: ' || coalesce(have::text, 'NULL') || E'\n#   want: ' || coalesce(want::text, 'NULL');
end $$;

create or replace function public.isnt(have anyelement, want anyelement, descr text default '') returns text language plpgsql as $$
declare v int := public._tap_next();
begin
  return case when have is distinct from want then 'ok ' else 'not ok ' end || v || ' - ' || descr;
end $$;

create or replace function public.lives_ok(sql text, descr text default '') returns text language plpgsql as $$
declare v int := public._tap_next();
begin
  begin
    execute sql;
  exception when others then
    return 'not ok ' || v || ' - ' || descr || E'\n#   died: ' || sqlstate || ' ' || sqlerrm;
  end;
  return 'ok ' || v || ' - ' || descr;
end $$;

create or replace function public.throws_ok(sql text, errcode text, errmsg text default null, descr text default '') returns text language plpgsql as $$
declare v int := public._tap_next();
begin
  begin
    execute sql;
  exception when others then
    if sqlstate = errcode and (errmsg is null or sqlerrm = errmsg) then
      return 'ok ' || v || ' - ' || descr;
    end if;
    return 'not ok ' || v || ' - ' || descr || E'\n#   caught: ' || sqlstate || ' ' || sqlerrm || E'\n#   wanted: ' || errcode || coalesce(' ' || errmsg, '');
  end;
  return 'not ok ' || v || ' - ' || descr || E'\n#   no exception thrown';
end $$;

create or replace function public.finish() returns setof text language plpgsql as $$
declare r record;
begin
  select * into r from public._tap;
  if r.n <> r.planned then
    return next '# Looks like you planned ' || r.planned || ' tests but ran ' || r.n;
  end if;
  return;
end $$;
