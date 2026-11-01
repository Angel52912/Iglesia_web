import { HttpError } from '../../errors.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import type {
  AuthAdminPort,
  CreateUserInput,
  ProfileWriter,
  ProfilesRepository,
  UpdateUserInput,
  UserProfile,
} from './users.types.js';
import { provisionUser } from './provisionUser.js';

export class UsersService {
  constructor(
    private readonly profiles: ProfilesRepository,
    private readonly authAdmin: AuthAdminPort,
    private readonly profileWriter: ProfileWriter,
  ) {}

  list(): Promise<UserProfile[]> {
    return this.profiles.list();
  }

  async create(input: CreateUserInput): Promise<UserProfile> {
    const id = await provisionUser(this.authAdmin, this.profileWriter, input);
    const profile = await this.profiles.findById(id);
    if (!profile) {
      throw new Error('El perfil no se creó para el usuario nuevo');
    }
    return profile;
  }

  async update(actor: AuthenticatedUser, id: string, patch: UpdateUserInput): Promise<UserProfile> {
    const current = await this.profiles.findById(id);
    if (!current) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const deactivates = patch.active === false;
    const changesRole = patch.role !== undefined && patch.role !== current.role;

    if (id === actor.id && (deactivates || changesRole)) {
      throw new HttpError(409, 'No puedes desactivar tu propia cuenta ni cambiar tu propio rol');
    }

    const losesAdmin = current.role === 'admin' && current.active && (deactivates || changesRole);
    if (losesAdmin && (await this.profiles.countActiveAdmins()) <= 1) {
      throw new HttpError(409, 'Debe quedar al menos un administrador activo');
    }

    // El perfil es la fuente de verdad (authenticate lo consulta en cada petición);
    // el bloqueo en Auth impide además nuevos inicios de sesión.
    const updated = await this.profiles.update(id, patch);
    if (!updated) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    if (patch.active !== undefined) {
      await this.authAdmin.setBlocked(id, !patch.active);
    }
    if (patch.role !== undefined) {
      await this.authAdmin.setRole(id, patch.role);
    }
    return updated;
  }
}
