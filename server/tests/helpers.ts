import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';
import { AttendanceService } from '../src/modules/attendance/attendance.service.js';
import { summarize } from '../src/modules/attendance/supabaseAttendance.repository.js';
import type {
  AttendanceEvent,
  AttendanceMark,
  AttendanceRecord,
  AttendanceRepository,
  AttendanceSummary,
  HistoryFilters,
} from '../src/modules/attendance/attendance.types.js';
import { DonationsService } from '../src/modules/donations/donations.service.js';
import type {
  CreateDonationInput,
  Donation,
  DonationFilters,
  DonationsRepository,
  DonorRef,
  SummaryRow,
  UpdateDonationInput,
} from '../src/modules/donations/donations.types.js';
import { MembersService } from '../src/modules/members/members.service.js';
import { EventsService } from '../src/modules/events/events.service.js';
import type {
  ChurchEvent,
  CreateEventInput,
  EventFilters,
  EventsRepository,
  UpdateEventInput,
} from '../src/modules/events/events.types.js';
import { MinistriesService } from '../src/modules/ministries/ministries.service.js';
import type {
  CreateMinistryInput,
  MemberRef,
  MinistriesRepository,
  Ministry,
  MinistryDetail,
  UpdateMinistryInput,
} from '../src/modules/ministries/ministries.types.js';
import { SettingsService } from '../src/modules/settings/settings.service.js';
import type {
  ChurchSettings,
  LogoFile,
  MeetingSchedule,
  ScheduleInput,
  SettingsRepository,
  UpdateScheduleInput,
  UpdateSettingsInput,
} from '../src/modules/settings/settings.types.js';
import type {
  CreateMemberInput,
  Member,
  MemberFilters,
  MembersRepository,
  UpdateMemberInput,
} from '../src/modules/members/members.types.js';
import type {
  AuthAdminPort,
  CreateUserInput,
  NewProfile,
  ProfileWriter,
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
  members: Map<string, Member>;
  settings: ChurchSettings;
  logos: LogoFile[];
  ministries: Map<string, MinistryDetail>;
  events: Map<string, ChurchEvent>;
  // eventId -> (memberId -> presente)
  attendance: Map<string, Map<string, boolean>>;
  donations: Map<string, Donation>;
  profiles: Map<string, UserProfile>;
  blocked: Set<string>;
  authRoles: Map<string, AppRole>;
  // Usuarios que existen en Auth (id -> correo), con o sin perfil.
  authUsers: Map<string, string>;
  deletedUsers: string[];
  createCalls: CreateUserInput[];
  failNextCreate: Error | null;
  failNextProfileInsert: Error | null;
  failNextDelete: Error | null;
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
    members: new Map(),
    settings: {
      name: 'Mi iglesia',
      address: null,
      phone: null,
      email: null,
      logoUrl: null,
      schedules: [],
    },
    logos: [],
    ministries: new Map(),
    events: new Map(),
    attendance: new Map(),
    donations: new Map(),
    profiles,
    blocked: new Set(),
    authRoles: new Map(),
    authUsers: new Map(),
    deletedUsers: [],
    createCalls: [],
    failNextCreate: null,
    failNextProfileInsert: null,
    failNextDelete: null,
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

export class FakeMembersRepository implements MembersRepository {
  constructor(private readonly store: Store) {}

  list(filters: MemberFilters): Promise<Member[]> {
    const search = filters.search?.toLowerCase();
    const found = [...this.store.members.values()].filter(
      (m) =>
        (search === undefined || m.fullName.toLowerCase().includes(search)) &&
        (filters.active === undefined || m.active === filters.active),
    );
    return Promise.resolve(found.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  create(input: CreateMemberInput): Promise<Member> {
    const member: Member = {
      id: randomUUID(),
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      joinedOn: input.joinedOn ?? '2026-11-01',
      active: true,
      createdAt: '2026-11-01T00:00:00Z',
    };
    this.store.members.set(member.id, member);
    return Promise.resolve(member);
  }

  update(id: string, patch: UpdateMemberInput): Promise<Member | null> {
    const current = this.store.members.get(id);
    if (!current) return Promise.resolve(null);
    const updated: Member = {
      ...current,
      fullName: patch.fullName ?? current.fullName,
      phone: patch.phone === undefined ? current.phone : patch.phone,
      email: patch.email === undefined ? current.email : patch.email,
      joinedOn: patch.joinedOn ?? current.joinedOn,
      active: patch.active ?? current.active,
    };
    this.store.members.set(id, updated);
    return Promise.resolve(updated);
  }
}

export class FakeSettingsRepository implements SettingsRepository {
  constructor(private readonly store: Store) {}

  get(): Promise<ChurchSettings> {
    return Promise.resolve(this.store.settings);
  }

  update(patch: UpdateSettingsInput): Promise<ChurchSettings> {
    const current = this.store.settings;
    this.store.settings = {
      ...current,
      name: patch.name ?? current.name,
      address: patch.address === undefined ? current.address : patch.address,
      phone: patch.phone === undefined ? current.phone : patch.phone,
      email: patch.email === undefined ? current.email : patch.email,
    };
    return this.get();
  }

  setLogo(file: LogoFile): Promise<ChurchSettings> {
    this.store.logos.push(file);
    const logoUrl = `https://storage.test/logo-${String(this.store.logos.length)}`;
    this.store.settings = { ...this.store.settings, logoUrl };
    return this.get();
  }

  removeLogo(): Promise<ChurchSettings> {
    this.store.settings = { ...this.store.settings, logoUrl: null };
    return this.get();
  }

  createSchedule(input: ScheduleInput): Promise<MeetingSchedule> {
    const schedule: MeetingSchedule = { id: randomUUID(), ...input };
    this.store.settings.schedules.push(schedule);
    return Promise.resolve(schedule);
  }

  updateSchedule(id: string, patch: UpdateScheduleInput): Promise<MeetingSchedule | null> {
    const list = this.store.settings.schedules;
    const index = list.findIndex((s) => s.id === id);
    const current = list[index];
    if (!current) return Promise.resolve(null);
    const updated: MeetingSchedule = {
      ...current,
      label: patch.label ?? current.label,
      weekday: patch.weekday ?? current.weekday,
      startTime: patch.startTime ?? current.startTime,
    };
    list[index] = updated;
    return Promise.resolve(updated);
  }

  deleteSchedule(id: string): Promise<boolean> {
    const list = this.store.settings.schedules;
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return Promise.resolve(false);
    list.splice(index, 1);
    return Promise.resolve(true);
  }
}

// Como la BD: un miembro que no existe da 400 y un nombre repetido da 409.
function refsFor(store: Store, ids: string[]): MemberRef[] {
  return ids.map((id) => {
    const member = store.members.get(id);
    if (!member) throw new HttpError(400, 'Hay un dato relacionado que no existe');
    return { id, fullName: member.fullName };
  });
}

export class FakeMinistriesRepository implements MinistriesRepository {
  constructor(private readonly store: Store) {}

  list(): Promise<Ministry[]> {
    const list = [...this.store.ministries.values()].map((m): Ministry => ({
      id: m.id,
      name: m.name,
      description: m.description,
      active: m.active,
      coordinators: m.coordinators,
      memberCount: m.memberCount,
    }));
    return Promise.resolve(list.sort((a, b) => a.name.localeCompare(b.name)));
  }

  findById(id: string): Promise<MinistryDetail | null> {
    return Promise.resolve(this.store.ministries.get(id) ?? null);
  }

  private assertUniqueName(name: string, exceptId?: string): void {
    const duplicated = [...this.store.ministries.values()].some(
      (m) => m.id !== exceptId && m.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicated) throw new HttpError(409, 'Ya existe un ministerio con ese nombre');
  }

  create(input: CreateMinistryInput): Promise<MinistryDetail> {
    this.assertUniqueName(input.name);
    const ministry: MinistryDetail = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      active: true,
      coordinators: [],
      memberCount: 0,
      members: [],
    };
    this.store.ministries.set(ministry.id, ministry);
    return Promise.resolve(ministry);
  }

  update(id: string, patch: UpdateMinistryInput): Promise<MinistryDetail | null> {
    const current = this.store.ministries.get(id);
    if (!current) return Promise.resolve(null);
    if (patch.name !== undefined) this.assertUniqueName(patch.name, id);
    const updated: MinistryDetail = {
      ...current,
      name: patch.name ?? current.name,
      description: patch.description === undefined ? current.description : patch.description,
      active: patch.active ?? current.active,
    };
    this.store.ministries.set(id, updated);
    return Promise.resolve(updated);
  }

  setCoordinators(id: string, memberIds: string[]): Promise<MinistryDetail | null> {
    const current = this.store.ministries.get(id);
    if (!current) return Promise.resolve(null);
    const updated = { ...current, coordinators: refsFor(this.store, memberIds) };
    this.store.ministries.set(id, updated);
    return Promise.resolve(updated);
  }

  setMembers(id: string, memberIds: string[]): Promise<MinistryDetail | null> {
    const current = this.store.ministries.get(id);
    if (!current) return Promise.resolve(null);
    const members = refsFor(this.store, memberIds);
    const updated = { ...current, members, memberCount: members.length };
    this.store.ministries.set(id, updated);
    return Promise.resolve(updated);
  }
}

export class FakeEventsRepository implements EventsRepository {
  constructor(private readonly store: Store) {}

  list(filters: EventFilters): Promise<ChurchEvent[]> {
    const found = [...this.store.events.values()].filter(
      (e) =>
        (filters.from === undefined || e.eventDate >= filters.from) &&
        (filters.to === undefined || e.eventDate <= filters.to) &&
        (filters.status === undefined || e.status === filters.status) &&
        (filters.ministryId === undefined || e.ministryId === filters.ministryId),
    );
    const sorted = found.sort((a, b) =>
      `${a.eventDate}${a.startTime}`.localeCompare(`${b.eventDate}${b.startTime}`),
    );
    return Promise.resolve(sorted);
  }

  private ministryNameFor(ministryId: string | null): string | null {
    if (ministryId === null) return null;
    const ministry = this.store.ministries.get(ministryId);
    if (!ministry) throw new HttpError(400, 'Hay un dato relacionado que no existe');
    return ministry.name;
  }

  create(input: CreateEventInput): Promise<ChurchEvent> {
    const event: ChurchEvent = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      eventDate: input.eventDate,
      startTime: input.startTime,
      location: input.location,
      type: input.type,
      category: input.category,
      status: 'scheduled',
      ministryId: input.ministryId,
      ministryName: this.ministryNameFor(input.ministryId),
      responsibles: refsFor(this.store, input.responsibleIds),
    };
    this.store.events.set(event.id, event);
    return Promise.resolve(event);
  }

  update(id: string, patch: UpdateEventInput): Promise<ChurchEvent | null> {
    const current = this.store.events.get(id);
    if (!current) return Promise.resolve(null);
    const ministryId = patch.ministryId === undefined ? current.ministryId : patch.ministryId;
    const updated: ChurchEvent = {
      ...current,
      title: patch.title ?? current.title,
      description: patch.description === undefined ? current.description : patch.description,
      eventDate: patch.eventDate ?? current.eventDate,
      startTime: patch.startTime ?? current.startTime,
      location: patch.location === undefined ? current.location : patch.location,
      type: patch.type ?? current.type,
      category: patch.category ?? current.category,
      status: patch.status ?? current.status,
      ministryId,
      ministryName: this.ministryNameFor(ministryId),
      responsibles:
        patch.responsibleIds === undefined
          ? current.responsibles
          : refsFor(this.store, patch.responsibleIds),
    };
    this.store.events.set(id, updated);
    return Promise.resolve(updated);
  }
}

export class FakeAttendanceRepository implements AttendanceRepository {
  constructor(private readonly store: Store) {}

  findEvent(eventId: string): Promise<AttendanceEvent | null> {
    const event = this.store.events.get(eventId);
    if (!event) return Promise.resolve(null);
    return Promise.resolve({
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      category: event.category,
      status: event.status,
    });
  }

  listForEvent(eventId: string): Promise<AttendanceRecord[]> {
    const marks = this.store.attendance.get(eventId) ?? new Map<string, boolean>();
    const records = [...marks].map(([memberId, present]) => ({
      memberId,
      fullName: this.store.members.get(memberId)?.fullName ?? '',
      present,
    }));
    return Promise.resolve(records.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  save(eventId: string, marks: AttendanceMark[]): Promise<void> {
    // Como la BD: un miembro que no existe da 400 y no se guarda nada.
    for (const mark of marks) {
      if (!this.store.members.has(mark.memberId))
        throw new HttpError(400, 'Algún miembro no existe');
    }
    const current = this.store.attendance.get(eventId) ?? new Map<string, boolean>();
    for (const mark of marks) current.set(mark.memberId, mark.present);
    this.store.attendance.set(eventId, current);
    return Promise.resolve();
  }

  summaries(filters: HistoryFilters): Promise<AttendanceSummary[]> {
    const rows: Parameters<typeof summarize>[0] = [];
    for (const [eventId, marks] of this.store.attendance) {
      const event = this.store.events.get(eventId);
      if (!event) continue;
      if (filters.from !== undefined && event.eventDate < filters.from) continue;
      if (filters.to !== undefined && event.eventDate > filters.to) continue;
      if (filters.eventId !== undefined && eventId !== filters.eventId) continue;
      for (const present of marks.values()) {
        rows.push({
          present,
          events: {
            id: event.id,
            title: event.title,
            event_date: event.eventDate,
            category: event.category,
          },
        });
      }
    }
    return Promise.resolve(summarize(rows));
  }
}

export class FakeDonationsRepository implements DonationsRepository {
  constructor(
    private readonly store: Store,
    private readonly role: AppRole,
  ) {}

  private donorNameFor(memberId: string | null): string | null {
    if (memberId === null) return null;
    const member = this.store.members.get(memberId);
    // Como la BD: un miembro que no existe da 400.
    if (!member) throw new HttpError(400, 'Hay un dato relacionado que no existe');
    return member.fullName;
  }

  list(filters: DonationFilters): Promise<Donation[]> {
    const found = [...this.store.donations.values()].filter(
      (d) =>
        (filters.from === undefined || d.donatedOn >= filters.from) &&
        (filters.to === undefined || d.donatedOn <= filters.to) &&
        (filters.memberId === undefined || d.memberId === filters.memberId),
    );
    return Promise.resolve(found.sort((a, b) => b.donatedOn.localeCompare(a.donatedOn)));
  }

  listDonors(): Promise<DonorRef[]> {
    const donors = [...this.store.members.values()].map((m) => ({ id: m.id, fullName: m.fullName }));
    return Promise.resolve(donors.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  summaryRows(from: string, to: string): Promise<SummaryRow[]> {
    // Como donation_summary: solo admin y tesorero reciben el concepto.
    const withConcept = this.role === 'admin' || this.role === 'treasurer';
    const groups = new Map<string, SummaryRow>();
    for (const d of this.store.donations.values()) {
      if (d.donatedOn < from || d.donatedOn > to) continue;
      const concept = withConcept ? d.concept : null;
      const key = `${d.method}|${concept ?? ''}`;
      const current = groups.get(key) ?? {
        method: d.method,
        concept,
        total: 0,
        donations: 0,
      };
      groups.set(key, {
        ...current,
        total: current.total + d.amount,
        donations: current.donations + 1,
      });
    }
    return Promise.resolve([...groups.values()]);
  }

  create(input: CreateDonationInput): Promise<Donation> {
    const donation: Donation = {
      id: randomUUID(),
      memberId: input.memberId,
      donorName: this.donorNameFor(input.memberId),
      donatedOn: input.donatedOn,
      amount: input.amount,
      concept: input.concept,
      method: input.method,
    };
    this.store.donations.set(donation.id, donation);
    return Promise.resolve(donation);
  }

  update(id: string, patch: UpdateDonationInput): Promise<Donation | null> {
    const current = this.store.donations.get(id);
    if (!current) return Promise.resolve(null);
    const memberId = patch.memberId === undefined ? current.memberId : patch.memberId;
    const updated: Donation = {
      ...current,
      memberId,
      donorName: this.donorNameFor(memberId),
      donatedOn: patch.donatedOn ?? current.donatedOn,
      amount: patch.amount ?? current.amount,
      concept: patch.concept ?? current.concept,
      method: patch.method ?? current.method,
    };
    this.store.donations.set(id, updated);
    return Promise.resolve(updated);
  }

  remove(id: string): Promise<boolean> {
    return Promise.resolve(this.store.donations.delete(id));
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
    // Como Auth: el correo se compara en minúsculas.
    const email = input.email.toLowerCase();
    const duplicated =
      [...this.store.profiles.values()].some((p) => p.email === email) ||
      [...this.store.authUsers.values()].includes(email);
    if (duplicated) {
      return Promise.reject(new HttpError(409, 'Ya existe un usuario con ese correo'));
    }
    const id = randomUUID();
    this.store.authUsers.set(id, email);
    // Rol también en app_metadata. El perfil NO se crea aquí: lo inserta provisionUser.
    this.store.authRoles.set(id, input.role);
    return Promise.resolve(id);
  }

  deleteUser(id: string): Promise<void> {
    if (this.store.failNextDelete) {
      const error = this.store.failNextDelete;
      this.store.failNextDelete = null;
      return Promise.reject(error);
    }
    this.store.authUsers.delete(id);
    this.store.authRoles.delete(id);
    this.store.deletedUsers.push(id);
    return Promise.resolve();
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

export class FakeProfileWriter implements ProfileWriter {
  constructor(private readonly store: Store) {}

  insert(profile: NewProfile): Promise<void> {
    if (this.store.failNextProfileInsert) {
      const error = this.store.failNextProfileInsert;
      this.store.failNextProfileInsert = null;
      return Promise.reject(error);
    }
    this.store.profiles.set(profile.id, {
      ...profile,
      active: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
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
      usersFor: () =>
        new UsersService(
          new FakeProfilesRepository(store),
          authAdmin,
          new FakeProfileWriter(store),
        ),
      membersFor: () => new MembersService(new FakeMembersRepository(store)),
      ministriesFor: () => new MinistriesService(new FakeMinistriesRepository(store)),
      eventsFor: () => new EventsService(new FakeEventsRepository(store)),
      attendanceFor: () => new AttendanceService(new FakeAttendanceRepository(store)),
      donationsFor: (token) =>
        new DonationsService(
          new FakeDonationsRepository(store, token.replace('token-', '') as AppRole),
        ),
      settingsFor: () => new SettingsService(new FakeSettingsRepository(store)),
    },
  );
  return { app, store, authAdmin };
}
