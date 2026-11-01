import type { SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/errors.js';
import { provisionUser } from '../src/modules/users/provisionUser.js';
import { SupabaseAuthAdmin } from '../src/modules/users/supabaseAuthAdmin.js';
import { SupabaseProfileWriter } from '../src/modules/users/supabaseProfileWriter.js';
import type { CreateUserInput } from '../src/modules/users/users.types.js';
import {
  FakeAuthAdmin,
  FakeProfileWriter,
  authHeader,
  buildTestApp,
  createStore,
} from './helpers.js';

const PASSWORD = 'ClaveSegura123';

const input: CreateUserInput = {
  email: 'Nuevo@Iglesia.TEST',
  password: PASSWORD,
  fullName: 'Nuevo Usuario',
  role: 'treasurer',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('provisionUser', () => {
  it('crea el usuario en Auth con el rol en app_metadata y luego su perfil en minúsculas', async () => {
    const store = createStore();

    const id = await provisionUser(new FakeAuthAdmin(store), new FakeProfileWriter(store), input);

    expect(store.authRoles.get(id)).toBe('treasurer');
    expect(store.profiles.get(id)).toMatchObject({
      email: 'nuevo@iglesia.test',
      fullName: 'Nuevo Usuario',
      role: 'treasurer',
      active: true,
    });
  });

  it('si falla el perfil borra el usuario recién creado y propaga el error original', async () => {
    const store = createStore();
    const profilesBefore = store.profiles.size;
    store.failNextProfileInsert = new Error('fallo al insertar el perfil');

    await expect(
      provisionUser(new FakeAuthAdmin(store), new FakeProfileWriter(store), input),
    ).rejects.toThrow('fallo al insertar el perfil');

    expect(store.deletedUsers).toHaveLength(1);
    expect(store.authUsers.size).toBe(0);
    expect(store.profiles.size).toBe(profilesBefore);
  });

  it('si además falla el borrado, igual propaga el error original y no registra la contraseña', async () => {
    const store = createStore();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.failNextProfileInsert = new Error('fallo al insertar el perfil');
    store.failNextDelete = new Error('fallo al borrar en Auth');

    await expect(
      provisionUser(new FakeAuthAdmin(store), new FakeProfileWriter(store), input),
    ).rejects.toThrow('fallo al insertar el perfil');

    expect(spy).toHaveBeenCalledOnce();
    const [userId] = [...store.authUsers.keys()];
    expect(JSON.stringify(spy.mock.calls)).toContain(userId);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(PASSWORD);
  });

  it('si falla Auth no intenta crear el perfil', async () => {
    const store = createStore();
    const profilesBefore = store.profiles.size;
    store.failNextCreate = new Error('fallo de Auth');

    await expect(
      provisionUser(new FakeAuthAdmin(store), new FakeProfileWriter(store), input),
    ).rejects.toThrow('fallo de Auth');

    expect(store.profiles.size).toBe(profilesBefore);
    expect(store.deletedUsers).toHaveLength(0);
  });
});

describe('POST /api/users con la creación en dos pasos', () => {
  it('deja usuario y perfil con el rol correcto', async () => {
    const { app, store } = buildTestApp();

    const response = await request(app)
      .post('/api/users')
      .set(authHeader('admin'))
      .send({ ...input, email: 'Nuevo@Iglesia.TEST' });

    expect(response.status).toBe(201);
    const id = (response.body as { user: { id: string } }).user.id;
    expect(store.authRoles.get(id)).toBe('treasurer');
    expect(store.profiles.get(id)?.email).toBe('nuevo@iglesia.test');
  });

  it('si el perfil falla responde 500, no deja usuarios huérfanos ni filtra la contraseña', async () => {
    const { app, store } = buildTestApp();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const profilesBefore = store.profiles.size;
    store.failNextProfileInsert = new Error('fallo al insertar el perfil');

    const response = await request(app).post('/api/users').set(authHeader('admin')).send(input);

    expect(response.status).toBe(500);
    expect(store.authUsers.size).toBe(0);
    expect(store.deletedUsers).toHaveLength(1);
    expect(store.profiles.size).toBe(profilesBefore);
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(PASSWORD);
  });

  it('permite crear de nuevo el mismo correo tras un fallo (no queda reservado en Auth)', async () => {
    const { app, store } = buildTestApp();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.failNextProfileInsert = new Error('fallo al insertar el perfil');

    await request(app).post('/api/users').set(authHeader('admin')).send(input);
    const retry = await request(app).post('/api/users').set(authHeader('admin')).send(input);

    expect(retry.status).toBe(201);
  });
});

describe('SupabaseProfileWriter', () => {
  function clientInserting(result: { error: { code?: string; message: string } | null }): {
    client: SupabaseClient;
    insert: ReturnType<typeof vi.fn>;
  } {
    const insert = vi.fn().mockResolvedValue(result);
    const client = { from: () => ({ insert }) } as unknown as SupabaseClient;
    return { client, insert };
  }

  const profile = {
    id: 'u1',
    email: 'Nuevo@Iglesia.TEST',
    fullName: 'Nuevo',
    role: 'pastor',
  } as const;

  it('inserta el perfil con el correo en minúsculas', async () => {
    const { client, insert } = clientInserting({ error: null });

    await new SupabaseProfileWriter(client).insert(profile);

    expect(insert).toHaveBeenCalledWith({
      id: 'u1',
      email: 'nuevo@iglesia.test',
      full_name: 'Nuevo',
      role: 'pastor',
    });
  });

  it('traduce la violación de unicidad a 409', async () => {
    const { client } = clientInserting({ error: { code: '23505', message: 'duplicate key' } });

    const error: unknown = await new SupabaseProfileWriter(client)
      .insert(profile)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 409 });
  });

  it('otros errores siguen siendo errores internos', async () => {
    const { client } = clientInserting({ error: { code: '08006', message: 'connection failure' } });

    const error: unknown = await new SupabaseProfileWriter(client)
      .insert(profile)
      .catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(HttpError);
  });
});

describe('SupabaseAuthAdmin', () => {
  function adminClient(overrides: {
    createUser?: ReturnType<typeof vi.fn>;
    deleteUser?: ReturnType<typeof vi.fn>;
  }): SupabaseClient {
    return {
      auth: {
        admin: {
          createUser: overrides.createUser ?? vi.fn(),
          deleteUser: overrides.deleteUser ?? vi.fn(),
        },
      },
    } as unknown as SupabaseClient;
  }

  it('crea el usuario con el rol en app_metadata y el correo en minúsculas', async () => {
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    const id = await new SupabaseAuthAdmin(adminClient({ createUser })).createUser(input);

    expect(id).toBe('u1');
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'nuevo@iglesia.test',
        email_confirm: true,
        app_metadata: { role: 'treasurer' },
      }),
    );
  });

  it('traduce email_exists a 409', async () => {
    const createUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: { code: 'email_exists', message: 'x' } });

    const error: unknown = await new SupabaseAuthAdmin(adminClient({ createUser }))
      .createUser(input)
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 409 });
  });

  it('el mensaje de error de Auth no incluye la contraseña', async () => {
    const createUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: { code: 'unexpected', message: 'boom' } });

    const error: unknown = await new SupabaseAuthAdmin(adminClient({ createUser }))
      .createUser(input)
      .catch((e: unknown) => e);

    expect(String(error)).not.toContain(PASSWORD);
  });

  it('borra el usuario en Auth', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null });

    await new SupabaseAuthAdmin(adminClient({ deleteUser })).deleteUser('u1');

    expect(deleteUser).toHaveBeenCalledWith('u1');
  });
});
