// Zona horaria de la iglesia: define qué día es "hoy" aunque el servidor esté en UTC.
const CHURCH_TIME_ZONE = 'America/Mexico_City';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHURCH_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Fecha de hoy como YYYY-MM-DD (en-CA ya usa ese formato).
export function todayIso(now: Date = new Date()): string {
  return formatter.format(now);
}
