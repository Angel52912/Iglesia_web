import { HttpError } from '../../errors.js';
import type {
  CreateMinistryInput,
  MinistriesRepository,
  Ministry,
  MinistryDetail,
  UpdateMinistryInput,
} from './ministries.types.js';

function found(ministry: MinistryDetail | null): MinistryDetail {
  if (!ministry) {
    throw new HttpError(404, 'Ministerio no encontrado');
  }
  return ministry;
}

export class MinistriesService {
  constructor(private readonly ministries: MinistriesRepository) {}

  list(): Promise<Ministry[]> {
    return this.ministries.list();
  }

  async get(id: string): Promise<MinistryDetail> {
    return found(await this.ministries.findById(id));
  }

  create(input: CreateMinistryInput): Promise<MinistryDetail> {
    return this.ministries.create(input);
  }

  // Los ministerios no se eliminan: desactivar = update({ active: false }).
  async update(id: string, patch: UpdateMinistryInput): Promise<MinistryDetail> {
    return found(await this.ministries.update(id, patch));
  }

  async setCoordinators(id: string, memberIds: string[]): Promise<MinistryDetail> {
    return found(await this.ministries.setCoordinators(id, memberIds));
  }

  async setMembers(id: string, memberIds: string[]): Promise<MinistryDetail> {
    return found(await this.ministries.setMembers(id, memberIds));
  }
}
