import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Native modal dialog: focus trap, Escape, backdrop via showModal(). */
export function Modal({
  open,
  title,
  onClose,
  children,
  className = '',
  initialFocus = 'close',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  initialFocus?: 'close' | 'primary';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
      const target =
        initialFocus === 'primary'
          ? bodyRef.current?.querySelector<HTMLElement>('button.primary, button[type=submit]')
          : closeRef.current;
      (target || closeRef.current)?.focus();
    } else if (node.open) {
      node.close();
    }
  }, [open, initialFocus]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`.trim()}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" ref={closeRef} aria-label="Sulje" onClick={onClose}>
          ×
        </button>
      </div>
      <div ref={bodyRef}>{children}</div>
    </dialog>
  );
}
