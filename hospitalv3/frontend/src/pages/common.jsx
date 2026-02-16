/* Utilidades y constantes compartidas entre páginas */
import { formatNumber } from "../utils/formatters";

export function extractError(error, fallback) {
  if (!error?.response) {
    return "No se pudo conectar con el servidor. Comprueba que el backend esté en marcha (puerto 8000).";
  }
  const status = error.response?.status;
  if (status === 403) return "No tienes permiso para acceder a este recurso.";
  if (status === 404) return "Recurso no encontrado.";
  const d = error.response?.data;
  return d?.error || d?.detail || (typeof d?.detail === "string" ? d.detail : null) || fallback;
}

export function ProgressRow({ label, value, total }) {
  const safeTotal = Number(total || 0);
  const safeValue = Number(value || 0);
  const ratio = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0;
  return (
    <div className="progress-row">
      <div>
        <strong>{label}</strong>
        <small>{formatNumber(safeValue)} ({ratio}%)</small>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

export function EmptyHint({ text }) {
  return <div className="empty-hint">{text}</div>;
}

export const CHART_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];
export const CHART_BG = CHART_COLORS.map((c) => c + "cc");

export const PROCESS_CATEGORY_LABELS = {
  direccionamiento_estrategico: "Direccionamiento Estratégico",
  proceso_misional: "Procesos Misionales",
  proceso_apoyo: "Procesos de Apoyo",
  proceso_evaluacion: "Procesos de Evaluación y Control",
};

export const PROCESS_CATEGORY_ORDER = [
  "direccionamiento_estrategico",
  "proceso_misional",
  "proceso_apoyo",
  "proceso_evaluacion",
];

export const PROCESS_DETAIL_TABS = [
  { id: "caracterizacion", label: "Caracterización" },
  { id: "indicadores", label: "Indicadores" },
  { id: "documentos", label: "Documentos" },
  { id: "riesgos", label: "Riesgos" },
  { id: "mejora", label: "Plan de mejora" },
  { id: "eventos", label: "Eventos adversos" },
  { id: "comites", label: "Comités" },
  { id: "salud", label: "Salud" },
];
