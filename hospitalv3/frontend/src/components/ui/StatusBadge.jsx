const STATUS_THEME = {
  vigente: "success",
  active: "success",
  activo: "success",
  completed: "success",
  cumplido: "success",
  closed: "success",
  open: "warning",
  pending: "warning",
  in_progress: "info",
  en_revision: "warning",
  draft: "muted",
  borrador: "muted",
  obsoleto: "danger",
  critical: "danger",
  high: "danger",
  medio: "warning",
};

const LABEL_MAP = {
  in_progress: "En curso",
  pending: "Pendiente",
  completed: "Completado",
  open: "Abierto",
  closed: "Cerrado",
  en_revision: "En revision",
  borrador: "Borrador",
};

export default function StatusBadge({ status }) {
  const raw = String(status || "").trim();
  const key = raw.toLowerCase();
  const tone = STATUS_THEME[key] || "neutral";
  const label = LABEL_MAP[key] || raw || "Sin estado";
  return <span className={`status-badge status-${tone}`}>{label}</span>;
}
