import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROLE_LABELS } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { Icon } from '../components/Icon';
import { getChurchInfo, type ChurchInfo } from '../features/church/api';
import type { ChurchContext } from '../features/church/useChurch';
import { navItemsFor } from './navigation';
import { useTheme } from './theme';

// En celular la barra inferior muestra estas primeras opciones; el resto va en "Más".
const BOTTOM_SLOTS = 4;

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'navlink navlink--active' : 'navlink';

// Estructura común de las pantallas con sesión: encabezado fijo, menú lateral
// (computadora) o barra inferior (celular y tablet), y el contenido de la ruta.
export function AppLayout(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [church, setChurch] = useState<ChurchInfo | null>(null);
  const [churchKey, setChurchKey] = useState(0);
  const refreshChurch = useCallback((): void => {
    setChurchKey((key) => key + 1);
  }, []);
  const userId = user?.id;

  // Nombre, logotipo, dirección y correo de la iglesia; si falla, el encabezado usa el título genérico.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getChurchInfo()
      .then((info) => {
        if (!cancelled) setChurch(info);
      })
      .catch(() => {
        if (!cancelled) setChurch(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, churchKey]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  if (!user) return <Outlet />;

  const items = navItemsFor(user.role);
  const hasMore = items.length > BOTTOM_SLOTS + 1;
  const bottomItems = hasMore ? items.slice(0, BOTTOM_SLOTS) : items;
  const moreItems = hasMore ? items.slice(BOTTOM_SLOTS) : [];
  const moreActive = moreItems.some((item) => item.to === location.pathname);

  const outletContext: ChurchContext = { church, refreshChurch };

  const handleSignOut = (): void => {
    void signOut();
  };

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Ir al inicio">
          <span className="brand__mark">
            {church?.logoUrl ? (
              <img src={church.logoUrl} alt="" className="brand__logo" />
            ) : (
              <Icon name="church" size={22} />
            )}
          </span>
          <span className="brand__name">{church?.name ?? 'Gestión de Iglesia'}</span>
        </NavLink>
        <div className="topbar__user">
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Modo oscuro"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={isDark ? 'theme-switch theme-switch--dark' : 'theme-switch'}
            onClick={toggleTheme}
          >
            <span className="theme-switch__knob">
              <Icon name={isDark ? 'moon' : 'sun'} size={15} />
            </span>
          </button>
          <span className="avatar" aria-hidden="true">
            {initials(user.fullName)}
          </span>
          <span className="topbar__who">
            <strong>{user.fullName}</strong>
            <span className="topbar__role">{ROLE_LABELS[user.role]}</span>
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={handleSignOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <nav className="sidebar" aria-label="Menú principal">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shell__content">
        {/* La key reinicia la animación de entrada (fade + slide up) en cada sección. */}
        <div key={location.pathname} className="route-enter">
          <Outlet context={outletContext} />
        </div>
      </div>

      <nav className="bottombar" aria-label="Menú inferior">
        {bottomItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {hasMore && (
          <button
            type="button"
            className={moreActive || moreOpen ? 'navlink navlink--active' : 'navlink'}
            aria-expanded={moreOpen}
            aria-controls="more-sheet"
            onClick={() => {
              setMoreOpen((open) => !open);
            }}
          >
            <Icon name="more" size={22} />
            <span>Más</span>
          </button>
        )}
      </nav>

      {hasMore && moreOpen && (
        <div
          className="sheet-backdrop"
          onClick={() => {
            setMoreOpen(false);
          }}
        >
          <div
            id="more-sheet"
            className="sheet"
            role="dialog"
            aria-label="Más opciones"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="sheet__header">
              <strong>Más opciones</strong>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => {
                  setMoreOpen(false);
                }}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="sheet__grid">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={() => {
                    setMoreOpen(false);
                  }}
                >
                  <Icon name={item.icon} size={22} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
