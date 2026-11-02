export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

// Puerto de salida: la implementación real usa una API externa (Resend).
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface ReminderRecipient {
  fullName: string;
  email: string | null;
}

export interface ReminderEvent {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  location: string | null;
  status: 'scheduled' | 'cancelled';
  responsibles: ReminderRecipient[];
}

// Lectura con el JWT del usuario (RLS aplica).
export interface RemindersRepository {
  findEvent(eventId: string): Promise<ReminderEvent | null>;
}

export interface ReminderResult {
  sent: number;
  // Responsables sin correo registrado.
  withoutEmail: number;
  // Envíos que la API de correo rechazó.
  failed: number;
}
