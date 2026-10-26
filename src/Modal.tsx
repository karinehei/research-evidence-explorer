import { useId, useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';

/**
 * Native modal dialog. Visibility uses showModal()/close() so the browser
 * traps focus, restores it on close, and treats Escape as cancel.
 * Do not pass an open attribute and do not add a second focus trap.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  className = '',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
    return () => {
      if (node.open) node.close();
    };
  }, [open]);

  function restoreFocusIfLost() {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
      document.getElementById('workspace')?.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      className={className ? `modal ${className}` : 'modal'}
      aria-labelledby={titleId}
      onCancel={(event: SyntheticEvent<HTMLDialogElement, Event>) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onClose={restoreFocusIfLost}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Sulje" onClick={() => onCloseRef.current()}>×</button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
