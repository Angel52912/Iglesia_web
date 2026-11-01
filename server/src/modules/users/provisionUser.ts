import type { AuthAdminPort, CreateUserInput, ProfileWriter } from './users.types.js';

// Crea el usuario en Auth (rol también en app_metadata) y luego su perfil.
// Si el perfil falla se borra el usuario recién creado: nunca quedan usuarios sin perfil.
// Lo usan el servidor y scripts/seed-users.ts.
export async function provisionUser(
  authAdmin: AuthAdminPort,
  profiles: ProfileWriter,
  input: CreateUserInput,
): Promise<string> {
  const id = await authAdmin.createUser(input);
  try {
    await profiles.insert({
      id,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      role: input.role,
    });
  } catch (error) {
    try {
      await authAdmin.deleteUser(id);
    } catch (cleanupError) {
      // Solo id y mensaje: nunca la entrada (lleva la contraseña).
      const reason = cleanupError instanceof Error ? cleanupError.message : 'error desconocido';
      console.error(`No se pudo borrar el usuario ${id} tras fallar su perfil: ${reason}`);
    }
    throw error;
  }
  return id;
}
