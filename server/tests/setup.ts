import { vi } from 'vitest';

// "Hoy" fijo: las pruebas de eventos usan fechas futuras respecto a este día y no caducan.
// Solo se simula Date; los temporizadores reales siguen funcionando.
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T12:00:00-06:00') });
