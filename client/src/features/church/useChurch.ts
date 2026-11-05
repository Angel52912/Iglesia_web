import { useOutletContext } from 'react-router-dom';
import type { ChurchInfo } from './api';

// Lo entrega AppLayout a las pantallas con sesión (Outlet context).
export interface ChurchContext {
  church: ChurchInfo | null;
  refreshChurch: () => void;
}

const EMPTY: ChurchContext = {
  church: null,
  refreshChurch: () => {
    /* sin AppLayout (p. ej. pruebas de una pantalla suelta) no hay nada que refrescar */
  },
};

export function useChurch(): ChurchContext {
  return useOutletContext<ChurchContext | null>() ?? EMPTY;
}
