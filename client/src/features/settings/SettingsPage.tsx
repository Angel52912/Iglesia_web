import { useCallback, useEffect, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  createSchedule,
  deleteSchedule,
  getSettings,
  removeLogo,
  updateSettings,
  uploadLogo,
  type ChurchSettings,
  type SchedulePayload,
  type SettingsPayload,
} from './api';

type LoadState = 'loading' | 'ready' | 'error';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MAX_LOGO_BYTES = 1024 * 1024;
const EMPTY_SCHEDULE: SchedulePayload = { label: '', weekday: 0, startTime: '10:00' };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function toForm(settings: ChurchSettings): SettingsPayload {
  return {
    name: settings.name,
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
  };
}

// Solo el administrador entra (ProtectedRoute); el servidor también lo exige (403).
export function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [form, setForm] = useState<SettingsPayload>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [schedule, setSchedule] = useState<SchedulePayload>(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((next: ChurchSettings): void => {
    setSettings(next);
    setForm(toForm(next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((loaded) => {
        if (cancelled) return;
        apply(loaded);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setActionError(errorText(error));
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Ejecuta una acción mostrando el error o el aviso de éxito.
  async function run(action: () => Promise<void>, success: string): Promise<void> {
    setActionError(null);
    setMessage(null);
    setSaving(true);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  function setField(field: keyof SettingsPayload, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSave(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    void run(async () => {
      apply(await updateSettings(form));
    }, 'Datos guardados');
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setMessage(null);
      setActionError('El logotipo no puede pesar más de 1 MB');
      return;
    }
    void run(async () => {
      apply(await uploadLogo(file));
    }, 'Logotipo actualizado');
  }

  function handleRemoveLogo(): void {
    void run(async () => {
      apply(await removeLogo());
    }, 'Logotipo eliminado');
  }

  function handleAddSchedule(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    void run(async () => {
      await createSchedule(schedule);
      apply(await getSettings());
      setSchedule(EMPTY_SCHEDULE);
    }, 'Horario agregado');
  }

  function handleDeleteSchedule(id: string): void {
    void run(async () => {
      await deleteSchedule(id);
      apply(await getSettings());
    }, 'Horario eliminado');
  }

  return (
    <main className="page">
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Configuración de la iglesia</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {loadState === 'loading' && <p className="status">Cargando…</p>}

      {loadState === 'ready' && settings && (
        <>
          <form className="form" onSubmit={handleSave}>
            <h2>Datos institucionales</h2>
            <label>
              Nombre de la iglesia
              <input
                required
                value={form.name}
                onChange={(event) => {
                  setField('name', event.target.value);
                }}
              />
            </label>
            <label>
              Dirección
              <input
                value={form.address}
                onChange={(event) => {
                  setField('address', event.target.value);
                }}
              />
            </label>
            <label>
              Teléfono
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => {
                  setField('phone', event.target.value);
                }}
              />
            </label>
            <label>
              Correo de contacto
              <input
                type="email"
                value={form.email}
                onChange={(event) => {
                  setField('email', event.target.value);
                }}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar datos'}
            </button>
          </form>

          <section className="form">
            <h2>Logotipo</h2>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logotipo de la iglesia" className="logo" />
            ) : (
              <p className="status">Sin logotipo.</p>
            )}
            <label>
              Subir imagen (PNG, JPEG o WebP, máx. 1 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={saving}
                onChange={handleLogoChange}
              />
            </label>
            {settings.logoUrl && (
              <button
                type="button"
                className="button--secondary"
                disabled={saving}
                onClick={handleRemoveLogo}
              >
                Quitar logotipo
              </button>
            )}
          </section>

          <section>
            <h2>Horarios de reunión</h2>
            {settings.schedules.length === 0 && (
              <p className="status">Aún no hay horarios registrados.</p>
            )}
            <ul className="cards">
              {settings.schedules.map((item) => (
                <li key={item.id} className="card">
                  <strong>{item.label}</strong>
                  <span>
                    {WEEKDAYS[item.weekday] ?? 'Día'} a las {item.startTime}
                  </span>
                  <button
                    type="button"
                    className="button--secondary"
                    disabled={saving}
                    onClick={() => {
                      handleDeleteSchedule(item.id);
                    }}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>

            <form className="form" onSubmit={handleAddSchedule}>
              <h3>Nuevo horario</h3>
              <label>
                Descripción
                <input
                  required
                  value={schedule.label}
                  onChange={(event) => {
                    setSchedule((current) => ({ ...current, label: event.target.value }));
                  }}
                />
              </label>
              <label>
                Día
                <select
                  value={schedule.weekday}
                  onChange={(event) => {
                    setSchedule((current) => ({ ...current, weekday: Number(event.target.value) }));
                  }}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hora
                <input
                  required
                  type="time"
                  value={schedule.startTime}
                  onChange={(event) => {
                    setSchedule((current) => ({ ...current, startTime: event.target.value }));
                  }}
                />
              </label>
              <button type="submit" disabled={saving}>
                Agregar horario
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
