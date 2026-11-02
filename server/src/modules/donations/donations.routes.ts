import { Router, type Request } from 'express';
import { HttpError } from '../../errors.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createDonationSchema,
  donationIdSchema,
  listDonationsQuerySchema,
  summaryQuerySchema,
  updateDonationSchema,
} from './donations.schemas.js';
import type { DonationsService } from './donations.service.js';

export type DonationsServiceFactory = (accessToken: string) => DonationsService;

function tokenOf(req: Request): string {
  if (!req.accessToken) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }
  return req.accessToken;
}

// Se monta detrás de authenticate. Filas y escritura: admin y tesorero.
// Resumen mensual: además el pastor (solo agregados). Secretario y coordinador: 403.
export function createDonationsRouter(donationsFor: DonationsServiceFactory): Router {
  const router = Router();
  const canManage = requireRole('admin', 'treasurer');

  router.get('/summary', requireRole('admin', 'pastor', 'treasurer'), async (req, res) => {
    const { month } = summaryQuerySchema.parse(req.query);
    res.json({ summary: await donationsFor(tokenOf(req)).summary(month) });
  });

  router.get('/donors', canManage, async (req, res) => {
    res.json({ donors: await donationsFor(tokenOf(req)).listDonors() });
  });

  router.get('/', canManage, async (req, res) => {
    const filters = listDonationsQuerySchema.parse(req.query);
    res.json(await donationsFor(tokenOf(req)).list(filters));
  });

  router.post('/', canManage, async (req, res) => {
    const input = createDonationSchema.parse(req.body);
    const donation = await donationsFor(tokenOf(req)).create(input);
    res.status(201).json({ donation });
  });

  router.patch('/:id', canManage, async (req, res) => {
    const id = donationIdSchema.parse(req.params.id);
    const patch = updateDonationSchema.parse(req.body);
    res.json({ donation: await donationsFor(tokenOf(req)).update(id, patch) });
  });

  router.delete('/:id', canManage, async (req, res) => {
    const id = donationIdSchema.parse(req.params.id);
    await donationsFor(tokenOf(req)).remove(id);
    res.status(204).end();
  });

  return router;
}
