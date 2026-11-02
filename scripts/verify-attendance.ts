// Verifica RF-03 contra Supabase real con los repositorios reales y los usuarios sembrados.
// Uso: npm run db:verify-attendance   (lee server/.env; requiere SEED_PASSWORD_<ROL> de cada rol)
// Crea datos marcados con TAG y los borra al terminar (service_role, solo para la limpieza).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AttendanceService } from '../server/src/modules/attendance/attendance.service.js';
import { SupabaseAttendanceRepository } from '../server/src/modules/attendance/supabaseAttendance.repository.js';
import { SupabaseEventsRepository } from '../server/src/modules/events/supabaseEvents.repository.js';
import { SupabaseMembersRepository } from '../server/src/modules/members/supabaseMembers.repository.js';
import { ROLES, type AppRole } from '../server/src/types/auth.js';

const TAG = '[verif-rf03]';
const noSession = { persistSession: false, autoRefreshToken: false } as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return value;
}

const url = requireEnv('SUPABASE_URL');
const anonKey = requireEnv('SUPABASE_ANON_KEY');
const domain = (process.env.SEED_EMAIL_DOMAIN ?? 'iglesia.test').toLowerCase();
const service = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: noSession });

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures += 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${name}${ok || !detail ? '' : ` -> ${detail}`}`);
}

async function rejects(action: () => Promise<unknown>): Promise<string | null> {
  try {
    await action();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function clientFor(role: AppRole): Promise<SupabaseClient> {
  const password = requireEnv(`SEED_PASSWORD_${role.toUpperCase()}`);
  const client = createClient(url, anonKey, { auth: noSession });
  const { data, error } = await client.auth.signInWithPassword({
    email: `${role}@${domain}`,
    password,
  });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión como ${role}`);
  return createClient(url, anonKey, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

function serviceFor(db: SupabaseClient): AttendanceService {
  return new AttendanceService(new SupabaseAttendanceRepository(db));
}

async function cleanup(): Promise<void> {
  const events = await service.from('events').select('id').like('title', `${TAG}%`);
  const ids = (events.data ?? []).map((row: { id: string }) => row.id);
  if (ids.length > 0) {
    await service.from('attendance_records').delete().in('event_id', ids);
    await service.from('events').delete().in('id', ids);
  }
  await service.from('members').delete().like('full_name', `${TAG}%`);
}

async function main(): Promise<void> {
  await cleanup();
  const dbs = {} as Record<AppRole, SupabaseClient>;
  for (const role of ROLES) dbs[role] = await clientFor(role);

  // Datos de prueba creados con RLS como secretario.
  const events = new SupabaseEventsRepository(dbs.secretary);
  const members = new SupabaseMembersRepository(dbs.secretary);
  const ana = await members.create({ fullName: `${TAG} Ana`, phone: null, email: null });
  const luis = await members.create({ fullName: `${TAG} Luis`, phone: null, email: null });
  async function newEvent(eventDate: string, name: string): Promise<string> {
    const created = await events.create({
      title: `${TAG} ${name}`,
      description: null,
      eventDate,
      startTime: '10:00',
      location: null,
      type: 'religious',
      category: 'worship',
      ministryId: null,
      responsibleIds: [],
    });
    return created.id;
  }
  const marks = (anaPresent: boolean, luisPresent: boolean) => [
    { memberId: ana.id, present: anaPresent },
    { memberId: luis.id, present: luisPresent },
  ];

  // 1) Admin y secretario guardan y corrigen.
  const mainEvent = await newEvent('2026-11-15', 'principal');
  for (const role of ['admin', 'secretary'] as const) {
    const svc = serviceFor(dbs[role]);
    const saved = await svc.save(mainEvent, marks(true, false));
    check(
      `${role} guarda (Ana presente, Luis ausente)`,
      saved.records.length === 2 &&
        saved.records.find((r) => r.memberId === ana.id)?.present === true &&
        saved.records.find((r) => r.memberId === luis.id)?.present === false,
    );
    const fixed = await svc.save(mainEvent, marks(false, true));
    check(
      `${role} corrige (se invierte) sin duplicar filas`,
      fixed.records.length === 2 &&
        fixed.records.find((r) => r.memberId === ana.id)?.present === false &&
        fixed.records.find((r) => r.memberId === luis.id)?.present === true,
    );
  }
  await serviceFor(dbs.admin).save(mainEvent, marks(true, false));

  // 2) Pastor lee, pero no escribe (y la BD no cambia).
  const pastor = serviceFor(dbs.pastor);
  const pastorRead = await pastor.getForEvent(mainEvent);
  check('pastor lee la asistencia del evento', pastorRead.records.length === 2);
  const pastorHistory = await pastor.history({ eventId: mainEvent });
  check('pastor lee el historial', pastorHistory.length === 1 && pastorHistory[0]?.present === 1);
  const pastorEvent = await newEvent('2026-11-16', 'pastor');
  const pastorInsert = await rejects(() => pastor.save(pastorEvent, marks(true, true)));
  check('pastor no puede insertar asistencia', pastorInsert !== null);
  const pastorUpdate = await rejects(() => pastor.save(mainEvent, marks(false, false)));
  check('pastor no puede corregir asistencia', pastorUpdate !== null, 'no falló');
  const afterPastor = await service
    .from('attendance_records')
    .select('present')
    .eq('event_id', mainEvent)
    .eq('member_id', ana.id)
    .single();
  check(
    'la asistencia sigue intacta tras el intento del pastor',
    afterPastor.data?.present === true,
  );

  // 3) Tesorero y coordinador no leen asistencia.
  for (const role of ['treasurer', 'coordinator'] as const) {
    const direct = await dbs[role]
      .from('attendance_records')
      .select('event_id')
      .eq('event_id', mainEvent);
    check(
      `${role} no lee filas de attendance_records`,
      !direct.error && (direct.data ?? []).length === 0,
      direct.error?.message ?? `${String(direct.data?.length)} filas`,
    );
    const history = await serviceFor(dbs[role]).history({ eventId: mainEvent });
    check(`${role} recibe historial vacío`, history.length === 0);
    const write = await rejects(() => serviceFor(dbs[role]).save(mainEvent, marks(true, true)));
    check(`${role} no puede escribir`, write !== null, 'no falló');
  }

  // 4) Evento cancelado => 409.
  const cancelled = await newEvent('2026-11-17', 'cancelado');
  await events.update(cancelled, { status: 'cancelled' });
  let status: number | null = null;
  try {
    await serviceFor(dbs.secretary).save(cancelled, marks(true, true));
  } catch (error) {
    status = (error as { status?: number }).status ?? null;
  }
  check('evento cancelado responde 409', status === 409, `status=${String(status)}`);
  const leaked = await service
    .from('attendance_records')
    .select('event_id')
    .eq('event_id', cancelled);
  check('no se guardó nada en el evento cancelado', (leaked.data ?? []).length === 0);

  // 5) Reportes con eventos en el último día de un mes.
  const nov30 = await newEvent('2026-11-30', 'nov30');
  const dec01 = await newEvent('2026-12-01', 'dic01');
  const dec31 = await newEvent('2026-12-31', 'dic31');
  const feb28 = await newEvent('2027-02-28', 'feb28');
  const mar01 = await newEvent('2027-03-01', 'mar01');
  const admin = serviceFor(dbs.admin);
  for (const id of [nov30, dec01, dec31, feb28, mar01]) await admin.save(id, marks(true, false));

  async function titles(period: 'week' | 'month', date: string): Promise<string[]> {
    const report = await admin.report(period, date);
    return report.events
      .filter((e) => e.title.startsWith(TAG))
      .map((e) => e.title.replace(`${TAG} `, ''))
      .sort();
  }
  const sameList = (a: string[], b: string[]): boolean => a.join() === b.join();

  const novMonth = await titles('month', '2026-11-15');
  check(
    'mensual de nov: incluye nov30, excluye dic01',
    sameList(novMonth, ['nov30', 'principal']),
    novMonth.join(),
  );
  const decMonth = await titles('month', '2026-12-10');
  check(
    'mensual de dic: incluye dic01 y dic31, excluye nov30',
    sameList(decMonth, ['dic01', 'dic31']),
    decMonth.join(),
  );
  const febMonth = await titles('month', '2027-02-10');
  check(
    'mensual de feb 2027: incluye feb28, excluye mar01',
    sameList(febMonth, ['feb28']),
    febMonth.join(),
  );
  const weekAtEnd = await admin.report('week', '2026-11-30');
  check(
    'semanal que inicia en nov30: 2026-11-30 a 2026-12-06',
    weekAtEnd.from === '2026-11-30' && weekAtEnd.to === '2026-12-06',
  );
  const weekEvents = await titles('week', '2026-11-30');
  check(
    'semanal incluye nov30 y dic01',
    sameList(weekEvents, ['dic01', 'nov30']),
    weekEvents.join(),
  );
  const weekBefore = await titles('week', '2026-11-29');
  check(
    'semanal del domingo 29 nov (23-29) excluye nov30',
    !weekBefore.includes('nov30'),
    weekBefore.join(),
  );
  const weekFeb = await admin.report('week', '2027-02-28');
  const weekFebTitles = await titles('week', '2027-02-28');
  check(
    'semanal del domingo 28 feb: 2027-02-22 a 2027-02-28',
    weekFeb.from === '2027-02-22' && weekFeb.to === '2027-02-28',
  );
  check(
    'semanal de feb28 incluye feb28 y excluye mar01',
    sameList(weekFebTitles, ['feb28']),
    weekFebTitles.join(),
  );
  const dec31Week = await titles('week', '2026-12-31');
  check(
    'semanal de dic31 (jueves) incluye dic31',
    sameList(dec31Week, ['dic31']),
    dec31Week.join(),
  );
  const totals = (await admin.report('month', '2026-12-10')).events
    .filter((e) => e.title.startsWith(TAG))
    .reduce((sum, e) => ({ p: sum.p + e.present, a: sum.a + e.absent }), { p: 0, a: 0 });
  check(
    'totales del mes de dic: 2 presentes y 2 ausentes',
    totals.p === 2 && totals.a === 2,
    JSON.stringify(totals),
  );
}

void main()
  .catch((error: unknown) => {
    failures += 1;
    console.error('Error inesperado:', error instanceof Error ? error.message : error);
  })
  .finally(async () => {
    await cleanup().catch(() => {
      console.error('No se pudo limpiar: borra a mano los registros que empiezan con', TAG);
    });
    console.log(
      failures === 0 ? '\nTodo correcto' : `\n${String(failures)} verificaciones fallaron`,
    );
    process.exit(failures === 0 ? 0 : 1);
  });
