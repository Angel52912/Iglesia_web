import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createAdminClient, createUserClient } from './config/supabase.js';
import { AttendanceService } from './modules/attendance/attendance.service.js';
import { SupabaseAttendanceRepository } from './modules/attendance/supabaseAttendance.repository.js';
import { DonationsService } from './modules/donations/donations.service.js';
import { SupabaseDonationsRepository } from './modules/donations/supabaseDonations.repository.js';
import { SupabaseAuthenticator } from './modules/auth/supabaseAuthenticator.js';
import { MembersService } from './modules/members/members.service.js';
import { SupabaseMembersRepository } from './modules/members/supabaseMembers.repository.js';
import { EventsService } from './modules/events/events.service.js';
import { SupabaseEventsRepository } from './modules/events/supabaseEvents.repository.js';
import { MinistriesService } from './modules/ministries/ministries.service.js';
import { SupabaseMinistriesRepository } from './modules/ministries/supabaseMinistries.repository.js';
import { SettingsService } from './modules/settings/settings.service.js';
import { SupabaseSettingsRepository } from './modules/settings/supabaseSettings.repository.js';
import { SupabaseAuthAdmin } from './modules/users/supabaseAuthAdmin.js';
import { SupabaseProfileWriter } from './modules/users/supabaseProfileWriter.js';
import { SupabaseProfilesRepository } from './modules/users/supabaseProfiles.repository.js';
import { UsersService } from './modules/users/users.service.js';

const env = loadEnv();
const adminClient = createAdminClient(env);
const authAdmin = new SupabaseAuthAdmin(adminClient);
const profileWriter = new SupabaseProfileWriter(adminClient);

const app = createApp(env, {
  authenticator: new SupabaseAuthenticator(env),
  usersFor: (accessToken) =>
    new UsersService(
      new SupabaseProfilesRepository(createUserClient(env, accessToken)),
      authAdmin,
      profileWriter,
    ),
  membersFor: (accessToken) =>
    new MembersService(new SupabaseMembersRepository(createUserClient(env, accessToken))),
  ministriesFor: (accessToken) =>
    new MinistriesService(new SupabaseMinistriesRepository(createUserClient(env, accessToken))),
  eventsFor: (accessToken) =>
    new EventsService(new SupabaseEventsRepository(createUserClient(env, accessToken))),
  attendanceFor: (accessToken) =>
    new AttendanceService(new SupabaseAttendanceRepository(createUserClient(env, accessToken))),
  donationsFor: (accessToken) =>
    new DonationsService(new SupabaseDonationsRepository(createUserClient(env, accessToken))),
  settingsFor: (accessToken) =>
    new SettingsService(new SupabaseSettingsRepository(createUserClient(env, accessToken))),
});

app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${String(env.PORT)}`);
});
