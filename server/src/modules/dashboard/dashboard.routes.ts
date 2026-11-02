import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import type { DashboardService } from './dashboard.service.js';

export type DashboardServiceFactory = (accessToken: string) => DashboardService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Todos los roles ven el panel; qué bloques recibe cada uno
// (ingresos solo admin/pastor/tesorero; el tesorero solo ingresos) lo decide dashboard_stats.
export function createDashboardRouter(dashboardFor: DashboardServiceFactory): Router {
  const router = Router();

  router.get(
    '/',
    requireRole('admin', 'pastor', 'secretary', 'treasurer', 'coordinator'),
    async (req, res) => {
      res.json(await dashboardFor(tokenOf(req)).stats());
    },
  );

  return router;
}
