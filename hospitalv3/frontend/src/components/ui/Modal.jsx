import { createPortal } from "react-dom";

export default function Modal({ open, title, onClose, children, size = "md" }) {
  if (!open) return null;
  const content = (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className={`modal-card modal-${size}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}
