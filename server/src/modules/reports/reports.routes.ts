import { Router, type Request, type Response } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import { toPdf, toXlsx } from './reportExport.js';
import {
  membersReportQuerySchema,
  ministriesReportQuerySchema,
  periodReportQuerySchema,
} from './reports.schemas.js';
import type { ReportsService } from './reports.service.js';
import type { ReportFormat, ReportTable } from './reports.types.js';

export type ReportsServiceFactory = (accessToken: string) => ReportsService;

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

async function respond(res: Response, table: ReportTable, format: ReportFormat): Promise<void> {
  if (format === 'json') {
    res.json({ report: table });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reporte-${table.slug}-${today}.${format}"`,
  );
  res.type(format === 'pdf' ? 'application/pdf' : XLSX_TYPE);
  res.send(format === 'pdf' ? await toPdf(table) : await toXlsx(table));
}

// Se monta detrás de authenticate. Según la matriz: admin y pastor todos; secretario miembros y
// asistencia; tesorero ingresos. El coordinador (su ministerio) queda pendiente: aún no hay
// vínculo entre su cuenta y los ministerios que coordina (llega con coordinator_policies).
export function createReportsRouter(reportsFor: ReportsServiceFactory): Router {
  const router = Router();

  router.get('/members', requireRole('admin', 'pastor', 'secretary'), async (req, res) => {
    const { status, format } = membersReportQuerySchema.parse(req.query);
    await respond(res, await reportsFor(tokenOf(req)).membersReport(status), format);
  });

  router.get('/attendance', requireRole('admin', 'pastor', 'secretary'), async (req, res) => {
    const { format, ...period } = periodReportQuerySchema.parse(req.query);
    await respond(res, await reportsFor(tokenOf(req)).attendanceReport(period), format);
  });

  router.get('/ministries', requireRole('admin', 'pastor'), async (req, res) => {
    const { format } = ministriesReportQuerySchema.parse(req.query);
    await respond(res, await reportsFor(tokenOf(req)).ministriesReport(), format);
  });

  router.get('/income', requireRole('admin', 'pastor', 'treasurer'), async (req, res) => {
    const { format, ...period } = periodReportQuerySchema.parse(req.query);
    await respond(res, await reportsFor(tokenOf(req)).incomeReport(period), format);
  });

  return router;
}
