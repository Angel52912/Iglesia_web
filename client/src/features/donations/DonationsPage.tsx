import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import {
  DONATION_METHODS,
  METHOD_LABELS,
  createDonation,
  deleteDonation,
  getDonationSummary,
  listDonations,
  listDonors,
  updateDonation,
  type Donation,
  type DonationMethod,
  type DonationSummary,
  type Donor,
  type SummaryGroup,
} from './api';

type LoadState = 'loading' | 'ready' | 'error';

interface DonationForm {
  memberId: string;
  donatedOn: string;
  amount: string;
  concept: string;
  method: DonationMethod;
}

const ANONYMOUS = '';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): DonationForm {
  return { memberId: ANONYMOUS, donatedOn: today(), amount: '', concept: '', method: 'cash' };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function methodLabel(key: string): string {
  return key in METHOD_LABELS ? METHOD_LABELS[key as DonationMethod] : key;
}

function GroupList({ title, groups }: { title: string; groups: SummaryGroup[] }): React.JSX.Element {
  return (
    <>
      <h3>{title}</h3>
      {groups.length === 0 && <p className="status">Sin donaciones en este mes.</p>}
      <ul className="cards">
        {groups.map((group) => (
          <li key={group.key} className="card">
            <strong>{title === 'Por método' ? methodLabel(group.key) : group.key}</strong>
            <span>{money.format(group.total)}</span>
            <span>
              {group.donations} {group.donations === 1 ? 'aportación' : 'aportaciones'}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function DonationsPage(): React.JSX.Element {
  const { user } = useAuth();
  // El pastor solo ve el resumen; el servidor también lo exige (403).
  const canManage = user?.role === 'admin' || user?.role === 'treasurer';

  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DonationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const nextSummary = await getDonationSummary(month);
        const list = canManage ? await listDonations(month) : null;
        if (cancelled) return;
        setSummary(nextSummary);
        setDonations(list?.donations ?? []);
        setTotal(list?.total ?? 0);
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        setActionError(errorText(error));
        setLoadState('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [month, canManage, reloadKey]);

  useEffect(() => {
    if (!canManage) return;
    listDonors()
      .then(setDonors)
      .catch((error: unknown) => {
        setActionError(errorText(error));
      });
  }, [canManage]);

  function setField<K extends keyof DonationForm>(field: K, value: DonationForm[K]): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(donation: Donation): void {
    setEditingId(donation.id);
    setForm({
      memberId: donation.memberId ?? ANONYMOUS,
      donatedOn: donation.donatedOn,
      amount: String(donation.amount),
      concept: donation.concept,
      method: donation.method,
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionError(null);
    setSaving(true);
    try {
      const payload = {
        memberId: form.memberId === ANONYMOUS ? null : form.memberId,
        donatedOn: form.donatedOn,
        amount: Number(form.amount),
        concept: form.concept,
        method: form.method,
      };
      if (editingId) {
        await updateDonation(editingId, payload);
      } else {
        await createDonation(payload);
      }
      cancelEdit();
      reload();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(donation: Donation): Promise<void> {
    if (!window.confirm('¿Eliminar esta aportación? No se puede deshacer.')) return;
    setActionError(null);
    try {
      await deleteDonation(donation.id);
      if (editingId === donation.id) cancelEdit();
      reload();
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  return (
    <main className="page">
      <p>
        <Link to="/">← Inicio</Link>
      </p>
      <h1>Donaciones</h1>

      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}

      <div className="form">
        <label>
          Mes
          <input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
            }}
          />
        </label>
      </div>

      {loadState === 'loading' && <p className="status">Cargando…</p>}

      {summary && (
        <section aria-label="Resumen mensual">
          <h2>Resumen del mes</h2>
          <p>
            <strong>Total: {money.format(summary.total)}</strong> ({summary.donations}{' '}
            {summary.donations === 1 ? 'aportación' : 'aportaciones'})
          </p>
          <GroupList title="Por método" groups={summary.byMethod} />
          {canManage && summary.byConcept && <GroupList title="Por concepto" groups={summary.byConcept} />}
        </section>
      )}

      {canManage && (
        <form
          className="form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <h2>{editingId ? 'Editar aportación' : 'Registrar aportación'}</h2>
          <label>
            Donante
            <select
              value={form.memberId}
              onChange={(event) => {
                setField('memberId', event.target.value);
              }}
            >
              <option value={ANONYMOUS}>Anónimo</option>
              {donors.map((donor) => (
                <option key={donor.id} value={donor.id}>
                  {donor.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha
            <input
              required
              type="date"
              value={form.donatedOn}
              onChange={(event) => {
                setField('donatedOn', event.target.value);
              }}
            />
          </label>
          <label>
            Monto
            <input
              required
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => {
                setField('amount', event.target.value);
              }}
            />
          </label>
          <label>
            Concepto
            <input
              required
              maxLength={120}
              value={form.concept}
              onChange={(event) => {
                setField('concept', event.target.value);
              }}
            />
          </label>
          <label>
            Método de recepción
            <select
              value={form.method}
              onChange={(event) => {
                setField('method', event.target.value as DonationMethod);
              }}
            >
              {DONATION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar aportación'}
          </button>
          {editingId && (
            <button type="button" className="button--secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </form>
      )}

      {canManage && loadState === 'ready' && (
        <section aria-label="Aportaciones del mes">
          <h2>Aportaciones ({money.format(total)})</h2>
          {donations.length === 0 && <p className="status">No hay aportaciones en este mes.</p>}
          <ul className="cards">
            {donations.map((donation) => (
              <li key={donation.id} className="card">
                <strong>{money.format(donation.amount)}</strong>
                <span>{donation.concept}</span>
                <span>
                  {donation.donatedOn} · {METHOD_LABELS[donation.method]}
                </span>
                <span>{donation.donorName ?? 'Anónimo'}</span>
                <button
                  type="button"
                  className="button--secondary"
                  onClick={() => {
                    startEdit(donation);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDelete(donation);
                  }}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
