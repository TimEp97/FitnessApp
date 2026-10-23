import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import s from './Sheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Modales Blatt von unten. Escape und Tipp auf den Hintergrund schließen. */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('button, [href], input, select, textarea');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, select, textarea')];
        if (!items.length) return;
        const a = items[0];
        const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={s.backdrop} onClick={onClose}>
      <div ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <h2 className="h2">{title}</h2>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Schließen">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export function ConfirmSheet({ open, title, message, confirmLabel, danger, onConfirm, onClose, children }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="stack">
        <div className="muted">{message}</div>
        {children}
        <button type="button" className={`btn btnBlock btnLg ${danger ? 'btnDanger' : 'btnPrimary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btnBlock btnGhost" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </Sheet>
  );
}

interface DoubleConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** zweite Rückfrage, erscheint nach der ersten Bestätigung */
  secondTitle: string;
  secondMessage: ReactNode;
  secondConfirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/** Löschen mit zwei Rückfragen nacheinander. Abbrechen oder Schließen beginnt beim nächsten Mal wieder bei der ersten. */
export function DoubleConfirmSheet({ open, title, message, confirmLabel, secondTitle, secondMessage, secondConfirmLabel, onConfirm, onClose }: DoubleConfirmProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

  if (step === 1) {
    return <ConfirmSheet open={open} title={title} message={message} confirmLabel={confirmLabel} danger onClose={onClose} onConfirm={() => setStep(2)} />;
  }
  // Abbrechen steht oben, damit ein doppelter Tipp auf dieselbe Stelle nicht beide Rückfragen bestätigt
  return (
    <Sheet key="second" open={open} onClose={onClose} title={secondTitle}>
      <div className="stack">
        <div className="muted">{secondMessage}</div>
        <button type="button" className="btn btnBlock btnLg" data-autofocus onClick={onClose}>
          Abbrechen
        </button>
        <button
          type="button"
          className="btn btnBlock btnDanger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Wird gelöscht …' : secondConfirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
