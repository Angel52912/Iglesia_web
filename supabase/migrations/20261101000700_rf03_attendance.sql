-- RF-03: asistencia por evento. Una fila por (evento, miembro) con presente/ausente.
-- Lectura: admin, pastor, secretario. Escritura: admin, secretario.
-- Las políticas del coordinador (registrar asistencia) van en la migración coordinator_policies.
-- Las filas no se eliminan desde la app: corregir = cambiar present. Sin GRANT de DELETE.

create table public.attendance_records (
  event_id uuid not null references public.events (id),
  member_id uuid not null references public.members (id),
  present boolean not null,
  recorded_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create index attendance_records_member_idx on public.attendance_records (member_id);

create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

alter table public.attendance_records enable row level security;

revoke all on public.attendance_records from anon, authenticated;
grant select, insert on public.attendance_records to authenticated;
-- El upsert de PostgREST incluye las llaves en el SET; RLS limita quién puede actualizar.
grant update (event_id, member_id, present) on public.attendance_records to authenticated;

create policy attendance_records_select on public.attendance_records
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));

create policy attendance_records_insert on public.attendance_records
  for insert to authenticated
  with check (public.has_role('admin', 'secretary'));

create policy attendance_records_update on public.attendance_records
  for update to authenticated
  using (public.has_role('admin', 'secretary'))
  with check (public.has_role('admin', 'secretary'));
