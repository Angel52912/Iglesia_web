import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

interface FormPanelProps {
  // Texto del botón que abre el formulario, por ejemplo "Nuevo miembro".
  label: string;
  // Fuerza a abrirlo (por ejemplo, al pulsar "Editar" en una tarjeta).
  forceOpen?: boolean;
  children: ReactNode;
}

// Envuelve un formulario de alta para que la lista quede a la vista y el formulario
// aparezca solo al pulsar "+ Nuevo…". El contenido siempre está montado: cerrarlo
// solo lo oculta con CSS, así no se pierde lo escrito ni cambia la lógica del formulario.
export function FormPanel({
  label,
  forceOpen = false,
  children,
}: FormPanelProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = open || forceOpen;

  // Al editar desde una tarjeta, se lleva la vista al formulario.
  useEffect(() => {
    if (!forceOpen) return;
    const panel = panelRef.current;
    if (panel && 'scrollIntoView' in panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [forceOpen]);

  return (
    <div ref={panelRef} className={isOpen ? 'form-panel form-panel--open' : 'form-panel'}>
      {!forceOpen && (
        <button
          type="button"
          className={isOpen ? 'form-panel__toggle button--secondary' : 'form-panel__toggle'}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          <Icon name={isOpen ? 'close' : 'plus'} size={18} />
          {isOpen ? 'Cerrar formulario' : label}
        </button>
      )}
      <div id={bodyId} className="form-panel__body">
        {children}
      </div>
    </div>
  );
}
