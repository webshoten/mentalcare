import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function ConfirmDialog({ open, onClose, children }: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
