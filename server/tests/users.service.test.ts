import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/errors.js';
import { SupabaseProfilesRepository } from '../src/modules/users/supabaseProfiles.repository.js';
import { UsersService } from '../src/modules/users/users.service.js';
import type { AuthenticatedUser } from '../src/types/auth.js';
import {
  FakeAuthAdmin,
  FakeProfileWriter,
  FakeProfilesRepository,
  ROLE_IDS,
  createStore,
  idFor,
} from './helpers.js';

const SECOND_ADMIN_ID = idFor(9);

function actorOf(id: string): AuthenticatedUser {
  return { id, email: 'actor@iglesia.test', fullName: 'Actor', role: 'admin' };
}

describe('UsersService: siempre debe quedar un administrador activo', () => {
  // Por la API el actor es un admin activo, así que el último admin solo se alcanza con
  // cambios simultáneos; el servicio lo cubre y el trigger de la BD es la segunda red.
  it.each([
    ['desactivarlo', { active: false }],
    ['quitarle el rol', { role: 'pastor' as const }],
  ])('rechaza con 409 al intentar %s si es el único admin activo', async (_caso, patch) => {
    const store = createStore();
    const service = new UsersService(
      new FakeProfilesRepository(store),
      new FakeAuthAdmin(store),
      new FakeProfileWriter(store),
    );

    await expect(
      service.update(actorOf(SECOND_ADMIN_ID), ROLE_IDS.admin, patch),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Debe quedar al menos un administrador activo',
    });
    expect(store.profiles.get(ROLE_IDS.admin)).toMatchObject({ role: 'admin', active: true });
    expect(store.blocked.size).toBe(0);
  });

  it('permite desactivar a un admin si queda otro activo', async () => {
    const store = createStore();
    store.profiles.set(SECOND_ADMIN_ID, {
      id: SECOND_ADMIN_ID,
      email: 'admin2@iglesia.test',
      fullName: 'Admin 2',
      role: 'admin',
      active: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
    const service = new UsersService(
      new FakeProfilesRepository(store),
      new FakeAuthAdmin(store),
      new FakeProfileWriter(store),
    );

    const updated = await service.update(actorOf(SECOND_ADMIN_ID), ROLE_IDS.admin, {
      active: false,
    });

    expect(updated.active).toBe(false);
    expect(store.blocked.has(ROLE_IDS.admin)).toBe(true);
  });
});

describe('SupabaseProfilesRepository', () => {
  function clientFailingWith(message: string): SupabaseClient {
    const result = Promise.resolve({ data: null, error: { message } });
    const chain = {
      update: () => chain,
      eq: () => chain,
      select: () => chain,
      maybeSingle: () => result,
    };
    return { from: () => chain } as unknown as SupabaseClient;
  }

  it('traduce el error last_active_admin del trigger a un 409 claro', async () => {
    const repository = new SupabaseProfilesRepository(clientFailingWith('last_active_admin'));

    const error: unknown = await repository
      .update(ROLE_IDS.admin, { active: false })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 409,
      message: 'Debe quedar al menos un administrador activo',
    });
  });

  it('otros errores de la BD siguen siendo errores internos (500)', async () => {
    const repository = new SupabaseProfilesRepository(clientFailingWith('connection reset'));

    const error: unknown = await repository
      .update(ROLE_IDS.pastor, { fullName: 'X' })
      .catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(HttpError);
  });
});
