import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import {
  REPORT_OPTIONS,
  downloadReport,
  fetchReport,
  type MemberStatus,
  type ReportCell,
  type ReportColumn,
  type ReportFormat,
  type ReportKey,
  type ReportParams,
  type ReportTable,
} from './api';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  return `${today().slice(0, 7)}-01`;
}

function formatCell(cell: ReportCell, column: ReportColumn): string {
  if (cell === null) return '—';
  if (typeof cell === 'string') return cell;
  if (column.kind === 'money') return money.format(cell);
  if (column.kind === 'percent') return `${String(cell)} %`;
  return String(cell);
}

export function ReportsPage(): React.JSX.Element {
  const { user } = useAuth();
  const options = REPORT_OPTIONS.filter((option) => user && option.roles.includes(user.role));
  const [key, setKey] = useState<ReportKey>(options[0]?.key ?? 'members');
  const [params, setParams] = useState<ReportParams>({
    from: monthStart(),
    to: today(),
    status: 'all',
  });
  const [state, setState] = useState<LoadState>('idle');
  const [report, setReport] = useState<ReportTable | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const selected = options.find((option) => option.key === key);

  const changeReport = (next: ReportKey): void => {
    setKey(next);
    setReport(null);
    setState('idle');
  };

  const generate = (event: SyntheticEvent): void => {
    event.preventDefault();
    setState('loading');
    setError('');
    fetchReport(key, params)
      .then((result) => {
        setReport(result);
        setState('ready');
      })
      .catch((caught: unknown) => {
        setError(errorText(caught));
        setState('error');
      });
  };

  const exportAs = (format: ReportFormat): void => {
    setExporting(true);
    setError('');
    downloadReport(key, params, format)
      .catch((caught: unknown) => {
        setError(errorText(caught));
      })
      .finally(() => {
        setExporting(false);
      });
  };

  if (options.length === 0) {
    return (
      <main className="page">
        <h1>Reportes</h1>
        <p className="error">Tu rol no tiene reportes disponibles.</p>
        <Link to="/">Volver</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Reportes</h1>

      <form className="form" onSubmit={generate}>
        <label>
          Reporte
          <select
            value={key}
            onChange={(event) => {
              changeReport(event.target.value as ReportKey);
            }}
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {key === 'members' && (
          <label>
            Estado
            <select
              value={params.status}
              onChange={(event) => {
                setParams({ ...params, status: event.target.value as MemberStatus });
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        )}

        {selected?.needsPeriod && (
          <>
            <label>
              Desde
              <input
                type="date"
                required
                value={params.from}
                onChange={(event) => {
                  setParams({ ...params, from: event.target.value });
                }}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                required
                value={params.to}
                onChange={(event) => {
                  setParams({ ...params, to: event.target.value });
                }}
              />
            </label>
          </>
        )}

        <button type="submit" disabled={state === 'loading'}>
          Generar reporte
        </button>
      </form>

      {state === 'loading' && <p className="status">Generando reporte…</p>}
      {error && <p className="error">{error}</p>}

      {state === 'ready' && report && (
        <section aria-label="Resultado del reporte">
          <h2>{report.title}</h2>
          {report.subtitle && <p>{report.subtitle}</p>}
          <ul className="cards">
            {report.summary.map((line) => (
              <li key={line.label} className="card">
                <span>{line.label}</span>
                <strong>{line.value}</strong>
              </li>
            ))}
          </ul>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {report.columns.map((column) => (
                    <th key={column.header} scope="col">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {report.columns.map((column, columnIndex) => (
                      <td key={column.header}>{formatCell(row[columnIndex] ?? null, column)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.rows.length === 0 && <p className="status">Sin registros para este reporte.</p>}

          <div className="actions">
            <button
              type="button"
              disabled={exporting}
              onClick={() => {
                exportAs('pdf');
              }}
            >
              Exportar a PDF
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => {
                exportAs('xlsx');
              }}
            >
              Exportar a Excel
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
