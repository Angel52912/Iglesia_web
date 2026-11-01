import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createAdminClient, createUserClient } from './config/supabase.js';
import { SupabaseAuthenticator } from './modules/auth/supabaseAuthenticator.js';
import { MembersService } from './modules/members/members.service.js';
import { SupabaseMembersRepository } from './modules/members/supabaseMembers.repository.js';
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
});

app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${String(env.PORT)}`);
});
