import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createAdminClient, createUserClient } from './config/supabase.js';
import { SupabaseAuthenticator } from './modules/auth/supabaseAuthenticator.js';
import { SupabaseAuthAdmin } from './modules/users/supabaseAuthAdmin.js';
import { SupabaseProfilesRepository } from './modules/users/supabaseProfiles.repository.js';
import { UsersService } from './modules/users/users.service.js';

const env = loadEnv();
const authAdmin = new SupabaseAuthAdmin(createAdminClient(env));

const app = createApp(env, {
  authenticator: new SupabaseAuthenticator(env),
  usersFor: (accessToken) =>
    new UsersService(new SupabaseProfilesRepository(createUserClient(env, accessToken)), authAdmin),
});

app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${String(env.PORT)}`);
});
