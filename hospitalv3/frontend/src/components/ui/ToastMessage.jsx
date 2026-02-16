export default function ToastMessage({ type = "info", message, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="toast-close">
        x
      </button>
    </div>
  );
}
