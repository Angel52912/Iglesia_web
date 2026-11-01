// Crea un usuario por rol: primero en Auth (service_role, rol también en app_metadata) y
// luego su perfil en public.profiles. Si el perfil falla, borra el usuario recién creado
// (misma lógica que el servidor: provisionUser).
// Es la vía para crear el primer administrador. Un usuario creado desde "Add user" del panel
// de Supabase queda sin perfil y no puede entrar (authenticate responde 401).
//
// Uso: npm run db:seed-users   (lee server/.env)
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y una contraseña por rol:
//   SEED_PASSWORD_ADMIN (obligatoria), SEED_PASSWORD_PASTOR, SEED_PASSWORD_SECRETARY,
//   SEED_PASSWORD_TREASURER, SEED_PASSWORD_COORDINATOR (opcionales: sin ella se omite el rol).
//   SEED_EMAIL_DOMAIN (opcional, por defecto iglesia.test).
// Las contraseñas nunca se imprimen ni se guardan en el repositorio.
import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../server/src/errors.js';
import { provisionUser } from '../server/src/modules/users/provisionUser.js';
import { SupabaseAuthAdmin } from '../server/src/modules/users/supabaseAuthAdmin.js';
import { SupabaseProfileWriter } from '../server/src/modules/users/supabaseProfileWriter.js';
import { ROLES, type AppRole } from '../server/src/types/auth.js';

const MIN_PASSWORD_LENGTH = 8;

const FULL_NAMES: Record<AppRole, string> = {
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

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authAdmin = new SupabaseAuthAdmin(client);
const profileWriter = new SupabaseProfileWriter(client);

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

    try {
      await provisionUser(authAdmin, profileWriter, {
        email,
        password,
        fullName: FULL_NAMES[role],
        role,
      });
      console.log(`- ${email}: creado (${role})`);
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        console.log(`- ${email}: ya existe`);
      } else {
        const reason = error instanceof Error ? error.message : 'error desconocido';
        console.error(`- ${email}: error (${reason})`);
        failures += 1;
      }
    }
  }

  return failures;
}

// Sin await de nivel superior: la raíz no declara "type": "module" y tsx lo trataría como CJS.
void main().then((failures) => {
  process.exit(failures > 0 ? 1 : 0);
});
