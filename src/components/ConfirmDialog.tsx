import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info } from 'lucide-react';
import { easeOut } from './motion';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger' | 'warn';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, busy, onCancel]);

  const Icon = tone === 'danger' || tone === 'warn' ? AlertTriangle : Info;
  const iconColor =
    tone === 'danger'
      ? 'text-[var(--color-danger)]'
      : tone === 'warn'
        ? 'text-[var(--color-warn)]'
        : 'text-[var(--color-live)]';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onCancel()}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="relative w-full max-w-md lattice-panel rounded-2xl p-5 shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: easeOut }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl border border-[var(--color-line)] bg-[var(--lattice-hover)] flex items-center justify-center shrink-0 ${iconColor}`}
              >
                <Icon size={16} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="text-[16px] font-semibold text-[var(--color-text)]">
                  {title}
                </h2>
                <p id={descId} className="text-[13px] text-[var(--color-muted)] mt-1.5 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="lattice-btn lattice-btn-ghost text-[13px]"
                disabled={busy}
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`lattice-btn text-[13px] ${
                  tone === 'danger' ? 'dealer-btn-danger' : 'lattice-btn-primary'
                }`}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialogHost({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
