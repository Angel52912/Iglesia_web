import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  attendanceEventIdSchema,
  historyQuerySchema,
  reportQuerySchema,
  saveAttendanceSchema,
} from './attendance.schemas.js';
import type { AttendanceService } from './attendance.service.js';

export type AttendanceServiceFactory = (accessToken: string) => AttendanceService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Lectura: admin, pastor, secretario. Escritura: admin, secretario.
// El coordinador (registrar) llega con coordinator_policies.
export function createAttendanceRouter(attendanceFor: AttendanceServiceFactory): Router {
  const router = Router();
  const canRead = requireRole('admin', 'pastor', 'secretary');
  const canWrite = requireRole('admin', 'secretary');

  router.get('/history', canRead, async (req, res) => {
    const filters = historyQuerySchema.parse(req.query);
    res.json({ history: await attendanceFor(tokenOf(req)).history(filters) });
  });

  router.get('/report', canRead, async (req, res) => {
    const { period, date } = reportQuerySchema.parse(req.query);
    res.json({ report: await attendanceFor(tokenOf(req)).report(period, date) });
  });

  router.get('/events/:eventId', canRead, async (req, res) => {
    const eventId = attendanceEventIdSchema.parse(req.params.eventId);
    res.json(await attendanceFor(tokenOf(req)).getForEvent(eventId));
  });

  router.put('/events/:eventId', canWrite, async (req, res) => {
    const eventId = attendanceEventIdSchema.parse(req.params.eventId);
    const { records } = saveAttendanceSchema.parse(req.body);
    res.json(await attendanceFor(tokenOf(req)).save(eventId, records));
  });

  return router;
}
