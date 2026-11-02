-- RF-08: datos agregados del dashboard (solo conteos y totales, nunca filas de personas ni donantes).
-- security definer porque tesorero y coordinador no pueden leer las tablas (matriz de permisos);
-- el rol se valida dentro de la función:
--   * Datos generales: admin, pastor, secretario, coordinador (sin ingresos).
--   * Ingresos: admin, pastor y tesorero. El tesorero solo recibe ingresos.
create function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
begin
  if not public.has_role('admin', 'pastor', 'secretary', 'treasurer', 'coordinator') then
    raise exception 'No tienes permiso para ver el panel principal'
      using errcode = '42501';
  end if;

  if public.has_role('admin', 'pastor', 'secretary', 'coordinator') then
    v_result := v_result || jsonb_build_object(
      'activeMembers', (select count(*) from public.members m where m.active),
      'ministries', (select count(*) from public.ministries mi where mi.active),
      'attendance', jsonb_build_object(
        'present', (select count(*) from public.attendance_records a where a.present),
        'total', (select count(*) from public.attendance_records)
      ),
      'upcomingCount', (
        select count(*) from public.events e
        where e.status = 'scheduled' and e.event_date >= current_date
      ),
      'upcomingEvents', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', u.id, 'title', u.title, 'eventDate', u.event_date,
            'startTime', to_char(u.start_time, 'HH24:MI'), 'location', u.location
          ) order by u.event_date, u.start_time
        )
        from (
          select e.id, e.title, e.event_date, e.start_time, e.location
          from public.events e
          where e.status = 'scheduled' and e.event_date >= current_date
          order by e.event_date, e.start_time
          limit 5
        ) u
      ), '[]'::jsonb),
      'attendanceByEvent', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'eventId', r.id, 'title', r.title, 'eventDate', r.event_date,
            'present', r.present, 'absent', r.absent
          ) order by r.event_date, r.title
        )
        from (
          select e.id, e.title, e.event_date,
                 count(*) filter (where a.present) as present,
                 count(*) filter (where not a.present) as absent
          from public.events e
          join public.attendance_records a on a.event_id = e.id
          group by e.id, e.title, e.event_date
          order by e.event_date desc
          limit 6
        ) r
      ), '[]'::jsonb)
    );
  end if;

  if public.has_role('admin', 'pastor', 'treasurer') then
    v_result := v_result || jsonb_build_object(
      'income', jsonb_build_object(
        'month', to_char(current_date, 'YYYY-MM'),
        'monthTotal', coalesce((
          select sum(d.amount) from public.donations d
          where d.donated_on >= date_trunc('month', current_date)::date
            and d.donated_on < (date_trunc('month', current_date) + interval '1 month')::date
        ), 0),
        'monthDonations', (
          select count(*) from public.donations d
          where d.donated_on >= date_trunc('month', current_date)::date
            and d.donated_on < (date_trunc('month', current_date) + interval '1 month')::date
        ),
        'byMonth', (
          select jsonb_agg(
            jsonb_build_object('month', to_char(s.month_start, 'YYYY-MM'), 'total', coalesce(t.total, 0))
            order by s.month_start
          )
          from generate_series(
            (date_trunc('month', current_date) - interval '5 months')::date,
            date_trunc('month', current_date)::date,
            interval '1 month'
          ) as s(month_start)
          left join (
            select date_trunc('month', d.donated_on)::date as month_start, sum(d.amount) as total
            from public.donations d
            group by 1
          ) t on t.month_start = s.month_start::date
        )
      )
    );
  end if;

  return v_result;
end
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
