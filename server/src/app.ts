import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requireRole } from './middleware/requireRole.js';
import {
  createAttendanceRouter,
  type AttendanceServiceFactory,
} from './modules/attendance/attendance.routes.js';
import {
  createAnnouncementsRouter,
  type AnnouncementsServiceFactory,
} from './modules/announcements/announcements.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import {
  createDonationsRouter,
  type DonationsServiceFactory,
} from './modules/donations/donations.routes.js';
import { createEventsRouter, type EventsServiceFactory } from './modules/events/events.routes.js';
import {
  createMinistriesRouter,
  type MinistriesServiceFactory,
} from './modules/ministries/ministries.routes.js';
import {
  createMembersRouter,
  type MembersServiceFactory,
} from './modules/members/members.routes.js';
import {
  createSettingsRouter,
  type SettingsServiceFactory,
} from './modules/settings/settings.routes.js';
import { createUsersRouter, type UsersServiceFactory } from './modules/users/users.routes.js';
import type { Authenticator } from './types/auth.js';

export interface AppDeps {
  authenticator: Authenticator;
  usersFor: UsersServiceFactory;
  membersFor: MembersServiceFactory;
  settingsFor: SettingsServiceFactory;
  ministriesFor: MinistriesServiceFactory;
  eventsFor: EventsServiceFactory;
  attendanceFor: AttendanceServiceFactory;
  donationsFor: DonationsServiceFactory;
  announcementsFor: AnnouncementsServiceFactory;
}

export function createApp(env: Pick<Env, 'CLIENT_ORIGIN'>, deps: AppDeps): Express {
  const app = express();
  const authenticate = createAuthenticate(deps.authenticator);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authenticate, createAuthRouter());
  app.use('/api/users', authenticate, requireRole('admin'), createUsersRouter(deps.usersFor));
  app.use('/api/members', authenticate, createMembersRouter(deps.membersFor));

  app.use('/api/ministries', authenticate, createMinistriesRouter(deps.ministriesFor));
  app.use('/api/events', authenticate, createEventsRouter(deps.eventsFor));
  app.use('/api/attendance', authenticate, createAttendanceRouter(deps.attendanceFor));
  app.use('/api/donations', authenticate, createDonationsRouter(deps.donationsFor));
  app.use('/api/announcements', authenticate, createAnnouncementsRouter(deps.announcementsFor));
  app.use(
    '/api/settings',
    authenticate,
    requireRole('admin'),
    createSettingsRouter(deps.settingsFor),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
