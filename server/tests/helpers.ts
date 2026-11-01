import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';
import type {
  AuthAdminPort,
  CreateUserInput,
  ProfilesRepository,
  UpdateUserInput,
  UserProfile,
} from '../src/modules/users/users.types.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { ROLES, type AppRole, type AuthResult, type Authenticator } from '../src/types/auth.js';

export function idFor(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

export const ROLE_IDS: Record<AppRole, string> = {
  admin: idFor(1),
  pastor: idFor(2),
  secretary: idFor(3),
  treasurer: idFor(4),
  coordinator: idFor(5),
};

export interface Store {
  profiles: Map<string, UserProfile>;
  blocked: Set<string>;
  authRoles: Map<string, AppRole>;
  createCalls: CreateUserInput[];
  failNextCreate: Error | null;
}

export function createStore(): Store {
  const profiles = new Map<string, UserProfile>();
  for (const role of ROLES) {
    const id = ROLE_IDS[role];
    profiles.set(id, {
      id,
      email: `${role}@iglesia.test`,
      fullName: `Usuario ${role}`,
      role,
      active: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
  }
  return {
    profiles,
    blocked: new Set(),
    authRoles: new Map(),
    createCalls: [],
    failNextCreate: null,
  };
}

export class FakeProfilesRepository implements ProfilesRepository {
  constructor(protected readonly store: Store) {}

  list(): Promise<UserProfile[]> {
    return Promise.resolve([...this.store.profiles.values()]);
  }

  findById(id: string): Promise<UserProfile | null> {
    return Promise.resolve(this.store.profiles.get(id) ?? null);
  }

  countActiveAdmins(): Promise<number> {
    const admins = [...this.store.profiles.values()].filter((p) => p.role === 'admin' && p.active);
    return Promise.resolve(admins.length);
  }

  update(id: string, patch: UpdateUserInput): Promise<UserProfile | null> {
    const current = this.store.profiles.get(id);
    if (!current) return Promise.resolve(null);
    const updated: UserProfile = {
      ...current,
      fullName: patch.fullName ?? current.fullName,
      role: patch.role ?? current.role,
      active: patch.active ?? current.active,
    };
    this.store.profiles.set(id, updated);
    return Promise.resolve(updated);
  }
}

export class FakeAuthAdmin implements AuthAdminPort {
  constructor(private readonly store: Store) {}

  createUser(input: CreateUserInput): Promise<string> {
    this.store.createCalls.push(input);
    if (this.store.failNextCreate) {
      const error = this.store.failNextCreate;
      this.store.failNextCreate = null;
      return Promise.reject(error);
    }
    // unique(email) distingue mayúsculas: por eso la API debe normalizar a minúsculas.
    const duplicated = [...this.store.profiles.values()].some((p) => p.email === input.email);
    if (duplicated) {
      return Promise.reject(new HttpError(409, 'Ya existe un usuario con ese correo'));
    }
    const id = randomUUID();
    this.store.profiles.set(id, {
      id,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      active: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
    return Promise.resolve(id);
  }

  setRole(id: string, role: AppRole): Promise<void> {
    this.store.authRoles.set(id, role);
    return Promise.resolve();
  }

  setBlocked(id: string, blocked: boolean): Promise<void> {
    if (blocked) this.store.blocked.add(id);
    else this.store.blocked.delete(id);
    return Promise.resolve();
  }
}

// Como el real: rol y estado salen del perfil en cada petición, no del token.
export class FakeAuthenticator implements Authenticator {
  constructor(
    private readonly store: Store,
    private readonly tokens: Map<string, string>,
  ) {}

  authenticate(token: string): Promise<AuthResult> {
    const userId = this.tokens.get(token);
    const profile = userId ? this.store.profiles.get(userId) : undefined;
    if (!profile) return Promise.resolve({ status: 'invalid' });
    if (!profile.active) return Promise.resolve({ status: 'inactive' });
    return Promise.resolve({
      status: 'ok',
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
      },
    });
  }
}

export interface TestContext {
  app: Express;
  store: Store;
  authAdmin: FakeAuthAdmin;
}

export function tokenFor(role: AppRole): string {
  return `token-${role}`;
}

export function authHeader(role: AppRole): Record<string, string> {
  return { Authorization: `Bearer ${tokenFor(role)}` };
}

export function buildTestApp(): TestContext {
  const store = createStore();
  const tokens = new Map<string, string>(ROLES.map((role) => [tokenFor(role), ROLE_IDS[role]]));
  const authAdmin = new FakeAuthAdmin(store);
  const app = createApp(
    { CLIENT_ORIGIN: 'http://localhost:5173' },
    {
      authenticator: new FakeAuthenticator(store, tokens),
      usersFor: () => new UsersService(new FakeProfilesRepository(store), authAdmin),
    },
  );
  return { app, store, authAdmin };
}
