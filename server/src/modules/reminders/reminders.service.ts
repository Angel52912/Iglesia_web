import { HttpError } from '../../errors.js';
import type {
  EmailSender,
  ReminderEvent,
  ReminderResult,
  RemindersRepository,
} from './reminders.types.js';

function buildText(event: ReminderEvent, fullName: string): string {
  const place = event.location ? `\nLugar: ${event.location}` : '';
  return [
    `Hola ${fullName},`,
    '',
    `Te recordamos que eres responsable del evento "${event.title}".`,
    `Fecha: ${event.eventDate}\nHora: ${event.startTime}${place}`,
  ].join('\n');
}

export class RemindersService {
  constructor(
    private readonly events: RemindersRepository,
    private readonly sender: EmailSender,
  ) {}

  // Envía un correo por responsable (no se exponen las direcciones entre sí).
  async remindResponsibles(eventId: string): Promise<ReminderResult> {
    const event = await this.events.findEvent(eventId);
    if (!event) {
      throw new HttpError(404, 'Evento no encontrado');
    }
    if (event.status === 'cancelled') {
      throw new HttpError(409, 'El evento está cancelado');
    }

    const withEmail = event.responsibles.filter((r) => r.email !== null && r.email !== '');
    const outcomes = await Promise.allSettled(
      withEmail.map((r) =>
        this.sender.send({
          to: r.email ?? '',
          subject: `Recordatorio: ${event.title}`,
          text: buildText(event, r.fullName),
        }),
      ),
    );
    // Si la configuración falta (503) se informa tal cual en vez de contar fallos.
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected' && outcome.reason instanceof HttpError) {
        throw outcome.reason;
      }
    }
    const failed = outcomes.filter((o) => o.status === 'rejected').length;
    return {
      sent: withEmail.length - failed,
      withoutEmail: event.responsibles.length - withEmail.length,
      failed,
    };
  }
}
