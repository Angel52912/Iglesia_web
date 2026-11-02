import { registerSW } from 'virtual:pwa-register';

/** Registra el service worker (solo en producción; en desarrollo el plugin no lo genera). */
export function registerServiceWorker(): void {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
  }
}
