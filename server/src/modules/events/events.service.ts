import { HttpError } from '../../errors.js';
import type {
  ChurchEvent,
  CreateEventInput,
  EventFilters,
  EventsRepository,
  UpdateEventInput,
} from './events.types.js';

export class EventsService {
  constructor(private readonly events: EventsRepository) {}

  list(filters: EventFilters): Promise<ChurchEvent[]> {
    return this.events.list(filters);
  }

  create(input: CreateEventInput): Promise<ChurchEvent> {
    return this.events.create(input);
  }

  // Los eventos no se eliminan: cancelar = update({ status: 'cancelled' }).
  async update(id: string, patch: UpdateEventInput): Promise<ChurchEvent> {
    const updated = await this.events.update(id, patch);
    if (!updated) {
      throw new HttpError(404, 'Evento no encontrado');
    }
    return updated;
  }
}
