// Crea un usuario por rol con la Admin API de Supabase (service_role).
// Es la ÚNICA vía para crear el primer administrador: el panel de Supabase ("Add user")
// no permite poner el rol en app_metadata y el trigger handle_new_user lo exige.
//
// Uso: npm run db:seed-users   (lee server/.env)
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y una contraseña por rol:
//   SEED_PASSWORD_ADMIN (obligatoria), SEED_PASSWORD_PASTOR, SEED_PASSWORD_SECRETARY,
//   SEED_PASSWORD_TREASURER, SEED_PASSWORD_COORDINATOR (opcionales: sin ella se omite el rol).
//   SEED_EMAIL_DOMAIN (opcional, por defecto iglesia.test).
// Las contraseñas nunca se imprimen ni se guardan en el repositorio.
import { createClient } from '@supabase/supabase-js';

const ROLES = ['admin', 'pastor', 'secretary', 'treasurer', 'coordinator'] as const;
type Role = (typeof ROLES)[number];

const MIN_PASSWORD_LENGTH = 8;

const FULL_NAMES: Record<Role, string> = {
  admin: 'Administrador',
  pastor: 'Pastor',
  secretary: 'Secretario',
  treasurer: 'Tesorero',
  coordinator: 'Coordinador',
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return value;
}

if (process.env.NODE_ENV === 'production') {
  console.error('seed-users no debe ejecutarse con NODE_ENV=production');
  process.exit(1);
}

const url = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const domain = (process.env.SEED_EMAIL_DOMAIN ?? 'iglesia.test').toLowerCase();

// El administrador es obligatorio: sin él no hay quién cree al resto desde la aplicación.
requireEnv('SEED_PASSWORD_ADMIN');

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main(): Promise<number> {
  let failures = 0;

  for (const role of ROLES) {
    const password = process.env[`SEED_PASSWORD_${role.toUpperCase()}`];
    const email = `${role}@${domain}`.toLowerCase();

    if (!password) {
      console.log(`- ${email}: omitido (falta SEED_PASSWORD_${role.toUpperCase()})`);
      continue;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(
        `- ${email}: la contraseña debe tener al menos ${String(MIN_PASSWORD_LENGTH)} caracteres`,
      );
      failures += 1;
      continue;
    }

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name: FULL_NAMES[role] },
    });

    if (!error) {
      console.log(`- ${email}: creado (${role})`);
    } else if (error.code === 'email_exists') {
      console.log(`- ${email}: ya existe`);
    } else {
      console.error(`- ${email}: error (${error.message})`);
      failures += 1;
    }
  }

  return failures;
}

// Sin await de nivel superior: la raíz no declara "type": "module" y tsx lo trataría como CJS.
void main().then((failures) => {
  process.exit(failures > 0 ? 1 : 0);
});
