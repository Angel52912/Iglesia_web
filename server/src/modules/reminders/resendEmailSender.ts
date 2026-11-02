import { HttpError } from '../../errors.js';
import type { EmailMessage, EmailSender } from './reminders.types.js';

const RESEND_URL = 'https://api.resend.com/emails';

// Cliente mínimo de la API de Resend con fetch (sin dependencia nueva).
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly doFetch: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await this.doFetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Resend respondió ${String(response.status)}`);
    }
  }
}

// Sin RESEND_API_KEY el envío queda desactivado y el endpoint responde 503.
export class UnconfiguredEmailSender implements EmailSender {
  send(): Promise<void> {
    return Promise.reject(new HttpError(503, 'El envío de correos no está configurado'));
  }
}
