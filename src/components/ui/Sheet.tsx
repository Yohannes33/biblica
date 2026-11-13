import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Native <dialog> rendered as a bottom sheet on phones and a centred panel on
 * wider screens. showModal() gives focus trapping, Escape-to-close and an inert
 * background. Every close path goes through dialog.close() while the content is
 * still mounted, so the browser can return focus to whatever opened the sheet.
 */
export const Sheet: React.FC<SheetProps> = ({ open, onClose, title, subtitle, headerAction, children }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={(e) => {
        pressStartedOnBackdrop.current = e.target === ref.current;
      }}
      onClick={(e) => {
        // The <dialog> itself is only the target when the backdrop was hit.
        // Require the press to start there too, so a text selection dragged
        // out of a field doesn't dismiss the sheet.
        if (e.target === ref.current && pressStartedOnBackdrop.current) close();
      }}
    >
      <div className="flex justify-center pt-[5px] sm:hidden" aria-hidden="true">
        <div className="h-[5px] w-9 rounded-full bg-ink-3/40" />
      </div>
      <header className="flex items-start justify-between gap-3 px-5 pt-3 pb-3 sm:pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-2xl font-extrabold tracking-tight">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          <button type="button" onClick={close} className="icon-btn rounded-full" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>
      {/* flex-auto (content basis) + min-h-0, not flex-1's 0% basis, which WebKit can collapse to zero */}
      <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+var(--safe-bottom))]">
        {children}
      </div>
    </dialog>
  );
};
