/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Download,
  Eye,
  FileArchive,
  FileText,
  FolderKanban,
  LifeBuoy,
  Lock,
  Mail,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  TrendingUp,
  Timer,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import api from "../api";
import { useAuth } from "../auth";
import CrudResourcePage from "../components/CrudResourcePage";
import DataTable from "../components/ui/DataTable";
import KpiCard from "../components/ui/KpiCard";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import ToastMessage from "../components/ui/ToastMessage";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatNumber,
  normalizeCollection,
} from "../utils/formatters";
import { extractError, EmptyHint, ProgressRow, CHART_COLORS, CHART_BG, PROCESS_CATEGORY_LABELS, PROCESS_DETAIL_TABS, PROCESS_CATEGORY_ORDER } from "./common";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, ChartTitle, ChartTooltip, ChartLegend, Filler);

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState({});
  const [risks, setRisks] = useState([]);
  const [allRisks, setAllRisks] = useState([]);
  const [actions, setActions] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/charts"),
      api.get("/risks/?status=open"),
      api.get("/risks/"),
      api.get("/actions/?status=open"),
      api.get("/commitments/?status=pending"),
      api.get("/committee-sessions/").catch(() => ({ data: [] })),
    ])
      .then(([summaryRes, chartsRes, risksRes, allRisksRes, actionsRes, commitmentsRes, sessionsRes]) => {
        if (!alive) return;
        setSummary(summaryRes.data || {});
        setCharts(chartsRes.data || {});
        setRisks(normalizeCollection(risksRes.data).slice(0, 5));
        setAllRisks(normalizeCollection(allRisksRes.data));
        setActions(normalizeCollection(actionsRes.data).slice(0, 5));
        setCommitments(normalizeCollection(commitmentsRes.data).slice(0, 5));
        setSessions(normalizeCollection(sessionsRes.data).slice(0, 5));
      })
      .catch((err) => setError(extractError(err, "No se pudo cargar el dashboard.")))
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  /* ── Datos para gráficos ── */
  const risksByProcessData = useMemo(() => {
    const byProcess = {};
    allRisks.forEach(r => { const p = r.process_name || r.processName || "Sin proceso"; byProcess[p] = (byProcess[p] || 0) + 1; });
    const labels = Object.keys(byProcess).slice(0, 8);
    return { labels, datasets: [{ label: "Riesgos", data: labels.map(l => byProcess[l]), backgroundColor: CHART_BG.slice(0, labels.length), borderColor: CHART_COLORS.slice(0, labels.length), borderWidth: 1 }] };
  }, [allRisks]);

  const eventsByMonthData = useMemo(() => {
    const evm = charts?.eventsByMonth || [];
    const labels = evm.map(e => e.month || e.label || "");
    return { labels, datasets: [{ label: "Eventos adversos", data: evm.map(e => e.count || 0), backgroundColor: "#ef4444cc", borderColor: "#ef4444", borderWidth: 1 }] };
  }, [charts]);

  const actionsByStatusData = useMemo(() => {
    const abs = charts?.actionsByStatus || [];
    return { labels: abs.map(a => a.status || ""), datasets: [{ data: abs.map(a => a.count || 0), backgroundColor: ["#10b981cc", "#f59e0bcc", "#ef4444cc", "#6366f1cc"], borderWidth: 0 }] };
  }, [charts]);

  const documentsByProcessData = useMemo(() => {
    const dbp = charts?.documentsByProcess || [];
    const labels = (dbp.map(d => d.process__name || "Sin proceso"));
    return {
      labels,
      datasets: [{ label: "Documentos", data: dbp.map(d => d.count || 0), backgroundColor: CHART_BG.slice(0, labels.length), borderColor: CHART_COLORS.slice(0, labels.length), borderWidth: 1 }],
    };
  }, [charts]);

  const indicatorSemaphore = useMemo(() => {
    const sem = charts?.indicatorSemaphore || summary?.indicators || {};
    const verde = sem.green || sem.meets || 0;
    const amarillo = sem.yellow || sem.atRisk || 0;
    const rojo = sem.red || sem.critical || 0;
    return { labels: ["Cumple", "En riesgo", "Critico"], datasets: [{ data: [verde, amarillo, rojo], backgroundColor: ["#10b981", "#f59e0b", "#ef4444"], borderWidth: 0 }] };
  }, [charts, summary]);

  /* ── Matriz de riesgos 5x5 ── */
  const riskMatrix = useMemo(() => {
    const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
    const sevMap = { low: 0, medium: 1, high: 2, critical: 3, "very_high": 4, "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
    const probMap = { low: 0, medium: 1, high: 2, critical: 3, "very_high": 4, "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
    allRisks.forEach(r => {
      const s = sevMap[String(r.severity || "").toLowerCase()] ?? 1;
      const p = probMap[String(r.probability || "").toLowerCase()] ?? 1;
      if (s < 5 && p < 5) grid[p][s].push(r);
    });
    return grid;
  }, [allRisks]);

  /* ── Próximos vencimientos ── */
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const items = [];
    actions.forEach(a => { const d = a.dueDate || a.due_date; if (d) { const diff = Math.ceil((new Date(d) - now) / 86400000); if (diff >= 0 && diff <= 15) items.push({ title: a.title, type: "Acción", dueDate: d, days: diff }); } });
    commitments.forEach(c => { const d = c.dueDate || c.due_date; if (d) { const diff = Math.ceil((new Date(d) - now) / 86400000); if (diff >= 0 && diff <= 15) items.push({ title: c.description, type: "Compromiso", dueDate: d, days: diff }); } });
    return items.sort((a, b) => a.days - b.days).slice(0, 6);
  }, [actions, commitments]);

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } };

  return (
    <div className="stack-xl">
      <PageHeader
        title="Dashboard Ejecutivo"
        subtitle="Vista consolidada de desempeno, alertas y carga operativa"
        actions={<span className="muted-label">Actualizado: {formatDateTime(new Date())}</span>}
      />

      {error ? <p className="error">{error}</p> : null}

      <div className="kpi-grid">
        <Link to="/documents" className="kpi-card-link">
          <KpiCard title="Documentos" value={loading ? "..." : formatNumber(summary?.documents?.total || 0)} helper="Activos en gestion documental" icon={<FileText size={20} />} tone="info" />
        </Link>
        <Link to="/indicators" className="kpi-card-link">
          <KpiCard title="Indicadores" value={loading ? "..." : formatNumber(summary?.indicators?.total || 0)} helper="Seguimiento de desempeno" icon={<Timer size={20} />} tone="success" />
        </Link>
        <Link to="/risks" className="kpi-card-link">
          <KpiCard title="Riesgos abiertos" value={loading ? "..." : formatNumber(summary?.risks?.open || 0)} helper="Pendientes de cierre" icon={<ShieldAlert size={20} />} tone="danger" />
        </Link>
        <Link to="/committees" className="kpi-card-link">
          <KpiCard title="Compromisos pendientes" value={loading ? "..." : formatNumber(summary?.commitments?.pending || 0)} helper="Comites y seguimiento" icon={<Users size={20} />} tone="warning" />
        </Link>
      </div>

      {/* ── Dashboard de documentos (interconectado con módulo Documentos) ── */}
      <SectionCard title="Dashboard de documentos" subtitle="Documentos cargados — interconectado con el módulo de Documentos" icon={<FileText size={16} />}>
        <div className="kpi-grid">
          <Link to="/documents" className="kpi-card-link">
            <KpiCard title="Total documentos" value={loading ? "..." : formatNumber(summary?.documents?.total || 0)} helper="En gestión documental" icon={<FileText size={20} />} tone="info" />
          </Link>
          <Link to="/documents" className="kpi-card-link">
            <KpiCard title="Cargados (últimos 30 días)" value={loading ? "..." : formatNumber(summary?.documents?.uploadedLast30Days || 0)} helper="Nuevas cargas" icon={<UploadCloud size={20} />} tone="success" />
          </Link>
          <Link to="/documents" className="kpi-card-link">
            <KpiCard title="Por tipo" value={loading ? "..." : formatNumber((summary?.documents?.byType || []).length)} helper="Tipos de documento" icon={<FileArchive size={20} />} tone="default" />
          </Link>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Link to="/documents" className="btn btn-primary">Ir al módulo de Documentos</Link>
        </div>
        <div style={{ height: 260, marginTop: "1.5rem" }}>
          {documentsByProcessData?.labels?.length ? (
            <Bar data={documentsByProcessData} options={{ ...chartOpts, indexAxis: "y", plugins: { legend: { display: false } } }} />
          ) : (
            <EmptyHint text="Sin documentos por proceso. Los datos se actualizan desde el módulo de Documentos." />
          )}
        </div>
      </SectionCard>

      {/* ── Graficos principales ── */}
      <div className="two-column-grid">
        <SectionCard title="Riesgos por Proceso" subtitle="Distribucion de riesgos abiertos" icon={<BarChart3 size={16} />}>
          <div style={{ height: 260 }}>
            {risksByProcessData.labels.length ? <Bar data={risksByProcessData} options={{ ...chartOpts, indexAxis: "y" }} /> : <EmptyHint text="Sin datos de riesgos." />}
          </div>
        </SectionCard>
        <SectionCard title="Eventos Adversos por Mes" subtitle="Tendencia mensual">
          <div style={{ height: 260 }}>
            {eventsByMonthData.labels.length ? <Bar data={eventsByMonthData} options={chartOpts} /> : <EmptyHint text="Sin datos de eventos." />}
          </div>
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="Planes por Estado" subtitle="Acciones de mejora">
          <div style={{ height: 240 }}>
            {actionsByStatusData.labels.length ? <Doughnut data={actionsByStatusData} options={doughnutOpts} /> : <EmptyHint text="Sin datos." />}
          </div>
        </SectionCard>
        <SectionCard title="Semaforo Indicadores" subtitle="Cumplimiento global">
          <div style={{ height: 240 }}>
            <Doughnut data={indicatorSemaphore} options={doughnutOpts} />
          </div>
        </SectionCard>
      </div>

      {/* ── Matriz de riesgos 5x5 moderna ── */}
      <SectionCard title="Matriz de Riesgos" subtitle="Mapa de calor — Probabilidad vs Impacto">
        <div className="rm-modern">
          <div className="rm-axis-y"><span>P<br/>R<br/>O<br/>B<br/>A<br/>B<br/>I<br/>L<br/>I<br/>D<br/>A<br/>D</span></div>
          <div className="rm-body">
            <div className="rm-y-labels">{[5,4,3,2,1].map(n => <div key={n} className="rm-y-num">{n}</div>)}</div>
            <div className="rm-grid-wrap">
              <div className="rm-grid">
                {[4,3,2,1,0].map(p => [0,1,2,3,4].map(s => {
                  const items = riskMatrix[p]?.[s] || [];
                  const level = (p + 1) * (s + 1);
                  let zone = "z-low"; // 1-4
                  if (level >= 16) zone = "z-extreme";     // 16-25
                  else if (level >= 10) zone = "z-high";   // 10-15
                  else if (level >= 5) zone = "z-moderate"; // 5-9
                  return (
                    <div key={`${p}-${s}`} className={`rm-cell ${zone} ${items.length ? "has-items" : ""}`} title={items.length ? `${items.length} riesgo(s): ${items.map(r => r.title).join(", ")}` : `Nivel ${level} — Sin riesgos`}>
                      <span className="rm-cell-level">{level}</span>
                      {items.length > 0 && <span className="rm-cell-count">{items.length}</span>}
                    </div>
                  );
                }))}
              </div>
              <div className="rm-x-labels">{[1,2,3,4,5].map(n => <div key={n} className="rm-x-num">{n}</div>)}</div>
            </div>
          </div>
          <div className="rm-axis-x"><span>IMPACTO</span></div>
          <div className="rm-legend">
            <div className="rm-legend-item"><span className="rm-legend-dot z-low" />Bajo (1-4)</div>
            <div className="rm-legend-item"><span className="rm-legend-dot z-moderate" />Moderado (5-9)</div>
            <div className="rm-legend-item"><span className="rm-legend-dot z-high" />Alto (10-15)</div>
            <div className="rm-legend-item"><span className="rm-legend-dot z-extreme" />Extremo (16-25)</div>
          </div>
        </div>
      </SectionCard>

      {/* ── Listas operativas ── */}
      <div className="three-column-grid">
        <SectionCard title="Riesgos criticos" subtitle="Primeros abiertos" actions={<Link to="/risks" className="inline-link">Ver detalle →</Link>}>
          <ul className="item-list">
            {risks.map((risk) => (<li key={risk.id}><div><strong>{risk.title}</strong><small>{risk.owner || "Sin responsable"}</small></div><StatusBadge status={risk.status} /></li>))}
            {!risks.length && <EmptyHint text="No hay riesgos abiertos." />}
          </ul>
        </SectionCard>
        <SectionCard title="Acciones activas" subtitle="Pendientes por ejecutar" actions={<Link to="/actions" className="inline-link">Ver detalle →</Link>}>
          <ul className="item-list">
            {actions.map((action) => (<li key={action.id}><div><strong>{action.title}</strong><small>Vence: {formatDate(action.dueDate || action.due_date)}</small></div><StatusBadge status={action.status} /></li>))}
            {!actions.length && <EmptyHint text="No hay acciones abiertas." />}
          </ul>
        </SectionCard>
        <SectionCard title="Compromisos" subtitle="Comites en seguimiento" actions={<Link to="/committees" className="inline-link">Ver detalle →</Link>}>
          <ul className="item-list">
            {commitments.map((item) => (<li key={item.id}><div><strong>{item.description}</strong><small>Vence: {formatDate(item.dueDate || item.due_date)}</small></div><StatusBadge status={item.status} /></li>))}
            {!commitments.length && <EmptyHint text="No hay compromisos pendientes." />}
          </ul>
        </SectionCard>
      </div>

      {/* ── Proximos vencimientos y sesiones recientes ── */}
      <div className="two-column-grid">
        <SectionCard title="Proximos Vencimientos" subtitle="Dentro de 15 dias">
          <ul className="item-list">
            {upcomingDeadlines.map((item, i) => (
              <li key={i} className={item.days <= 3 ? "urgent-row" : ""}>
                <div><strong>{item.title}</strong><small>{item.type} · Vence: {formatDate(item.dueDate)}</small></div>
                <span className={`badge ${item.days <= 3 ? "danger" : item.days <= 7 ? "warning" : "info"}`}>{item.days}d</span>
              </li>
            ))}
            {!upcomingDeadlines.length && <EmptyHint text="Sin vencimientos proximos." />}
          </ul>
        </SectionCard>
        <SectionCard title="Sesiones Recientes" subtitle="Ultimos comites">
          <ul className="item-list">
            {sessions.map((s) => (
              <li key={s.id}>
                <div><strong>{s.committee_name || s.committeeName || "Comite"}</strong><small>{formatDate(s.session_date || s.sessionDate)}</small></div>
                <span className="muted-label">{s.notes ? s.notes.slice(0, 40) : "—"}</span>
              </li>
            ))}
            {!sessions.length && <EmptyHint text="Sin sesiones recientes." />}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [filters, setFilters] = useState({ query: "", processId: "", typeId: "", status: "", visibility: "" });
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    processId: "",
    type: "",
    version: "1.0",
    status: "vigente",
    visibility: "institutional",
  });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = useCallback(async (bustCache = false) => {
    setLoading(true);
    setError("");
    try {
      const docsUrl = bustCache ? `/documents/?_=${Date.now()}` : "/documents/";
      const [docsRes, statsRes, processesRes, typesRes] = await Promise.all([
        api.get(docsUrl),
        api.get("/documents/statistics/"),
        api.get("/processes/"),
        api.get("/document-types/"),
      ]);
      setDocuments(normalizeCollection(docsRes.data));
      setStats(statsRes.data || {});
      setProcesses(normalizeCollection(processesRes.data));
      setTypes(normalizeCollection(typesRes.data));
    } catch (err) {
      setError(extractError(err, "No se pudo cargar la informacion de documentos."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = setTimeout(() => setToast({ type: "info", message: "" }), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const processMap = useMemo(() => new Map(processes.map((p) => [p.id, p.name])), [processes]);
  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types]);

  const filteredDocuments = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return documents.filter((doc) => {
      const fileName = String(doc.originalname || doc.filename || "").toLowerCase();
      const status = String(doc.status || "").toLowerCase();
      const processId = doc.processId || doc.process_id || "";
      const typeId = doc.type || "";
      const visibility = String(doc.visibility || "").toLowerCase();
      const matchesQuery = !query || fileName.includes(query);
      const matchesStatus = !filters.status || status === filters.status;
      const matchesProcess = !filters.processId || processId === filters.processId;
      const matchesType = !filters.typeId || String(typeId) === filters.typeId;
      const matchesVisibility = !filters.visibility || visibility === filters.visibility;
      return matchesQuery && matchesStatus && matchesProcess && matchesType && matchesVisibility;
    });
  }, [documents, filters]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const createDocument = async (event) => {
    event.preventDefault();
    if (!uploadForm.file) {
      setToast({ type: "error", message: "Debes seleccionar un archivo." });
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const payload = new FormData();
      payload.append("file", uploadForm.file);
      if (uploadForm.processId) payload.append("processId", uploadForm.processId);
      if (uploadForm.type) payload.append("type", uploadForm.type);
      payload.append("status", uploadForm.status);
      payload.append("version", uploadForm.version);
      payload.append("visibility", uploadForm.visibility);

      const { data: created } = await api.post("/documents/", payload, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 0;
          const loaded = progressEvent.loaded || 0;
          const ratio = total > 0 ? Math.round((loaded / total) * 100) : 0;
          setUploadProgress(ratio);
        },
      });
      setToast({ type: "success", message: "Documento cargado correctamente." });
      setUploadForm({
        file: null,
        processId: "",
        type: "",
        version: "1.0",
        status: "vigente",
        visibility: "institutional",
      });
      setUploadOpen(false);
      setPage(1);
      if (created && created.id) {
        const norm = { ...created, process_id: created.processId ?? created.process_id, file_size: created.fileSize ?? created.file_size };
        setDocuments((prev) => [norm, ...prev]);
      }
      await loadData();
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "No se pudo subir el documento.") });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  const downloadZip = () => {
    window.open(`${apiBase}/documents/zip/`, "_blank");
  };

  const downloadDocument = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download/`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalname || doc.filename || "documento";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "No se pudo descargar el documento.") });
    }
  };

  const openPreview = (doc) => setPreviewDoc(doc);

  const startEdit = (doc) => {
    setEditDoc({
      id: doc.id,
      originalname: doc.originalname || doc.filename || "",
      version: doc.version || "1.0",
      status: doc.status || "vigente",
      visibility: doc.visibility || "institutional",
      type: doc.type || "",
      processId: doc.processId || doc.process_id || "",
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editDoc) return;
    setSavingEdit(true);
    try {
      await api.patch(`/documents/${editDoc.id}/`, {
        originalname: editDoc.originalname,
        status: editDoc.status,
        version: editDoc.version,
        visibility: editDoc.visibility,
        type: editDoc.type || null,
      });
      setToast({ type: "success", message: "Documento actualizado." });
      setEditDoc(null);
      await loadData(true);
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "No se pudo actualizar el documento.") });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.originalname || doc.filename}"? Esta accion no se puede deshacer.`)) return;
    setDeletingId(doc.id);
    try {
      await api.delete(`/documents/${doc.id}/`);
      setToast({ type: "success", message: "Documento eliminado." });
      await loadData(true);
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "No se pudo eliminar el documento.") });
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { key: "code", label: "Codigo", render: (doc) => String(doc.id || "").slice(0, 8).toUpperCase() },
    { key: "name", label: "Documento", render: (doc) => (<div className="table-primary-cell"><strong>{doc.originalname || doc.filename}</strong><small>Version: {doc.version || "-"}</small></div>) },
    { key: "process", label: "Proceso", render: (doc) => processMap.get(doc.processId || doc.process_id) || "Sin proceso" },
    { key: "type", label: "Tipo", render: (doc) => typeMap.get(doc.type) || "Sin tipo" },
    { key: "status", label: "Estado", render: (doc) => <StatusBadge status={doc.status} /> },
    { key: "meta", label: "Detalle", render: (doc) => (<div className="table-primary-cell"><small>{formatFileSize(doc.fileSize || doc.file_size)}</small><small>{formatDate(doc.createdAt || doc.created_at)}</small></div>) },
    { key: "actions", label: "Acciones", render: (doc) => (
      <div className="table-actions">
        <button type="button" className="btn btn-secondary" onClick={() => openPreview(doc)}>Ver</button>
        <button type="button" className="btn btn-secondary" onClick={() => downloadDocument(doc)}>Descargar</button>
        <button type="button" className="btn btn-secondary" onClick={() => startEdit(doc)}>Editar</button>
        <button type="button" className="btn btn-danger" disabled={deletingId === doc.id} onClick={() => confirmDelete(doc)}>{deletingId === doc.id ? "..." : "Eliminar"}</button>
      </div>
    )},
  ];

  return (
    <div className="stack-xl">
      <PageHeader
        title="Gestion de Documentos"
        subtitle="Control documental con filtros, carga y seguimiento"
        actions={
          <div className="row-actions">
            <button className="btn btn-secondary" type="button" onClick={downloadZip}>
              <FileArchive size={16} />
              Descargar ZIP
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setUploadOpen(true)}>
              <Plus size={16} />
              Nuevo documento
            </button>
          </div>
        }
      />

      {error ? <p className="error">{error}</p> : null}
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />

      <div className="kpi-grid">
        <KpiCard
          title="Total documentos"
          value={loading ? "..." : formatNumber(stats?.total || 0)}
          helper="Repositorio institucional"
          icon={<FileText size={20} />}
          tone="info"
        />
        <KpiCard
          title="Vigentes"
          value={
            loading
              ? "..."
              : formatNumber(
                  (stats?.byStatus || []).find((item) => String(item.status || "").toLowerCase() === "vigente")?.count || 0
                )
          }
          helper="Documentos en estado vigente"
          icon={<CheckCircle2 size={20} />}
          tone="success"
        />
        <KpiCard
          title="En revision"
          value={
            loading
              ? "..."
              : formatNumber(
                  (stats?.byStatus || []).find((item) => String(item.status || "").toLowerCase() === "en_revision")?.count ||
                    0
                )
          }
          helper="Documentos en proceso de actualizacion"
          icon={<Timer size={20} />}
          tone="warning"
        />
        <KpiCard
          title="Por vencer"
          value={loading ? "..." : "0"}
          helper="(por definir en backend)"
          icon={<AlertTriangle size={20} />}
          tone="danger"
        />
        <KpiCard
          title="Tamano total"
          value={loading ? "..." : formatFileSize(stats?.totalSize || 0)}
          helper="Acumulado cargado"
          icon={<UploadCloud size={20} />}
          tone="default"
        />
      </div>

      <SectionCard title="Filtros y busqueda">
        <div className="filters-grid">
          <label>
            <span>Buscar</span>
            <input
              value={filters.query}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, query: e.target.value }));
              }}
              placeholder="Nombre del archivo"
            />
          </label>
          <label>
            <span>Proceso</span>
            <select
              value={filters.processId}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, processId: e.target.value }));
              }}
            >
              <option value="">Todos</option>
              {processes.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tipo</span>
            <select
              value={filters.typeId}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, typeId: e.target.value }));
              }}
            >
              <option value="">Todos</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select
              value={filters.status}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status: e.target.value }));
              }}
            >
              <option value="">Todos</option>
              <option value="vigente">Vigente</option>
              <option value="en_revision">En revision</option>
              <option value="borrador">Borrador</option>
              <option value="obsoleto">Obsoleto</option>
            </select>
          </label>
          <label>
            <span>Visibilidad</span>
            <select
              value={filters.visibility}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, visibility: e.target.value }));
              }}
            >
              <option value="">Todas</option>
              <option value="private">Privado</option>
              <option value="public">Publico</option>
              <option value="institutional">Institucional</option>
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Repositorio documental"
        subtitle={`Mostrando ${pageItems.length} de ${filteredDocuments.length} documentos`}
        actions={
          <div className="row-actions">
            <button className="btn btn-secondary" type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span className="muted-label">
              Pagina {currentPage} de {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        }
      >
        <DataTable columns={columns} rows={pageItems} loading={loading} emptyText="No hay documentos para los filtros aplicados." />
      </SectionCard>

      <Modal open={uploadOpen} title="Nuevo documento" onClose={() => setUploadOpen(false)} size="lg">
        <form className="form-grid" onSubmit={createDocument}>
          <label><span>Archivo *</span><input type="file" onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} required /></label>
          <label><span>Proceso</span><select value={uploadForm.processId} onChange={(e) => setUploadForm((prev) => ({ ...prev, processId: e.target.value }))}><option value="">Sin proceso</option>{processes.map((process) => (<option key={process.id} value={process.id}>{process.name}</option>))}</select></label>
          <label><span>Tipo documental</span><select value={uploadForm.type} onChange={(e) => setUploadForm((prev) => ({ ...prev, type: e.target.value }))}><option value="">Sin tipo</option>{types.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}</select></label>
          <label><span>Version</span><input value={uploadForm.version} onChange={(e) => setUploadForm((prev) => ({ ...prev, version: e.target.value }))} /></label>
          <label><span>Estado</span><select value={uploadForm.status} onChange={(e) => setUploadForm((prev) => ({ ...prev, status: e.target.value }))}><option value="vigente">Vigente</option><option value="en_revision">En revision</option><option value="borrador">Borrador</option><option value="obsoleto">Obsoleto</option></select></label>
          <label><span>Visibilidad</span><select value={uploadForm.visibility} onChange={(e) => setUploadForm((prev) => ({ ...prev, visibility: e.target.value }))}><option value="institutional">Institucional</option><option value="restricted">Restringida</option></select></label>
          {uploading ? (<div className="upload-progress"><p>Subiendo... {uploadProgress}%</p><div className="progress-track"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div></div>) : null}
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setUploadOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? "Subiendo..." : "Guardar documento"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(previewDoc)} title={previewDoc ? (previewDoc.originalname || previewDoc.filename) : "Vista previa"} onClose={() => setPreviewDoc(null)} size="lg">
        {previewDoc && (() => {
          const name = (previewDoc.originalname || previewDoc.filename || "").toLowerCase();
          const mime = (previewDoc.mimeType || previewDoc.mime_type || "").toLowerCase();
          const isPdf = name.endsWith(".pdf") || mime.includes("pdf");
          const isImage = /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/.test(name) || mime.startsWith("image/");
          const isText = /\.(txt|csv|json|xml|html|htm|css|js|md)$/.test(name) || mime.startsWith("text/");
          const canPreview = isPdf || isImage || isText;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {canPreview ? (
                isImage ? (
                  <img src={`${apiBase}/documents/${previewDoc.id}/preview/`} alt={previewDoc.originalname} style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "8px", border: "1px solid var(--border)" }} />
                ) : (
                  <iframe title="Vista previa" src={`${apiBase}/documents/${previewDoc.id}/preview/`} style={{ width: "100%", height: "65vh", border: "1px solid var(--border)", borderRadius: "8px" }} />
                )
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <FileText size={48} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
                  <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}><strong>{previewDoc.originalname || previewDoc.filename}</strong></p>
                  <p className="muted-label" style={{ marginBottom: "1rem" }}>Este tipo de archivo no se puede previsualizar en el navegador (Word, Excel, etc.).</p>
                  <button type="button" className="btn btn-primary" onClick={() => downloadDocument(previewDoc)}>Descargar para abrir</button>
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => downloadDocument(previewDoc)}>Descargar archivo</button>
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>Cerrar</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal open={Boolean(editDoc)} title="Editar documento" onClose={() => setEditDoc(null)} size="md">
        {editDoc && (
          <form className="form-grid" onSubmit={submitEdit}>
            <label><span>Nombre del documento</span><input value={editDoc.originalname} onChange={(e) => setEditDoc((prev) => ({ ...prev, originalname: e.target.value }))} required /></label>
            <label><span>Proceso</span><select value={editDoc.processId} onChange={(e) => setEditDoc((prev) => ({ ...prev, processId: e.target.value }))}><option value="">Sin proceso</option>{processes.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></label>
            <label><span>Tipo documental</span><select value={editDoc.type} onChange={(e) => setEditDoc((prev) => ({ ...prev, type: e.target.value }))}><option value="">Sin tipo</option>{types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></label>
            <label><span>Version</span><input value={editDoc.version} onChange={(e) => setEditDoc((prev) => ({ ...prev, version: e.target.value }))} /></label>
            <label><span>Estado</span><select value={editDoc.status} onChange={(e) => setEditDoc((prev) => ({ ...prev, status: e.target.value }))}><option value="vigente">Vigente</option><option value="en_revision">En revision</option><option value="borrador">Borrador</option><option value="obsoleto">Obsoleto</option></select></label>
            <label><span>Visibilidad</span><select value={editDoc.visibility} onChange={(e) => setEditDoc((prev) => ({ ...prev, visibility: e.target.value }))}><option value="institutional">Institucional</option><option value="restricted">Restringida</option><option value="public">Publico</option><option value="private">Privado</option></select></label>
            <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditDoc(null)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar cambios"}</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function RisksPage() {
  const [risks, setRisks] = useState([]);
  const [stats, setStats] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    processId: "",
    severity: "low",
    probability: "low",
    mitigation: "",
    status: "open",
  });

  const loadRisks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, statsRes, matrixRes] = await Promise.all([
        api.get("/risks/"),
        api.get("/risks/statistics/"),
        api.get("/risks/matrix-5x5/"),
      ]);
      setRisks(normalizeCollection(listRes.data));
      setStats(statsRes.data || {});
      setMatrix(matrixRes.data || {});
    } catch (err) {
      setError(extractError(err, "No se pudo cargar la informacion de riesgos."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = setTimeout(() => setToast({ type: "info", message: "" }), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const openModalNew = () => {
    setEditing(null);
    setForm({
      title: "",
      processId: "",
      severity: "low",
      probability: "low",
      mitigation: "",
      status: "open",
    });
    setModalOpen(true);
  };

  const openModalEdit = (risk) => {
    setEditing(risk);
    setForm({
      title: risk.title || "",
      processId: risk.processId || risk.process_id || "",
      severity: risk.severity || "low",
      probability: risk.probability || "low",
      mitigation: risk.mitigation || "",
      status: risk.status || "open",
    });
    setModalOpen(true);
  };

  const submitRisk = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: form.title,
        processId: form.processId || null,
        severity: form.severity,
        probability: form.probability,
        mitigation: form.mitigation,
        status: form.status,
      };
      if (editing?.id) {
        await api.put(`/risks/${editing.id}/`, payload);
      } else {
        await api.post("/risks/", payload);
      }
      setToast({ type: "success", message: "Riesgo guardado correctamente." });
      setModalOpen(false);
      await loadRisks();
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "No se pudo guardar el riesgo.") });
    }
  };

  const deleteRisk = async (risk) => {
    if (!window.confirm(`¿Eliminar riesgo "${risk.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/risks/${risk.id}/`);
      setToast({ type: "success", message: "Riesgo eliminado." });
      await loadRisks();
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "No se pudo eliminar el riesgo.") });
    }
  };

  const severityCount = (level) =>
    (stats?.bySeverity || []).find((item) => String(item.severity || "").toLowerCase() === level)?.count || 0;

  const riskColumns = [
    {
      key: "code",
      label: "Codigo",
      render: (row) => `RSK-${String(row.id ?? "").padStart(3, "0")}`,
    },
    {
      key: "title",
      label: "Riesgo",
      render: (row) => (
        <div className="table-primary-cell">
          <strong>{row.title}</strong>
          <small>{row.description || ""}</small>
        </div>
      ),
    },
    {
      key: "process",
      label: "Proceso",
      render: (row) => row.processId || row.process_id || "-",
    },
    {
      key: "severity",
      label: "Impacto",
      render: (row) => row.severity || "-",
    },
    {
      key: "probability",
      label: "Probabilidad",
      render: (row) => row.probability || "-",
    },
    {
      key: "level",
      label: "Nivel",
      render: (row) => (row.level ? <StatusBadge status={row.level} /> : (row.severity || "-")),
    },
    {
      key: "status",
      label: "Estado",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "Acciones",
      render: (row) => (
        <div className="table-actions">
          <button type="button" className="btn btn-secondary" onClick={() => openModalEdit(row)}>Ver / Editar</button>
          <button type="button" className="btn btn-danger" onClick={() => deleteRisk(row)}>Eliminar</button>
        </div>
      ),
    },
  ];

  const matrixGrid = matrix?.grid || [];
  const topRisks = matrix?.topRisks || [];

  return (
    <div className="stack-xl">
      <PageHeader
        title="Gestion de Riesgos"
        subtitle="Identifica, evalua y mitiga riesgos institucionales"
        actions={
          <button className="btn btn-primary" type="button" onClick={openModalNew}>
            <Plus size={16} />
            Nuevo riesgo
          </button>
        }
      />

      {error ? <p className="error">{error}</p> : null}
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />

      <div className="kpi-grid">
        <KpiCard
          title="Total"
          value={loading ? "..." : formatNumber(stats?.total || 0)}
          helper="Riesgos registrados"
          icon={<ShieldAlert size={20} />}
          tone="info"
        />
        <KpiCard
          title="Abiertos"
          value={loading ? "..." : formatNumber(stats?.open || 0)}
          helper="Pendientes de cierre"
          icon={<AlertTriangle size={20} />}
          tone="warning"
        />
        <KpiCard
          title="Impacto alto"
          value={loading ? "..." : formatNumber(severityCount("high") + severityCount("critical"))}
          helper="Riesgos criticos"
          icon={<AlertTriangle size={20} />}
          tone="danger"
        />
        <KpiCard
          title="Impacto medio/bajo"
          value={loading ? "..." : formatNumber(severityCount("medium") + severityCount("low"))}
          helper="Resto de riesgos"
          icon={<Timer size={20} />}
          tone="default"
        />
      </div>

      <div className="two-column-grid">
        <SectionCard title="Matriz de riesgos 5x5" subtitle="Mapa de calor — Probabilidad vs Impacto">
          <div className="rm-modern rm-compact">
            <div className="rm-axis-y"><span>PROB.</span></div>
            <div className="rm-body">
              <div className="rm-y-labels">{[5,4,3,2,1].map(n => <div key={n} className="rm-y-num">{n}</div>)}</div>
              <div className="rm-grid-wrap">
                <div className="rm-grid">
                  {matrixGrid.length ? matrixGrid.slice().reverse().map((row, iRow) =>
                    row.map((cell, iCol) => {
                      const count = Array.isArray(cell) ? cell.length : 0;
                      const level = (5 - iRow) * (iCol + 1);
                      let zone = "z-low";
                      if (level >= 16) zone = "z-extreme";
                      else if (level >= 10) zone = "z-high";
                      else if (level >= 5) zone = "z-moderate";
                      return (
                        <div key={`${iRow}-${iCol}`} className={`rm-cell ${zone} ${count ? "has-items" : ""}`} title={`Nivel ${level} — ${count} riesgo(s)`}>
                          <span className="rm-cell-level">{level}</span>
                          {count > 0 && <span className="rm-cell-count">{count}</span>}
                        </div>
                      );
                    })
                  ) : <div style={{gridColumn:"1/-1",textAlign:"center",padding:"2rem",color:"var(--muted)"}}>Sin datos de matriz.</div>}
                </div>
                <div className="rm-x-labels">{[1,2,3,4,5].map(n => <div key={n} className="rm-x-num">{n}</div>)}</div>
              </div>
            </div>
            <div className="rm-axis-x"><span>IMPACTO</span></div>
            <div className="rm-legend">
              <div className="rm-legend-item"><span className="rm-legend-dot z-low" />Bajo</div>
              <div className="rm-legend-item"><span className="rm-legend-dot z-moderate" />Moderado</div>
              <div className="rm-legend-item"><span className="rm-legend-dot z-high" />Alto</div>
              <div className="rm-legend-item"><span className="rm-legend-dot z-extreme" />Extremo</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Top riesgos" subtitle="Ordenados por nivel de criticidad">
          <ul className="item-list">
            {topRisks.map((risk) => (
              <li key={risk.id}>
                <div>
                  <strong>{risk.title}</strong>
                  <small>
                    Impacto {risk.severity || "-"} · Probabilidad {risk.probability || "-"}
                  </small>
                </div>
                <StatusBadge status={risk.status || "open"} />
              </li>
            ))}
            {!topRisks.length ? <EmptyHint text="Sin riesgos abiertos." /> : null}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Listado de riesgos" subtitle="Detalle de cada riesgo identificado">
        <DataTable
          columns={riskColumns}
          rows={risks}
          loading={loading}
          emptyText="Sin riesgos registrados."
        />
      </SectionCard>

      <Modal open={modalOpen} title={editing ? "Editar riesgo" : "Nuevo riesgo"} onClose={() => setModalOpen(false)} size="md">
        <form className="form-grid" onSubmit={submitRisk}>
          <label>
            <span>Titulo *</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </label>
          <label>
            <span>Proceso</span>
            <input
              value={form.processId}
              onChange={(e) => setForm((prev) => ({ ...prev, processId: e.target.value }))}
            />
          </label>
          <label>
            <span>Impacto</span>
            <select
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
            >
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="critical">Critico</option>
            </select>
          </label>
          <label>
            <span>Probabilidad</span>
            <select
              value={form.probability}
              onChange={(e) => setForm((prev) => ({ ...prev, probability: e.target.value }))}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label>
            <span>Plan de mitigacion</span>
            <textarea
              rows={3}
              value={form.mitigation}
              onChange={(e) => setForm((prev) => ({ ...prev, mitigation: e.target.value }))}
            />
          </label>
          <label>
            <span>Estado</span>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="open">Abierto</option>
              <option value="in_progress">En curso</option>
              <option value="closed">Cerrado</option>
            </select>
          </label>
          <div className="row-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar riesgo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function ActionsPage() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", assignee: "", dueDate: "", priority: "medium", description: "", status: "open", progress: 0 });
  const loadActions = useCallback(async () => { setLoading(true); setError(""); try { const res = await api.get("/actions/"); setActions(normalizeCollection(res.data)); } catch (err) { setError(extractError(err, "No se pudo cargar acciones.")); } finally { setLoading(false); } }, []);
  useEffect(() => { loadActions(); }, [loadActions]);
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);
  const totalCount = actions.length;
  const inProgressCount = actions.filter(a => a.status === "in_progress").length;
  const completedCount = actions.filter(a => a.status === "completed" || a.status === "closed").length;
  const overdueCount = actions.filter(a => { const d = a.dueDate || a.due_date; return d && new Date(d) < new Date() && a.status !== "completed" && a.status !== "closed"; }).length;
  const openModal = (action = null) => {
    setEditing(action);
    setForm(action ? { title: action.title || "", assignee: action.assignee || action.assigned_to || "", dueDate: (action.dueDate || action.due_date || "").slice(0, 10), priority: action.priority || "medium", description: action.description || "", status: action.status || "open", progress: action.progress || 0 }
      : { title: "", assignee: "", dueDate: "", priority: "medium", description: "", status: "open", progress: 0 });
    setModalOpen(true);
  };
  const submitAction = async (e) => {
    e.preventDefault();
    try {
      const payload = { title: form.title, assignee: form.assignee || null, dueDate: form.dueDate || null, priority: form.priority, description: form.description, status: form.status, progress: Number(form.progress) || 0 };
      if (editing?.id) { await api.put(`/actions/${editing.id}/`, payload); } else { await api.post("/actions/", payload); }
      setToast({ type: "success", message: "Acción guardada." }); setModalOpen(false); await loadActions();
    } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo guardar la acción.") }); }
  };
  const closeAction = async (action) => { try { await api.post(`/actions/${action.id}/close/`, {}); setToast({ type: "success", message: "Acción cerrada." }); await loadActions(); } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo cerrar.") }); } };
  const deleteAction = async (action) => { if (!window.confirm(`¿Eliminar "${action.title}"?`)) return; try { await api.delete(`/actions/${action.id}/`); setToast({ type: "success", message: "Acción eliminada." }); await loadActions(); } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo eliminar.") }); } };
  const columns = [
    { key: "title", label: "Acción", render: (r) => (<div className="table-primary-cell"><strong>{r.title}</strong><small>{r.description || ""}</small></div>) },
    { key: "assignee", label: "Responsable", render: (r) => r.assignee || r.assigned_to || "—" },
    { key: "dueDate", label: "Fecha límite", render: (r) => formatDate(r.dueDate || r.due_date) },
    { key: "priority", label: "Prioridad", render: (r) => <StatusBadge status={r.priority || "medium"} /> },
    { key: "status", label: "Estado", render: (r) => <StatusBadge status={r.status} /> },
    { key: "progress", label: "Avance", render: (r) => { const p = Number(r.progress || 0); return (<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><div style={{ flex: 1, background: "var(--border)", borderRadius: 4, height: 8, overflow: "hidden" }}><div style={{ width: `${p}%`, background: p >= 100 ? "var(--success)" : "var(--primary)", height: "100%", borderRadius: 4 }} /></div><small>{p}%</small></div>); }},
    { key: "actions", label: "Acciones", render: (r) => (<div className="table-actions"><button type="button" className="btn btn-secondary" onClick={() => openModal(r)}>Editar</button>{r.status !== "completed" && r.status !== "closed" ? <button type="button" className="btn btn-secondary" onClick={() => closeAction(r)}>Cerrar</button> : null}<button type="button" className="btn btn-danger" onClick={() => deleteAction(r)}>Eliminar</button></div>) },
  ];
  return (
    <div className="stack-xl">
      <PageHeader title="Planes de Acción" subtitle="Gestión y seguimiento de acciones de mejora" actions={<button className="btn btn-primary" type="button" onClick={() => openModal()}><Plus size={16} /> Nueva acción</button>} />
      {error ? <p className="error">{error}</p> : null}
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      <div className="kpi-grid">
        <KpiCard title="Total" value={loading ? "..." : formatNumber(totalCount)} helper="Acciones registradas" icon={<ClipboardCheck size={20} />} tone="info" />
        <KpiCard title="En progreso" value={loading ? "..." : formatNumber(inProgressCount)} helper="En ejecución" icon={<Timer size={20} />} tone="warning" />
        <KpiCard title="Completadas" value={loading ? "..." : formatNumber(completedCount)} helper="Finalizadas" icon={<CheckCircle2 size={20} />} tone="success" />
        <KpiCard title="Vencidas" value={loading ? "..." : formatNumber(overdueCount)} helper="Fecha límite superada" icon={<AlertTriangle size={20} />} tone="danger" />
      </div>
      <SectionCard title="Listado de acciones" subtitle={`${actions.length} acciones registradas`}>
        <DataTable columns={columns} rows={actions} loading={loading} emptyText="No hay acciones registradas." />
      </SectionCard>
      <Modal open={modalOpen} title={editing ? "Editar acción" : "Nueva acción"} onClose={() => setModalOpen(false)} size="md">
        <form className="form-grid" onSubmit={submitAction}>
          <label><span>Título *</span><input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required /></label>
          <label><span>Responsable</span><input value={form.assignee} onChange={(e) => setForm(p => ({ ...p, assignee: e.target.value }))} /></label>
          <label><span>Fecha límite</span><input type="date" value={form.dueDate} onChange={(e) => setForm(p => ({ ...p, dueDate: e.target.value }))} /></label>
          <label><span>Prioridad</span><select value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
          <label><span>Descripción</span><textarea rows={3} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} /></label>
          <label><span>Estado</span><select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}><option value="open">Abierta</option><option value="in_progress">En progreso</option><option value="completed">Completada</option><option value="closed">Cerrada</option></select></label>
          <label><span>Avance (%)</span><input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm(p => ({ ...p, progress: e.target.value }))} /></label>
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
        </form>
      </Modal>
    </div>
  );
}

export function IndicatorsPage() {
  const [indicators, setIndicators] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", current: "", frequency: "mensual", unit: "%", processId: "" });
  const loadIndicators = useCallback(async () => { setLoading(true); setError(""); try { const [res, pRes] = await Promise.all([api.get("/indicators/"), api.get("/processes/")]); setIndicators(normalizeCollection(res.data)); setProcesses(normalizeCollection(pRes.data)); } catch (err) { setError(extractError(err, "No se pudo cargar indicadores.")); } finally { setLoading(false); } }, []);
  useEffect(() => { loadIndicators(); }, [loadIndicators]);
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);
  const processMap = useMemo(() => new Map(processes.map(p => [p.id, p.name])), [processes]);
  const meetsTarget = (ind) => { const t = Number(ind.target || 0); const c = Number(ind.current ?? ind.current_value ?? 0); return t > 0 && c >= t; };
  const isAtRisk = (ind) => { const t = Number(ind.target || 0); const c = Number(ind.current ?? ind.current_value ?? 0); return t > 0 && c >= t * 0.8 && c < t; };
  const isCritical = (ind) => { const t = Number(ind.target || 0); const c = Number(ind.current ?? ind.current_value ?? 0); return t > 0 && c < t * 0.8; };

  /* Grafico: Cumplimiento por Area */
  const areaChartData = useMemo(() => {
    const byProcess = {};
    indicators.forEach(ind => {
      const pName = processMap.get(ind.process_id || ind.processId) || "Sin proceso";
      if (!byProcess[pName]) byProcess[pName] = { sum: 0, count: 0 };
      const t = Number(ind.target || 0); const c = Number(ind.current ?? 0);
      byProcess[pName].sum += t > 0 ? Math.min((c / t) * 100, 100) : 0;
      byProcess[pName].count += 1;
    });
    const labels = Object.keys(byProcess).slice(0, 10);
    const data = labels.map(l => Math.round(byProcess[l].sum / byProcess[l].count));
    return { labels, datasets: [{ label: "% Cumplimiento", data, backgroundColor: CHART_BG.slice(0, labels.length), borderColor: CHART_COLORS.slice(0, labels.length), borderWidth: 1 }] };
  }, [indicators, processMap]);

  /* Grafico: Tendencia global (simulada con datos actuales) */
  const trendData = useMemo(() => {
    const months = ["Oct", "Nov", "Dic", "Ene", "Feb"];
    const base = indicators.length ? Math.round(indicators.filter(meetsTarget).length / indicators.length * 100) : 0;
    const vals = months.map((_, i) => Math.max(0, Math.min(100, base - (months.length - 1 - i) * 3 + Math.round(Math.random() * 5))));
    vals[vals.length - 1] = base;
    return { labels: months, datasets: [{ label: "Cumplimiento %", data: vals, borderColor: "#4f46e5", backgroundColor: "#4f46e533", fill: true, tension: 0.3, pointRadius: 4 }] };
  }, [indicators]);

  const openModal = (ind = null) => {
    setEditing(ind);
    setForm(ind ? { name: ind.name || "", target: ind.target ?? "", current: ind.current ?? ind.current_value ?? "", frequency: ind.frequency || "mensual", unit: ind.unit || "%", processId: ind.process_id || ind.processId || "" } : { name: "", target: "", current: "", frequency: "mensual", unit: "%", processId: "" });
    setModalOpen(true);
  };
  const submitIndicator = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, target: Number(form.target) || 0, current: Number(form.current) || 0, frequency: form.frequency, unit: form.unit, processId: form.processId || null };
      if (editing?.id) { await api.put(`/indicators/${editing.id}/`, payload); } else { await api.post("/indicators/", payload); }
      setToast({ type: "success", message: "Indicador guardado." }); setModalOpen(false); await loadIndicators();
    } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo guardar.") }); }
  };
  const deleteIndicator = async (ind) => { if (!window.confirm(`¿Eliminar "${ind.name}"?`)) return; try { await api.delete(`/indicators/${ind.id}/`); setToast({ type: "success", message: "Eliminado." }); await loadIndicators(); } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo eliminar.") }); } };
  const columns = [
    { key: "name", label: "Nombre", render: (r) => (<div className="table-primary-cell"><strong>{r.name}</strong><small>{r.frequency || ""} · {r.unit || ""}</small></div>) },
    { key: "area", label: "Area", render: (r) => processMap.get(r.process_id || r.processId) || "Sin proceso" },
    { key: "target", label: "Meta", render: (r) => r.target ?? "—" },
    { key: "current", label: "Actual", render: (r) => r.current ?? r.current_value ?? "—" },
    { key: "status", label: "Estado", render: (r) => { if (meetsTarget(r)) return <StatusBadge status="closed" />; if (isAtRisk(r)) return <StatusBadge status="in_progress" />; return <StatusBadge status="open" />; }},
    { key: "compliance", label: "Cumplimiento %", render: (r) => { const t = Number(r.target || 0); const c = Number(r.current ?? r.current_value ?? 0); const pct = t > 0 ? Math.min(Math.round((c / t) * 100), 100) : 0; return (<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><div style={{ flex: 1, background: "var(--border)", borderRadius: 4, height: 8, overflow: "hidden" }}><div style={{ width: `${pct}%`, background: pct >= 100 ? "var(--success)" : pct >= 80 ? "var(--warning)" : "var(--danger)", height: "100%", borderRadius: 4 }} /></div><small>{pct}%</small></div>); }},
    { key: "actions", label: "Acciones", render: (r) => (<div className="table-actions"><button type="button" className="btn btn-secondary" onClick={() => openModal(r)}>Editar</button><button type="button" className="btn btn-danger" onClick={() => deleteIndicator(r)}>Eliminar</button></div>) },
  ];
  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  return (
    <div className="stack-xl">
      <PageHeader title="Indicadores" subtitle="Seguimiento y cumplimiento de indicadores de gestion" actions={<button className="btn btn-primary" type="button" onClick={() => openModal()}><Plus size={16} /> Nuevo indicador</button>} />
      {error ? <p className="error">{error}</p> : null}
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      <div className="kpi-grid">
        <KpiCard title="Total" value={loading ? "..." : formatNumber(indicators.length)} helper="Indicadores registrados" icon={<FileText size={20} />} tone="info" />
        <KpiCard title="Cumplen meta" value={loading ? "..." : formatNumber(indicators.filter(meetsTarget).length)} helper="Dentro del objetivo" icon={<CheckCircle2 size={20} />} tone="success" />
        <KpiCard title="En riesgo" value={loading ? "..." : formatNumber(indicators.filter(isAtRisk).length)} helper="Cerca del limite" icon={<AlertTriangle size={20} />} tone="warning" />
        <KpiCard title="Criticos" value={loading ? "..." : formatNumber(indicators.filter(isCritical).length)} helper="Debajo del 80%" icon={<ShieldAlert size={20} />} tone="danger" />
      </div>
      {/* Graficos */}
      <div className="two-column-grid">
        <SectionCard title="Cumplimiento por Area" subtitle="Promedio de cumplimiento por proceso">
          <div style={{ height: 260 }}>
            {areaChartData.labels.length ? <Bar data={areaChartData} options={{ ...chartOpts, scales: { y: { beginAtZero: true, max: 100 } } }} /> : <EmptyHint text="Sin datos de areas." />}
          </div>
        </SectionCard>
        <SectionCard title="Tendencia Global" subtitle="Evolucion del cumplimiento">
          <div style={{ height: 260 }}>
            <Line data={trendData} options={{ ...chartOpts, scales: { y: { beginAtZero: true, max: 100 } } }} />
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Listado de indicadores" subtitle={`${indicators.length} indicadores`}>
        <DataTable columns={columns} rows={indicators} loading={loading} emptyText="No hay indicadores registrados." />
      </SectionCard>
      <Modal open={modalOpen} title={editing ? "Editar indicador" : "Nuevo indicador"} onClose={() => setModalOpen(false)} size="md">
        <form className="form-grid" onSubmit={submitIndicator}>
          <label><span>Nombre *</span><input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required /></label>
          <label><span>Proceso / Area</span><select value={form.processId} onChange={(e) => setForm(p => ({ ...p, processId: e.target.value }))}><option value="">Sin proceso</option>{processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label><span>Meta</span><input type="number" value={form.target} onChange={(e) => setForm(p => ({ ...p, target: e.target.value }))} /></label>
          <label><span>Valor actual</span><input type="number" value={form.current} onChange={(e) => setForm(p => ({ ...p, current: e.target.value }))} /></label>
          <label><span>Frecuencia</span><select value={form.frequency} onChange={(e) => setForm(p => ({ ...p, frequency: e.target.value }))}><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></label>
          <label><span>Unidad</span><input value={form.unit} onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))} /></label>
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
        </form>
      </Modal>
    </div>
  );
}

export function CommitteesPage() {
  const [committees, setCommittees] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState("");
  const [commitmentFilter, setCommitmentFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [openNewCommittee, setOpenNewCommittee] = useState(false);
  const [newCommitteeForm, setNewCommitteeForm] = useState({ name: "", description: "" });
  const [detailTab, setDetailTab] = useState("miembros");
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ sessionDate: "", notes: "" });
  const [memberForm, setMemberForm] = useState({ userId: "", role: "member" });
  const [commitmentModal, setCommitmentModal] = useState(false);
  const [commitmentForm, setCommitmentForm] = useState({ description: "", assignedTo: "", dueDate: "", status: "pending" });

  const selectedCommittee = useMemo(() => committees.find(c => c.id === selectedCommitteeId) || null, [committees, selectedCommitteeId]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const pendingCommitmentsCount = useMemo(() => commitments.filter(c => c.status !== "completed").length, [commitments]);
  const overdueCount = useMemo(() => {
    const now = new Date();
    return commitments.filter(c => { const d = c.dueDate || c.due_date; return d && new Date(d) < now && c.status !== "completed"; }).length;
  }, [commitments]);
  const sessionsThisMonthCount = useMemo(() => {
    const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
    return sessions.filter(s => { const d = new Date(s.sessionDate || s.session_date); return d.getMonth() === m && d.getFullYear() === y; }).length;
  }, [sessions]);

  const loadCore = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [cRes, uRes, rRes] = await Promise.all([api.get("/committees/"), api.get("/users/"), api.get("/commitments/reminders/?days=7")]);
      const cData = normalizeCollection(cRes.data);
      setCommittees(cData); setUsers(normalizeCollection(uRes.data)); setReminders(rRes.data?.items || []);
      if (cData.length) setSelectedCommitteeId(cur => cur || cData[0].id);
    } catch (err) { setError(extractError(err, "No se pudieron cargar los comites.")); }
    finally { setLoading(false); }
  }, []);

  const loadDetails = useCallback(async () => {
    if (!selectedCommitteeId) { setMembers([]); setSessions([]); setCommitments([]); return; }
    try {
      const [mRes, sRes, cRes] = await Promise.all([
        api.get(`/committees/${selectedCommitteeId}/members/`),
        api.get(`/committees/${selectedCommitteeId}/sessions/`),
        api.get(`/committees/${selectedCommitteeId}/commitments/`),
      ]);
      setMembers(normalizeCollection(mRes.data)); setSessions(normalizeCollection(sRes.data)); setCommitments(normalizeCollection(cRes.data));
    } catch (err) { setError(extractError(err, "No se pudo cargar detalle del comite.")); }
  }, [selectedCommitteeId]);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);

  const filteredCommitments = useMemo(() => commitmentFilter ? commitments.filter(c => c.status === commitmentFilter) : commitments, [commitmentFilter, commitments]);

  const createCommittee = async (e) => { e.preventDefault(); try { await api.post("/committees/", newCommitteeForm); setNewCommitteeForm({ name: "", description: "" }); setOpenNewCommittee(false); setToast({ type: "success", message: "Comite creado." }); await loadCore(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const addMember = async (e) => { e.preventDefault(); if (!selectedCommitteeId) return; try { await api.post(`/committees/${selectedCommitteeId}/members/`, memberForm); setMemberForm({ userId: "", role: "member" }); setToast({ type: "success", message: "Miembro agregado." }); await loadDetails(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const removeMember = async (m) => { if (!window.confirm("¿Remover miembro?")) return; try { await api.delete(`/committees/${selectedCommitteeId}/members/${m.userId || m.user_id || m.id}/`); setToast({ type: "success", message: "Miembro removido." }); await loadDetails(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const createSession = async (e) => { e.preventDefault(); if (!selectedCommitteeId) return; try { await api.post(`/committees/${selectedCommitteeId}/sessions/`, { committeeId: selectedCommitteeId, ...sessionForm }); setSessionForm({ sessionDate: "", notes: "" }); setSessionModal(false); setToast({ type: "success", message: "Sesion registrada." }); await loadDetails(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const createCommitment = async (e) => { e.preventDefault(); if (!selectedCommitteeId) return; try { await api.post(`/committees/${selectedCommitteeId}/commitments/`, { committeeId: selectedCommitteeId, description: commitmentForm.description, assignedTo: commitmentForm.assignedTo || null, dueDate: commitmentForm.dueDate || null, status: commitmentForm.status || "pending" }); setCommitmentForm({ description: "", assignedTo: "", dueDate: "", status: "pending" }); setCommitmentModal(false); setToast({ type: "success", message: "Compromiso registrado." }); await loadDetails(); await loadCore(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const closeCommitment = async (id) => { try { await api.post(`/commitments/${id}/close/`, {}); setToast({ type: "success", message: "Compromiso cerrado." }); await loadDetails(); await loadCore(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const updateCommitmentStatus = async (id, status) => { try { await api.patch(`/commitments/${id}/`, { status }); setToast({ type: "success", message: "Estado actualizado." }); await loadDetails(); await loadCore(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const deleteCommittee = async () => { if (!selectedCommittee || !window.confirm(`¿Eliminar comite "${selectedCommittee.name}"?`)) return; try { await api.delete(`/committees/${selectedCommitteeId}/`); setSelectedCommitteeId(""); setToast({ type: "success", message: "Comite eliminado." }); await loadCore(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };

  const detailTabs = [
    { id: "miembros", label: `Miembros (${members.length})` },
    { id: "sesiones", label: `Sesiones (${sessions.length})` },
    { id: "compromisos", label: `Compromisos (${commitments.length})` },
    { id: "recordatorios", label: `Alertas (${reminders.length})` },
  ];

  return (
    <div className="stack-xl">
      <PageHeader title="Comites y Seguimiento" subtitle="Gestion de sesiones, miembros y compromisos con trazabilidad" actions={<button className="btn btn-primary" type="button" onClick={() => setOpenNewCommittee(true)}><Plus size={16} /> Nuevo comite</button>} />
      {error ? <p className="error">{error}</p> : null}
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />

      {/* ── KPIs ── */}
      <div className="kpi-grid">
        <KpiCard title="Comites activos" value={loading ? "..." : formatNumber(committees.length)} helper="Registros vigentes" icon={<Users size={20} />} tone="info" />
        <KpiCard title="Sesiones del mes" value={loading ? "..." : formatNumber(sessionsThisMonthCount)} helper="Dinamica operativa" icon={<CalendarClock size={20} />} tone="default" />
        <KpiCard title="Compromisos pendientes" value={loading ? "..." : formatNumber(pendingCommitmentsCount)} helper="Pendientes de cierre" icon={<ClipboardCheck size={20} />} tone="warning" />
        <KpiCard title="Vencidos" value={loading ? "..." : formatNumber(overdueCount)} helper="Fecha limite superada" icon={<AlertTriangle size={20} />} tone="danger" />
      </div>

      {/* ── Layout: Panel izquierdo (lista) + Panel derecho (detalle con tabs) ── */}
      <div className="committees-layout">
        {/* Panel izquierdo: lista de comites */}
        <div className="committees-sidebar">
          <div className="committees-sidebar-header">
            <strong>Comites</strong>
            <small>{committees.length} activos</small>
          </div>
          <div className="committee-list">
            {committees.map(c => (
              <button key={c.id} type="button" className={`committee-item ${c.id === selectedCommitteeId ? "active" : ""}`} onClick={() => { setSelectedCommitteeId(c.id); setDetailTab("miembros"); }}>
                <div className="committee-item-content">
                  <div className="committee-item-icon"><Users size={16} /></div>
                  <div>
                    <strong>{c.name}</strong>
                    <small>{c.description || "Sin descripcion"}</small>
                  </div>
                </div>
                <div className="committee-item-meta">
                  <span className="badge info">{formatDate(c.createdAt || c.created_at)}</span>
                </div>
              </button>
            ))}
            {!committees.length && <EmptyHint text="No hay comites creados." />}
          </div>
        </div>

        {/* Panel derecho: detalle del comite seleccionado */}
        <div className="committees-detail">
          {!selectedCommittee ? (
            <div className="committees-empty-state">
              <Users size={48} style={{ opacity: 0.2 }} />
              <p>Selecciona un comite del panel izquierdo para ver su detalle</p>
            </div>
          ) : (
            <>
              {/* Cabecera del comite */}
              <div className="committee-detail-header">
                <div>
                  <h3>{selectedCommittee.name}</h3>
                  <p className="muted-label">{selectedCommittee.description || "Sin descripcion"}</p>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setSessionModal(true)}><CalendarClock size={14} /> Nueva sesion</button>
                  <button type="button" className="btn btn-primary" onClick={() => setCommitmentModal(true)}><Plus size={14} /> Nuevo compromiso</button>
                  <button type="button" className="btn btn-danger" onClick={deleteCommittee}><X size={14} /></button>
                </div>
              </div>

              {/* Estadisticas rapidas del comite */}
              <div className="committee-quick-stats">
                <div className="cqs-item"><span className="cqs-number">{members.length}</span><span className="cqs-label">Miembros</span></div>
                <div className="cqs-item"><span className="cqs-number">{sessions.length}</span><span className="cqs-label">Sesiones</span></div>
                <div className="cqs-item"><span className="cqs-number">{commitments.filter(c => c.status === "pending").length}</span><span className="cqs-label">Pendientes</span></div>
                <div className="cqs-item"><span className="cqs-number">{commitments.filter(c => c.status === "completed").length}</span><span className="cqs-label">Cerrados</span></div>
              </div>

              {/* Tabs internos del detalle */}
              <div className="process-detail-tabs">{detailTabs.map(t => <button key={t.id} type="button" className={detailTab === t.id ? "active" : ""} onClick={() => setDetailTab(t.id)}>{t.label}</button>)}</div>

              {/* ── Tab: Miembros ── */}
              {detailTab === "miembros" && (
                <div className="committee-tab-content">
                  <form className="committee-inline-form" onSubmit={addMember}>
                    <select value={memberForm.userId} onChange={e => setMemberForm(p => ({ ...p, userId: e.target.value }))} required>
                      <option value="">Seleccionar usuario...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                    </select>
                    <input value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))} placeholder="Rol (ej: Secretario)" style={{ maxWidth: 180 }} />
                    <button type="submit" className="btn btn-primary">Agregar</button>
                  </form>
                  <DataTable columns={[
                    { key: "name", label: "Nombre", render: m => {
                      const u = userMap.get(m.userId || m.user_id);
                      return (<div className="table-primary-cell"><strong>{u?.name || m.userId || m.user_id}</strong><small>{u?.email || ""}</small></div>);
                    }},
                    { key: "role", label: "Rol", render: m => <StatusBadge status={m.role || "member"} /> },
                    { key: "joined", label: "Ingreso", render: m => formatDate(m.joinedAt || m.joined_at) },
                    { key: "actions", label: "", render: m => <button type="button" className="btn btn-danger" style={{ padding: "0.25rem 0.5rem" }} onClick={() => removeMember(m)}><X size={12} /></button> },
                  ]} rows={members} emptyText="Este comite no tiene miembros." />
                </div>
              )}

              {/* ── Tab: Sesiones ── */}
              {detailTab === "sesiones" && (
                <div className="committee-tab-content">
                  {sessions.length ? (
                    <div className="sessions-timeline">
                      {sessions.map(s => (
                        <div key={s.id} className="session-card">
                          <div className="session-date-badge">{formatDate(s.sessionDate || s.session_date)}</div>
                          <div className="session-notes">{s.notes || "Sin notas registradas"}</div>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyHint text="No hay sesiones registradas. Usa el boton 'Nueva sesion' para crear una." />}
                </div>
              )}

              {/* ── Tab: Compromisos ── */}
              {detailTab === "compromisos" && (
                <div className="committee-tab-content">
                  <div className="committee-inline-form" style={{ marginBottom: "1rem" }}>
                    <select value={commitmentFilter} onChange={e => setCommitmentFilter(e.target.value)} className="inline-select">
                      <option value="">Todos los estados</option>
                      <option value="pending">Pendientes</option>
                      <option value="in_progress">En curso</option>
                      <option value="completed">Completados</option>
                    </select>
                    <span className="muted-label">{filteredCommitments.length} compromiso(s)</span>
                  </div>
                  <DataTable columns={[
                    { key: "desc", label: "Compromiso", render: r => (<div className="table-primary-cell"><strong>{r.description}</strong><small>Asignado: {userMap.get(r.assignedTo || r.assigned_to)?.name || "Sin asignar"}</small></div>) },
                    { key: "due", label: "Vencimiento", render: r => {
                      const d = r.dueDate || r.due_date;
                      const isOverdue = d && new Date(d) < new Date() && r.status !== "completed";
                      return <span className={isOverdue ? "text-danger" : ""}>{formatDate(d)}</span>;
                    }},
                    { key: "status", label: "Estado", render: r => (
                      <select value={r.status} onChange={e => updateCommitmentStatus(r.id, e.target.value)} className="inline-select" style={{ minWidth: 120 }}>
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En curso</option>
                        <option value="completed">Completado</option>
                      </select>
                    )},
                    { key: "closed", label: "Cerrado", render: r => formatDate(r.closedAt || r.closed_at) },
                    { key: "actions", label: "", render: r => r.status !== "completed" ? (<button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={() => closeCommitment(r.id)}>Cerrar</button>) : <CheckCircle2 size={16} style={{ color: "var(--success)" }} /> },
                  ]} rows={filteredCommitments} emptyText="Sin compromisos." />
                </div>
              )}

              {/* ── Tab: Recordatorios / Alertas ── */}
              {detailTab === "recordatorios" && (
                <div className="committee-tab-content">
                  {reminders.length ? (
                    <ul className="item-list">
                      {reminders.map((r, i) => {
                        const days = r.dueDate ? Math.ceil((new Date(r.dueDate) - new Date()) / 86400000) : null;
                        return (
                          <li key={r.commitmentId || i} className={days !== null && days <= 3 ? "urgent-row" : ""}>
                            <div>
                              <strong>{r.description}</strong>
                              <small>Vence: {formatDate(r.dueDate)} · {r.assignedEmail || r.assignedTo || "Sin asignar"}</small>
                            </div>
                            {days !== null && <span className={`badge ${days <= 0 ? "danger" : days <= 3 ? "warning" : "info"}`}>{days <= 0 ? "Vencido" : `${days}d`}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  ) : <EmptyHint text="No hay recordatorios proximos (7 dias)." />}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      <Modal open={openNewCommittee} title="Nuevo comite" onClose={() => setOpenNewCommittee(false)} size="md">
        <form className="form-grid" onSubmit={createCommittee}>
          <label><span>Nombre *</span><input value={newCommitteeForm.name} onChange={e => setNewCommitteeForm(p => ({ ...p, name: e.target.value }))} required /></label>
          <label><span>Descripcion</span><textarea rows={2} value={newCommitteeForm.description} onChange={e => setNewCommitteeForm(p => ({ ...p, description: e.target.value }))} /></label>
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setOpenNewCommittee(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Crear comite</button></div>
        </form>
      </Modal>

      <Modal open={sessionModal} title="Nueva sesion" onClose={() => setSessionModal(false)} size="md">
        <form className="form-grid" onSubmit={createSession}>
          <label><span>Fecha de sesion *</span><input type="date" value={sessionForm.sessionDate} onChange={e => setSessionForm(p => ({ ...p, sessionDate: e.target.value }))} required /></label>
          <label><span>Notas / Agenda</span><textarea rows={3} value={sessionForm.notes} onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))} placeholder="Resumen de la sesion, temas tratados..." /></label>
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setSessionModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar sesion</button></div>
        </form>
      </Modal>

      <Modal open={commitmentModal} title="Nuevo compromiso" onClose={() => setCommitmentModal(false)} size="md">
        <form className="form-grid" onSubmit={createCommitment}>
          <label><span>Descripcion *</span><textarea rows={2} value={commitmentForm.description} onChange={e => setCommitmentForm(p => ({ ...p, description: e.target.value }))} required /></label>
          <label><span>Asignado a</span><select value={commitmentForm.assignedTo} onChange={e => setCommitmentForm(p => ({ ...p, assignedTo: e.target.value }))}><option value="">Sin asignar</option>{users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}</select></label>
          <label><span>Fecha de cierre</span><input type="date" value={commitmentForm.dueDate} onChange={e => setCommitmentForm(p => ({ ...p, dueDate: e.target.value }))} /></label>
          <label><span>Estado inicial</span><select value={commitmentForm.status} onChange={e => setCommitmentForm(p => ({ ...p, status: e.target.value }))}><option value="pending">Pendiente</option><option value="in_progress">En curso</option></select></label>
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setCommitmentModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Crear compromiso</button></div>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="kpi-card tone-default">
      <div className="kpi-main">
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

const CATEGORY_ICONS = {
  direccionamiento_estrategico: <Compass size={18} />,
  proceso_misional: <Users size={18} />,
  proceso_apoyo: <ClipboardCheck size={18} />,
  proceso_evaluacion: <ShieldAlert size={18} />,
};
const EJES_TRANSVERSALES = {
  left: ["Cultura Organizacional", "Gestión de Tecnología"],
  right: ["Seguridad del Paciente", "Gestión del Riesgo"],
};

export function ProcessMapPage() {
  const { user } = useAuth();
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalProcess, setModalProcess] = useState(null);
  const [processCounts, setProcessCounts] = useState({});

  useEffect(() => {
    setLoading(true);
    api
      .get("/processes/grouped/")
      .then((res) => setGrouped(res.data || {}))
      .catch((err) => setError(extractError(err, "No se pudo cargar el mapa de procesos.")))
      .finally(() => setLoading(false));
  }, []);

  /* Cuando se abre el modal, traer conteo de documentos del proceso */
  useEffect(() => {
    if (!modalProcess) return;
    if (processCounts[modalProcess.id]) return;
    api.get(`/processes/${modalProcess.id}/summary/`).then(res => {
      setProcessCounts(prev => ({ ...prev, [modalProcess.id]: res.data?.counts || {} }));
    }).catch(() => {});
  }, [modalProcess, processCounts]);

  const roles = user?.roles || [];
  const isReadOnly = roles.length > 0 && roles.every((r) => String(r || "").toLowerCase() === "reader");

  const totalProcesses = PROCESS_CATEGORY_ORDER.reduce((sum, k) => sum + (grouped[k]?.length || 0), 0);

  const renderCard = (variant = "") => (process) => (
    <div
      key={process.id}
      role="button"
      tabIndex={0}
      className={`misional-item ${variant}`}
      onClick={() => setModalProcess(process)}
      onKeyDown={(e) => e.key === "Enter" && setModalProcess(process)}
    >
      <div className="misional-code">{process.name}</div>
      <div className="misional-desc">{process.description || "—"}</div>
      {process.code && <div className="misional-badge">{process.code}</div>}
    </div>
  );

  const sections = PROCESS_CATEGORY_ORDER.filter((key) => grouped[key]?.length > 0);
  const counts = modalProcess ? (processCounts[modalProcess.id] || {}) : {};

  return (
    <div className="pmap-page">
      {/* ── Header institucional ── */}
      <div className="pmap-header">
        <div className="pmap-header-inner">
          <div className="pmap-header-icon"><FolderKanban size={32} /></div>
          <div>
            <h1>Mapa de Procesos</h1>
            <p>Arquitectura Institucional — SGI Hospital San Vicente de Paúl</p>
          </div>
        </div>
        <div className="pmap-header-meta">
          <div className={`role-badge ${isReadOnly ? "readonly" : "contribution"}`}>
            {isReadOnly ? <Eye size={14} /> : <Pencil size={14} />}
            <span>{isReadOnly ? "Solo lectura" : "Modo contribución"}</span>
          </div>
          <span className="pmap-count">{totalProcesses} procesos</span>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <div className="process-map-loader" />
        </div>
      ) : (
        <div className="pmap-layout">
          {/* ── 1. Direccionamiento Estratégico ── */}
          {grouped.direccionamiento_estrategico?.length > 0 && (
            <div className="pmap-section">
              <div className="pmap-section-header estrategico">
                <Compass size={18} />
                <span>Direccionamiento Estratégico</span>
                <span className="pmap-section-count">{grouped.direccionamiento_estrategico.length}</span>
              </div>
              <div className="misionales-grid variant-estrategico">
                {grouped.direccionamiento_estrategico.map(renderCard("variant-estrategico"))}
              </div>
            </div>
          )}

          {/* ── 2. Misionales con Ejes Transversales ── */}
          {grouped.proceso_misional?.length > 0 && (
            <div className="pmap-section">
              <div className="pmap-section-header misional">
                <Users size={18} />
                <span>Procesos Misionales</span>
                <span className="pmap-section-count">{grouped.proceso_misional.length}</span>
              </div>
              <div className="pmap-misional-wrap">
                {/* Ejes izquierdos */}
                <div className="pmap-ejes-col">
                  {EJES_TRANSVERSALES.left.map(eje => (
                    <div key={eje} className="pmap-eje-pill left">{eje}</div>
                  ))}
                </div>

                {/* Grid misional */}
                <div className="misionales-grid">
                  {grouped.proceso_misional.map(renderCard())}
                </div>

                {/* Ejes derechos */}
                <div className="pmap-ejes-col">
                  {EJES_TRANSVERSALES.right.map(eje => (
                    <div key={eje} className="pmap-eje-pill right">{eje}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 3. Proceso de Apoyo ── */}
          {grouped.proceso_apoyo?.length > 0 && (
            <div className="pmap-section">
              <div className="pmap-section-header apoyo">
                <ClipboardCheck size={18} />
                <span>Procesos de Apoyo</span>
                <span className="pmap-section-count">{grouped.proceso_apoyo.length}</span>
              </div>
              <div className="misionales-grid variant-apoyo">
                {grouped.proceso_apoyo.map(renderCard("variant-apoyo"))}
              </div>
            </div>
          )}

          {/* ── 4. Proceso de Evaluación ── */}
          {grouped.proceso_evaluacion?.length > 0 && (
            <div className="pmap-section">
              <div className="pmap-section-header evaluacion">
                <ShieldAlert size={18} />
                <span>Procesos de Evaluación y Control</span>
                <span className="pmap-section-count">{grouped.proceso_evaluacion.length}</span>
              </div>
              <div className="misionales-grid variant-evaluacion">
                {grouped.proceso_evaluacion.map(renderCard("variant-evaluacion"))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal detalle proceso ── */}
      {modalProcess ? (
        <div className="process-modal-overlay" role="dialog" aria-modal="true" onClick={() => setModalProcess(null)}>
          <div className="process-modal-card open" onClick={(e) => e.stopPropagation()}>
            <div className="process-modal-banner">
              <button type="button" className="process-modal-close" onClick={() => setModalProcess(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
              <div className="process-modal-icon"><FolderKanban size={24} /></div>
            </div>
            <div className="process-modal-body">
              <h3>{modalProcess.name}</h3>
              <span className="code">{modalProcess.code || modalProcess.category || "—"}</span>
              <p className="desc">{modalProcess.description || "Sin descripción."}</p>
              <div className="process-modal-stats">
                <div className="cell"><div className="label">Responsable</div><div>{modalProcess.responsible || "No asignado"}</div></div>
                <div className="cell"><div className="label">Documentos</div><div>{counts.documents ?? "…"}</div></div>
                <div className="cell"><div className="label">Indicadores</div><div>{counts.indicators ?? "…"}</div></div>
                <div className="cell"><div className="label">Riesgos</div><div>{counts.risks ?? "…"}</div></div>
              </div>
              <div className="process-modal-actions">
                <Link to={`/process-map/${modalProcess.id}`} className="btn-detail" onClick={() => setModalProcess(null)}>
                  <Compass size={18} /> Caracterización SGI
                </Link>
                <Link to={`/ecosystem?processId=${modalProcess.id}`} className="btn-eco" onClick={() => setModalProcess(null)}>
                  <FolderKanban size={18} /> Centro del Proceso
                </Link>
                <Link to={`/documents`} className="btn-eco" onClick={() => setModalProcess(null)}>
                  <FileText size={18} /> Documentos
                </Link>
                <Link to={`/indicators`} className="btn-eco" onClick={() => setModalProcess(null)}>
                  <Timer size={18} /> Indicadores
                </Link>
                <Link to={`/risks`} className="btn-eco" onClick={() => setModalProcess(null)}>
                  <ShieldAlert size={18} /> Riesgos
                </Link>
                <button type="button" className="btn-eco" onClick={() => setModalProcess(null)}>
                  <X size={18} /> Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProcessDetailPage() {
  const { processId } = useParams();
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [activeTab, setActiveTab] = useState("caracterizacion");
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);

  useEffect(() => {
    if (!processId) return;
    setSummary(null);
    setHealth(null);
    setError("");
    Promise.all([api.get(`/processes/${processId}/summary/`), api.get(`/processes/${processId}/health/`)])
      .then(([summaryRes, healthRes]) => {
        setSummary(summaryRes.data);
        setHealth(healthRes.data);
      })
      .catch((err) => setError(extractError(err, "No se pudo cargar el detalle de proceso.")));
  }, [processId]);

  const loadTab = useCallback(
    async (tabId) => {
      if (!processId) return;
      setTabLoading(true);
      setTabData((prev) => ({ ...prev, [tabId]: null }));
      try {
        if (tabId === "caracterizacion") {
          const res = await api.get(`/process-characterization/${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: res.data }));
        } else if (tabId === "indicadores") {
          const res = await api.get(`/indicators/?process=${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: normalizeCollection(res.data) }));
        } else if (tabId === "documentos") {
          const res = await api.get(`/documents/?process=${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: normalizeCollection(res.data) }));
        } else if (tabId === "riesgos") {
          const res = await api.get(`/risks/matrix-5x5/?processId=${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: res.data }));
        } else if (tabId === "mejora") {
          const res = await api.get(`/actions/?process=${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: normalizeCollection(res.data) }));
        } else if (tabId === "eventos") {
          const res = await api.get(`/adverse-events/?process=${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: normalizeCollection(res.data) }));
        } else if (tabId === "comites") {
          const res = await api.get(`/committees/?process=${processId}`);
          setTabData((prev) => ({ ...prev, [tabId]: normalizeCollection(res.data) }));
        } else if (tabId === "salud") {
          setTabData((prev) => ({ ...prev, [tabId]: health }));
        }
      } catch (err) {
        setTabData((prev) => ({ ...prev, [tabId]: { error: extractError(err, "Error al cargar") } }));
      } finally {
        setTabLoading(false);
      }
    },
    [processId, health]
  );

  useEffect(() => {
    if (summary && activeTab === "salud") setTabData((prev) => ({ ...prev, salud: health }));
  }, [summary, health, activeTab]);

  useEffect(() => {
    if (!processId || !summary) return;
    loadTab(activeTab);
  }, [processId, summary, activeTab, loadTab]);

  if (error) return <p className="error">{error}</p>;
  if (!summary || !health) return <p>Cargando proceso...</p>;

  const counts = summary.counts || {};
  const renderTabContent = () => {
    if (tabLoading && !tabData[activeTab]) return <div className="tab-pane active"><div className="loading-msg">Cargando...</div></div>;
    const data = tabData[activeTab];
    if (activeTab === "caracterizacion") {
      if (data?.error) return <div className="tab-pane active"><div className="empty-msg">{data.error}</div></div>;
      if (!data || (typeof data === "object" && !data.objective && !data.scope && !data.responsible))
        return <div className="tab-pane active"><div className="empty-msg">Sin caracterización registrada.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="p-4">
            <dl className="form-grid">
              <dt className="font-semibold text-muted">Objetivo</dt><dd>{data.objective || "—"}</dd>
              <dt className="font-semibold text-muted">Alcance</dt><dd>{data.scope || "—"}</dd>
              <dt className="font-semibold text-muted">Responsable</dt><dd>{data.responsible || "—"}</dd>
            </dl>
          </div>
        </div>
      );
    }
    if (activeTab === "indicadores") {
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) return <div className="tab-pane active"><div className="empty-msg">Sin indicadores para este proceso.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Meta</th><th>Actual</th><th>Estado</th></tr></thead>
              <tbody>
                {list.map((i) => {
                  const t = Number(i.target || 0); const c = Number(i.current ?? i.current_value ?? 0);
                  const ok = t > 0 && c >= t; const st = ok ? "Cumple" : (c >= t * 0.8 ? "Riesgo" : "Crítico");
                  return (
                    <tr key={i.id}><td>{i.name || "—"}</td><td>{i.target ?? "—"}</td><td>{i.current ?? i.current_value ?? "—"}</td>
                      <td><StatusBadge status={ok ? "closed" : "open"} /></td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeTab === "documentos") {
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) return <div className="tab-pane active"><div className="empty-msg">Sin documentos para este proceso.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td>{d.originalname || d.filename || "—"}</td>
                    <td>{formatDate(d.created_at || d.createdAt)}</td>
                    <td><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeTab === "riesgos") {
      const grid = data?.grid || [];
      const topRisks = data?.topRisks || data?.top_risks || [];
      const total = data?.total ?? topRisks.length;
      if (!total) return <div className="tab-pane active"><div className="empty-msg">Sin riesgos para este proceso.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="p-4">
            <p className="muted-label mb-3">Matriz Probabilidad x Impacto (5x5)</p>
            <div className="rm-modern rm-compact">
              <div className="rm-axis-y"><span>PROB.</span></div>
              <div className="rm-body">
                <div className="rm-y-labels">{[5,4,3,2,1].map(n => <div key={n} className="rm-y-num">{n}</div>)}</div>
                <div className="rm-grid-wrap">
                  <div className="rm-grid">
                    {[4,3,2,1,0].map(p => [0,1,2,3,4].map(s => {
                      const arr = grid[p] && grid[p][s] ? grid[p][s] : [];
                      const level = (p + 1) * (s + 1);
                      let zone = "z-low";
                      if (level >= 16) zone = "z-extreme";
                      else if (level >= 10) zone = "z-high";
                      else if (level >= 5) zone = "z-moderate";
                      return (
                        <div key={`${p}-${s}`} className={`rm-cell ${zone} ${arr.length ? "has-items" : ""}`} title={`Nivel ${level} — ${arr.length} riesgo(s)`}>
                          <span className="rm-cell-level">{level}</span>
                          {arr.length > 0 && <span className="rm-cell-count">{arr.length}</span>}
                        </div>
                      );
                    }))}
                  </div>
                  <div className="rm-x-labels">{[1,2,3,4,5].map(n => <div key={n} className="rm-x-num">{n}</div>)}</div>
                </div>
              </div>
              <div className="rm-axis-x"><span>IMPACTO</span></div>
            </div>
            <h4 className="mt-4 mb-2">Top riesgos</h4>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Titulo</th><th>Severidad</th><th>Probabilidad</th></tr></thead>
                <tbody>
                  {topRisks.slice(0, 8).map((r) => (
                    <tr key={r.id}><td>{r.title || "—"}</td><td>{r.severity || "—"}</td><td>{r.probability || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    if (activeTab === "mejora") {
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) return <div className="tab-pane active"><div className="empty-msg">Sin acciones para este proceso.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Título</th><th>Vencimiento</th><th>Estado</th></tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}><td>{a.title || "—"}</td><td>{formatDate(a.due_date || a.dueDate)}</td><td><StatusBadge status={a.status} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeTab === "eventos") {
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) return <div className="tab-pane active"><div className="empty-msg">Sin eventos adversos reportados.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Título</th><th>Severidad</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title || "—"}</td><td>{e.severity || "—"}</td><td><StatusBadge status={e.status} /></td>
                    <td>{formatDate(e.occurred_at || e.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeTab === "comites") {
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) return <div className="tab-pane active"><div className="empty-msg">Sin comités asociados a este proceso.</div></div>;
      return (
        <div className="tab-pane active">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Descripción</th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}><td>{c.name || "—"}</td><td>{c.description || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeTab === "salud") {
      const h = data || health;
      const nivel = h?.nivel || "—";
      const cls = nivel === "critico" ? "danger" : nivel === "atencion" ? "warning" : "success";
      return (
        <div className="tab-pane active">
          <div className="p-4">
            <h3 className="mb-3">Panel de salud</h3>
            <div className="kpi-grid mb-4">
              <KpiCard title="Score" value={h?.score ?? "—"} tone="info" />
              <KpiCard title="Nivel" value={nivel} tone={cls} />
            </div>
            <dl className="form-grid">
              <dt>Documentos</dt><dd>{h?.metrics?.documentos ?? 0}</dd>
              <dt>Vigentes</dt><dd>{h?.metrics?.documentosVigentes ?? 0}</dd>
              <dt>Indicadores</dt><dd>{h?.metrics?.indicadores ?? 0}</dd>
              <dt>Riesgos</dt><dd>{h?.metrics?.riesgos ?? 0}</dd>
              <dt>Acciones abiertas</dt><dd>{h?.metrics?.accionesAbiertas ?? 0}</dd>
              <dt>Eventos abiertos</dt><dd>{h?.metrics?.eventosAbiertos ?? 0}</dd>
            </dl>
          </div>
        </div>
      );
    }
    return <div className="tab-pane active"><div className="empty-msg">—</div></div>;
  };

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link to="/process-map" className="inline-link">← Volver al mapa</Link>
      </div>
      <SectionCard
        title={summary.name}
        subtitle={(summary.code ? `${summary.code} – ` : "") + (summary.description || "Sin descripción")}
        actions={
          <div className="flex gap-2 flex-wrap">
            <span className="badge info"><FileText size={14} /> {counts.documents ?? 0} docs</span>
            <span className="badge success"><Timer size={14} /> {counts.indicators ?? 0} ind</span>
            <span className="badge warning"><ShieldAlert size={14} /> {counts.risks ?? 0} riesgos</span>
            <span className="badge info"><ClipboardCheck size={14} /> {counts.actions ?? 0} acciones</span>
            <span className="badge danger"><AlertTriangle size={14} /> {counts.adverseEvents ?? 0} eventos</span>
            <span className="badge muted"><Users size={14} /> {counts.committees ?? 0} comités</span>
          </div>
        }
      >
        <div className="kpi-grid mb-4">
          <StatCard label="Score de salud" value={health.score} />
          <StatCard label="Nivel" value={health.nivel} />
        </div>
        <div className="process-detail-tabs">
          {PROCESS_DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {renderTabContent()}
      </SectionCard>
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
    </div>
  );
}

const ECOSYSTEM_CONFIG = {
  "DE-GG": { label: "Gestion Gerencial", fields: [{ key: "plan", label: "Plan estrategico" }, { key: "indicador", label: "Indicador" }, { key: "valor", label: "Valor" }, { key: "estado", label: "Estado", type: "select", options: ["En curso", "Cumplido", "Pendiente"] }] },
  "DE-GU": { label: "Gestion al Usuario", fields: [{ key: "tipo", label: "Tipo", type: "select", options: ["Peticion", "Queja", "Sugerencia"] }, { key: "descripcion", label: "Descripcion" }, { key: "solicitante", label: "Solicitante" }, { key: "estado", label: "Estado", type: "select", options: ["Recibido", "En proceso", "Resuelto"] }] },
  "PM-ADCT": { label: "Apoyo Diagnostico", fields: [{ key: "tipoExamen", label: "Tipo examen" }, { key: "paciente", label: "Paciente" }, { key: "medicoSolicitante", label: "Medico solicitante" }, { key: "estado", label: "Estado", type: "select", options: ["Ordenado", "En proceso", "Entregado"] }] },
  "PM-AP": { label: "Atencion Prioritaria", fields: [{ key: "nivelTriage", label: "Nivel triage", type: "select", options: ["I", "II", "III", "IV", "V"] }, { key: "motivoConsulta", label: "Motivo consulta" }, { key: "signosVitales", label: "Signos vitales" }, { key: "disposicion", label: "Disposicion", type: "select", options: ["Alta", "Observacion", "Remision", "Hospitalizacion"] }] },
  "PM-CE": { label: "Consulta Externa", fields: [{ key: "paciente", label: "Paciente" }, { key: "especialidad", label: "Especialidad" }, { key: "fechaCita", label: "Fecha cita", type: "date" }, { key: "estado", label: "Estado", type: "select", options: ["Programada", "Asistio", "No asistio", "Cancelada"] }] },
  "PM-AS": { label: "Apoyo en Salud", fields: [{ key: "servicio", label: "Servicio", type: "select", options: ["Enfermeria", "Farmacia", "Rehabilitacion", "Nutricion"] }, { key: "paciente", label: "Paciente" }, { key: "descripcion", label: "Descripcion" }, { key: "estado", label: "Estado", type: "select", options: ["Solicitado", "En proceso", "Completado"] }] },
  "PM-INT": { label: "Internacion", fields: [{ key: "paciente", label: "Paciente" }, { key: "cama", label: "Cama" }, { key: "diagnostico", label: "Diagnostico" }, { key: "estado", label: "Estado", type: "select", options: ["Ingresado", "En estancia", "Alta"] }] },
  "PM-PMS": { label: "Promocion y Mantenimiento de la Salud", fields: [{ key: "programa", label: "Programa" }, { key: "beneficiario", label: "Beneficiario" }, { key: "actividad", label: "Actividad" }, { key: "estado", label: "Estado", type: "select", options: ["Programado", "Realizado", "Pendiente"] }] },
  "PA-GRF": { label: "Gestion Recursos Fisicos", fields: [{ key: "equipo", label: "Equipo" }, { key: "ubicacion", label: "Ubicacion" }, { key: "estado", label: "Estado", type: "select", options: ["Operativo", "Mantenimiento", "Fuera de servicio"] }] },
  "PA-SI": { label: "Sistemas de Informacion", fields: [{ key: "sistema", label: "Sistema" }, { key: "estado", label: "Estado", type: "select", options: ["Operativo", "Incidente", "Mantenimiento"] }, { key: "observacion", label: "Observacion" }] },
  "PA-GJ": { label: "Gestion Juridica", fields: [{ key: "tipo", label: "Tipo", type: "select", options: ["Contrato", "Demanda", "Normativa", "Otro"] }, { key: "descripcion", label: "Descripcion" }, { key: "estado", label: "Estado", type: "select", options: ["En tramite", "Resuelto", "Archivado"] }] },
  "PA-GAF": { label: "Gestion Administrativa y Financiera", fields: [{ key: "concepto", label: "Concepto" }, { key: "valor", label: "Valor" }, { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Pagado", "En tramite"] }] },
  "PA-GTH": { label: "Gestion Talento Humano", fields: [{ key: "empleado", label: "Empleado" }, { key: "actividad", label: "Actividad" }, { key: "estado", label: "Estado", type: "select", options: ["Programado", "Completado", "Pendiente"] }] },
  "PE-EC": { label: "Evaluacion y Control", fields: [{ key: "auditoria", label: "Auditoria" }, { key: "hallazgos", label: "Hallazgos" }, { key: "estado", label: "Estado", type: "select", options: ["En curso", "Cerrado", "Seguimiento"] }] },
  "PE-MC": { label: "Mejoramiento Continuo", fields: [{ key: "plan", label: "Plan" }, { key: "objetivo", label: "Objetivo" }, { key: "estado", label: "Estado", type: "select", options: ["En ejecucion", "Completado", "Cancelado"] }] },
};

export function EcosystemPage() {
  const [searchParams] = useSearchParams();
  const processIdParam = searchParams.get("processId") || "";
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState(processIdParam);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [records, setRecords] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [activeTab, setActiveTab] = useState("ecosistema");
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get("/processes/").then(res => { const procs = normalizeCollection(res.data); setProcesses(procs); if (!selectedProcessId && procs.length) setSelectedProcessId(procs[0].id); }).catch(err => setError(extractError(err, "No se pudieron cargar los procesos."))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProcessId) { setSelectedProcess(null); return; }
    const proc = processes.find(p => p.id === selectedProcessId);
    setSelectedProcess(proc || null);
  }, [selectedProcessId, processes]);

  const processCode = selectedProcess?.code || "";
  const ecoConfig = ECOSYSTEM_CONFIG[processCode] || null;

  const loadRecords = useCallback(async () => {
    if (!selectedProcessId) return;
    try {
      const [recRes, docRes, indRes, riskRes] = await Promise.all([
        api.get(`/ecosystem/?process=${selectedProcessId}`).catch(() => ({ data: [] })),
        api.get(`/documents/?process=${selectedProcessId}`).catch(() => ({ data: [] })),
        api.get(`/indicators/?process=${selectedProcessId}`).catch(() => ({ data: [] })),
        api.get(`/risks/?process=${selectedProcessId}`).catch(() => ({ data: [] })),
      ]);
      setRecords(normalizeCollection(recRes.data));
      setDocuments(normalizeCollection(docRes.data));
      setIndicators(normalizeCollection(indRes.data));
      setRisks(normalizeCollection(riskRes.data));
    } catch { /* */ }
  }, [selectedProcessId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);

  const submitRecord = async (e) => {
    e.preventDefault();
    if (!selectedProcessId) return;
    try {
      await api.post("/ecosystem/", { process: selectedProcessId, record_type: "document", ref_id: "00000000-0000-0000-0000-000000000000", title: JSON.stringify(form), status: form.estado || "Activo" });
      setToast({ type: "success", message: "Registro creado." });
      setForm({});
      await loadRecords();
    } catch (err) { setToast({ type: "error", message: extractError(err, "Error al crear registro.") }); }
  };

  const deleteRecord = async (rec) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try { await api.delete(`/ecosystem/${rec.id}/`); setToast({ type: "success", message: "Eliminado." }); await loadRecords(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); }
  };

  const parseTitle = (title) => { try { return JSON.parse(title); } catch { return { raw: title }; } };

  const ecoTabs = [{ id: "ecosistema", label: "Ecosistema" }, { id: "documentos", label: `Documentos (${documents.length})` }, { id: "indicadores", label: `Indicadores (${indicators.length})` }, { id: "riesgos", label: `Riesgos (${risks.length})` }];

  return (
    <div className="stack-xl">
      <PageHeader title="Centro del Proceso" subtitle="Ecosistema operativo por proceso" />
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      {error ? <p className="error">{error}</p> : null}

      <SectionCard title="Seleccionar Proceso">
        <div className="filters-grid">
          <label><span>Proceso</span>
            <select value={selectedProcessId} onChange={e => setSelectedProcessId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {processes.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ""}{p.name}</option>)}
            </select>
          </label>
        </div>
        {selectedProcess && (
          <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <span className="badge info">{selectedProcess.code || "—"}</span>
            <strong>{selectedProcess.name}</strong>
            <small className="muted-label">{selectedProcess.description || ""}</small>
            <Link to={`/process-map/${selectedProcessId}`} className="inline-link">Ver caracterizacion →</Link>
          </div>
        )}
      </SectionCard>

      {selectedProcess && (
        <>
          <div className="process-detail-tabs">
            {ecoTabs.map(tab => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          </div>

          {activeTab === "ecosistema" && (
            <SectionCard title={ecoConfig ? ecoConfig.label : "Registros del ecosistema"} subtitle={`Proceso: ${selectedProcess.name}`}>
              {ecoConfig ? (
                <form className="form-grid" onSubmit={submitRecord} style={{ marginBottom: "1.5rem" }}>
                  {ecoConfig.fields.map(f => (
                    <label key={f.key}>
                      <span>{f.label}</span>
                      {f.type === "select" ? (
                        <select value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                          <option value="">Seleccionar</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === "date" ? (
                        <input type="date" value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      ) : (
                        <input value={form[f.key] || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      )}
                    </label>
                  ))}
                  <div className="row-actions"><button type="submit" className="btn btn-primary">Agregar registro</button></div>
                </form>
              ) : <p className="muted-label">No hay configuracion especifica para el codigo [{processCode}]. Usa el formulario generico.</p>}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {ecoConfig ? ecoConfig.fields.map(f => <th key={f.key}>{f.label}</th>) : <><th>Titulo</th><th>Estado</th></>}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec => {
                      const parsed = parseTitle(rec.title);
                      return (
                        <tr key={rec.id}>
                          {ecoConfig ? ecoConfig.fields.map(f => <td key={f.key}>{parsed[f.key] || "—"}</td>) : <><td>{rec.title}</td><td>{rec.status || "—"}</td></>}
                          <td><button type="button" className="btn btn-danger" onClick={() => deleteRecord(rec)}>Eliminar</button></td>
                        </tr>
                      );
                    })}
                    {!records.length && <tr><td colSpan={ecoConfig ? ecoConfig.fields.length + 1 : 3} style={{ textAlign: "center", padding: "2rem" }}>Sin registros</td></tr>}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {activeTab === "documentos" && (
            <SectionCard title="Documentos del Proceso" subtitle={`${documents.length} documentos`}>
              <DataTable columns={[
                { key: "name", label: "Nombre", render: d => d.originalname || d.filename || "—" },
                { key: "type", label: "Tipo", render: d => d.type_name || d.typeName || "—" },
                { key: "status", label: "Estado", render: d => <StatusBadge status={d.status} /> },
                { key: "date", label: "Fecha", render: d => formatDate(d.created_at || d.createdAt) },
              ]} rows={documents} emptyText="Sin documentos para este proceso." />
            </SectionCard>
          )}

          {activeTab === "indicadores" && (
            <SectionCard title="Indicadores del Proceso" subtitle={`${indicators.length} indicadores`}>
              <DataTable columns={[
                { key: "name", label: "Nombre", render: i => i.name || "—" },
                { key: "target", label: "Meta", render: i => i.target ?? "—" },
                { key: "current", label: "Actual", render: i => i.current ?? "—" },
                { key: "status", label: "Estado", render: i => { const t = Number(i.target||0); const c = Number(i.current??0); return <StatusBadge status={t > 0 && c >= t ? "closed" : "open"} />; }},
              ]} rows={indicators} emptyText="Sin indicadores para este proceso." />
            </SectionCard>
          )}

          {activeTab === "riesgos" && (
            <SectionCard title="Riesgos del Proceso" subtitle={`${risks.length} riesgos`}>
              <DataTable columns={[
                { key: "title", label: "Riesgo", render: r => r.title || "—" },
                { key: "severity", label: "Severidad", render: r => r.severity || "—" },
                { key: "probability", label: "Probabilidad", render: r => r.probability || "—" },
                { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
              ]} rows={risks} emptyText="Sin riesgos para este proceso." />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("");
  const [processFilter, setProcessFilter] = useState("");
  const [processes, setProcesses] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  useEffect(() => { api.get("/processes/").then(res => setProcesses(normalizeCollection(res.data))).catch(err => setError(extractError(err, "No se pudieron cargar los procesos."))); }, []);
  const search = async (event) => {
    event.preventDefault(); setError(""); setSearched(true);
    try {
      let url = `/search?q=${encodeURIComponent(query)}`;
      if (entity) url += `&entity=${entity}`;
      if (processFilter) url += `&processId=${processFilter}`;
      const { data } = await api.get(url);
      setResults(data.results || []);
    } catch (err) { setError(extractError(err, "Error en búsqueda.")); }
  };
  const grouped = useMemo(() => { const map = {}; for (const r of results) { const type = r.type || "otros"; if (!map[type]) map[type] = []; map[type].push(r); } return map; }, [results]);
  const entityLabels = { processes: "Procesos", documents: "Documentos", indicators: "Indicadores", risks: "Riesgos", events: "Eventos adversos" };
  return (
    <div className="stack-xl">
      <PageHeader title="Búsqueda Global" subtitle="Busca en todos los módulos del sistema" />
      <SectionCard title="Filtros de búsqueda">
        <form className="filters-grid" onSubmit={search}>
          <label><span>Texto</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="proceso, riesgo, documento..." /></label>
          <label><span>Entidad</span><select value={entity} onChange={(e) => setEntity(e.target.value)}><option value="">Todas</option><option value="documents">Documentos</option><option value="processes">Procesos</option><option value="indicators">Indicadores</option><option value="risks">Riesgos</option><option value="events">Eventos adversos</option></select></label>
          <label><span>Proceso</span><select value={processFilter} onChange={(e) => setProcessFilter(e.target.value)}><option value="">Todos</option>{processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="align-end"><button className="btn btn-primary" type="submit">Buscar</button></div>
        </form>
      </SectionCard>
      {error ? <p className="error">{error}</p> : null}
      {searched && Object.keys(grouped).length === 0 && <SectionCard title="Resultados"><EmptyHint text="Sin resultados." /></SectionCard>}
      {Object.entries(grouped).map(([type, items]) => (
        <SectionCard key={type} title={entityLabels[type] || type} subtitle={`${items.length} resultado(s)`}>
          <ul className="item-list">{items.map((row) => (<li key={`${row.type}-${row.id}`}><div><strong>{row.title || row.name || row.originalname || "—"}</strong><small>{row.description || row.status || ""}</small></div><StatusBadge status={row.status || type} /></li>))}</ul>
        </SectionCard>
      ))}
    </div>
  );
}

export function MyWorkPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/my-work").then((res) => setData(res.data)).catch((err) => setError(extractError(err, "No se pudo cargar Mi Trabajo."))); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Cargando...</p>;
  const actionsList = data.actions?.items || [];
  const commitmentsList = data.commitments?.items || [];
  const ticketsList = data.supportTickets?.items || [];
  return (
    <div className="stack-xl">
      <PageHeader title="Mi Trabajo" subtitle="Plan individual de tareas y compromisos asignados" />
      <div className="kpi-grid">
        <KpiCard title="Acciones pendientes" value={formatNumber(data.actions?.pending || 0)} helper="Por completar" icon={<ClipboardCheck size={20} />} tone="warning" />
        <KpiCard title="Acciones vencidas" value={formatNumber(data.actions?.overdue || 0)} helper="Fuera de plazo" icon={<AlertTriangle size={20} />} tone="danger" />
        <KpiCard title="Compromisos pendientes" value={formatNumber(data.commitments?.pending || 0)} helper="Abiertos" icon={<Timer size={20} />} tone="warning" />
        <KpiCard title="Compromisos vencidos" value={formatNumber(data.commitments?.overdue || 0)} helper="Fuera de plazo" icon={<AlertTriangle size={20} />} tone="danger" />
        <KpiCard title="Tickets abiertos" value={formatNumber(data.supportTickets?.open || 0)} helper="Soporte" icon={<FileText size={20} />} tone="info" />
      </div>
      <SectionCard title="Acciones asignadas" subtitle={`${actionsList.length} acciones`}>
        {actionsList.length ? (<div className="table-wrap"><table><thead><tr><th>Título</th><th>Prioridad</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody>{actionsList.map(a => (<tr key={a.id}><td>{a.title || "—"}</td><td>{a.priority || "—"}</td><td>{formatDate(a.dueDate || a.due_date)}</td><td><StatusBadge status={a.status} /></td></tr>))}</tbody></table></div>) : <EmptyHint text="No tienes acciones asignadas." />}
      </SectionCard>
      <SectionCard title="Compromisos de comités" subtitle={`${commitmentsList.length} compromisos`}>
        {commitmentsList.length ? (<div className="table-wrap"><table><thead><tr><th>Descripción</th><th>Comité</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody>{commitmentsList.map(c => (<tr key={c.id}><td>{c.description || "—"}</td><td>{c.committeeName || "—"}</td><td>{formatDate(c.dueDate || c.due_date)}</td><td><StatusBadge status={c.status} /></td></tr>))}</tbody></table></div>) : <EmptyHint text="No tienes compromisos pendientes." />}
      </SectionCard>
      <SectionCard title="Tickets de soporte" subtitle={`${ticketsList.length} tickets`}>
        {ticketsList.length ? (<div className="table-wrap"><table><thead><tr><th>Asunto</th><th>Módulo</th><th>Prioridad</th><th>Estado</th></tr></thead><tbody>{ticketsList.map(t => (<tr key={t.id}><td>{t.subject || "—"}</td><td>{t.module || "—"}</td><td>{t.priority || "—"}</td><td><StatusBadge status={t.status} /></td></tr>))}</tbody></table></div>) : <EmptyHint text="No tienes tickets abiertos." />}
      </SectionCard>
    </div>
  );
}

export function SupportPage() {
  const { user, hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole(["admin"]);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", module: "", priority: "medium", subject: "", message: "", attachment: null });
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: [], byPriority: [] });
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveResponse, setResolveResponse] = useState("");
  const [resolving, setResolving] = useState(false);
  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);
  const loadTickets = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([api.get("/support/"), api.get("/support/statistics/")]);
      setTickets(normalizeCollection(listRes.data));
      setStats(statsRes.data || { total: 0, byStatus: [], byPriority: [] });
    } catch { /* */ }
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);
  const submitTicket = async (e) => {
    e.preventDefault(); setSending(true);
    try {
      const payload = new FormData();
      payload.append("name", form.name); payload.append("email", form.email); payload.append("module", form.module); payload.append("priority", form.priority); payload.append("subject", form.subject); payload.append("message", form.message);
      if (form.attachment) payload.append("attachment", form.attachment);
      await api.post("/support/", payload);
      setToast({ type: "success", message: "Ticket enviado correctamente." });
      setForm({ name: user?.name || "", email: user?.email || "", module: "", priority: "medium", subject: "", message: "", attachment: null });
      await loadTickets();
    } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo enviar el ticket.") }); } finally { setSending(false); }
  };
  const getCountByStatus = (status) => (stats.byStatus || []).find(s => (s.status || "").toLowerCase() === (status || "").toLowerCase())?.count ?? 0;
  const openCount = getCountByStatus("open");
  const inProgressCount = getCountByStatus("in_progress");
  const closedCount = getCountByStatus("closed");
  const resolveTicket = async (e) => {
    e.preventDefault();
    if (!resolveModal?.id) return;
    setResolving(true);
    try {
      await api.patch(`/support/${resolveModal.id}/`, { status: "closed", response: resolveResponse || "Tu solicitud ha sido resuelta por el equipo de soporte." });
      setToast({ type: "success", message: "Ticket marcado como resuelto. Se ha enviado un correo al usuario." });
      setResolveModal(null);
      setResolveResponse("");
      await loadTickets();
    } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo actualizar el ticket.") }); } finally { setResolving(false); }
  };
  const columns = [
    { key: "subject", label: "Asunto", render: (t) => t.subject || "—" },
    { key: "module", label: "Módulo", render: (t) => t.module || "—" },
    { key: "priority", label: "Prioridad", render: (t) => <StatusBadge status={t.priority || "medium"} /> },
    { key: "status", label: "Estado", render: (t) => <StatusBadge status={t.status || "open"} /> },
    { key: "date", label: "Fecha", render: (t) => formatDate(t.created_at || t.createdAt) },
  ];
  if (isAdmin) {
    columns.push({
      key: "actions",
      label: "Resolución",
      render: (t) => t.status === "closed" ? <span className="muted-label">Resuelto</span> : (
        <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setResolveModal(t); }}>Marcar resuelto</button>
      ),
    });
  }
  return (
    <div className="stack-xl">
      <PageHeader title="Soporte" subtitle="Envía solicitudes de soporte y consulta tus tickets" />
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      <SectionCard title="Dashboard de casos" subtitle="Resumen de tickets de soporte">
        <div className="kpi-grid">
          <KpiCard title="Total" value={formatNumber(stats.total)} helper="Tickets" icon={<LifeBuoy size={20} />} tone="info" />
          <KpiCard title="Abiertos" value={formatNumber(openCount)} helper="Pendientes" icon={<FileText size={20} />} tone="warning" />
          <KpiCard title="En progreso" value={formatNumber(inProgressCount)} helper="En atención" icon={<Timer size={20} />} tone="info" />
          <KpiCard title="Resueltos" value={formatNumber(closedCount)} helper="Cerrados" icon={<CheckCircle2 size={20} />} tone="success" />
        </div>
      </SectionCard>
      <div className="two-column-grid">
        <SectionCard title="Nuevo ticket de soporte">
          <form className="form-grid" onSubmit={submitTicket}>
            <label><span>Nombre *</span><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></label>
            <label><span>Correo *</span><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></label>
            <label><span>Módulo</span><select value={form.module} onChange={e => setForm(p => ({ ...p, module: e.target.value }))}><option value="">Seleccionar</option><option value="documentos">Documentos</option><option value="indicadores">Indicadores</option><option value="riesgos">Riesgos</option><option value="acciones">Acciones</option><option value="comites">Comités</option><option value="mapa">Mapa de procesos</option><option value="otro">Otro</option></select></label>
            <label><span>Prioridad</span><select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
            <label><span>Asunto *</span><input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required /></label>
            <label><span>Mensaje *</span><textarea rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required /></label>
            <label><span>Adjunto (PNG, JPG, PDF)</span><input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={e => setForm(p => ({ ...p, attachment: e.target.files?.[0] || null }))} /></label>
            <div className="row-actions"><button type="submit" className="btn btn-primary" disabled={sending}>{sending ? "Enviando..." : "Enviar ticket"}</button></div>
          </form>
        </SectionCard>
        <SectionCard title="Información de contacto">
          <div className="stack-lg"><div><strong>Correo:</strong> soporte@hospital.gov.co</div><div><strong>Teléfono:</strong> (601) 000-0000 ext. 1234</div><div><strong>Horario:</strong> Lunes a Viernes, 7:00 AM - 5:00 PM</div></div>
        </SectionCard>
      </div>
      <SectionCard title={isAdmin ? "Tickets (todos)" : "Mis tickets"} subtitle={`${tickets.length} ticket(s)`}>
        {tickets.length ? (<DataTable columns={columns} rows={tickets} emptyText="No hay tickets." />) : <EmptyHint text="No tienes tickets de soporte." />}
      </SectionCard>
      <Modal key={resolveModal?.id ?? "resolve-modal"} open={!!resolveModal} title="Marcar como resuelto" onClose={() => { setResolveModal(null); setResolveResponse(""); }} size="md">
        {resolveModal && (
          <>
            <p className="muted-label">Referencia: {resolveModal.subject || resolveModal.id}</p>
            <p><strong>Correo del usuario (se enviará aquí):</strong> <strong style={{ color: "var(--primary)" }}>{resolveModal.email || "—"}</strong></p>
            <form onSubmit={resolveTicket}>
              <label><span>Comentario / Respuesta al usuario *</span><textarea rows={4} value={resolveResponse} onChange={e => setResolveResponse(e.target.value)} placeholder="Escribe el comentario o respuesta que recibirá el usuario por correo..." required /></label>
              <div className="row-actions" style={{ marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setResolveModal(null); setResolveResponse(""); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={resolving}>{resolving ? "Enviando..." : "Marcar resuelto y enviar correo"}</button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}

export function ConfigPage() {
  const { user, hasAnyRole } = useAuth();
  const canManageUsers = hasAnyRole(["admin", "leader"]);
  const [activeTab, setActiveTab] = useState("usuarios");
  const [smtp, setSmtp] = useState({});
  const [oauth, setOauth] = useState({});
  const [storage, setStorage] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "info", message: "" });
  const [users, setUsers] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: "", email: "", name: "", role: "viewer", password: "", isActive: true });
  const [resetModal, setResetModal] = useState(null);
  const [resetPwd, setResetPwd] = useState("");
  const [docTypes, setDocTypes] = useState([]);
  const [newDocType, setNewDocType] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleModal, setRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });
  const [columnSettings, setColumnSettings] = useState({ codigo: true, nombre: true, proceso: true, estado: true, version: true, fecha: true });
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailLogFilters, setEmailLogFilters] = useState({ status: "", provider: "", from: "", to: "" });
  const [permMatrix, setPermMatrix] = useState({});
  const [permSaving, setPermSaving] = useState(false);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogKey, setCatalogKey] = useState("");
  const [newCatForm, setNewCatForm] = useState({ catalog_key: "", value: "" });
  const [configLoading, setConfigLoading] = useState(true);

  // Bloqueo de acceso completo al módulo de Config para usuarios sin rol admin/leader
  if (!canManageUsers) {
    return (
      <div className="stack-lg">
        <PageHeader
          title="Configuracion"
          subtitle="Modulo restringido a administradores y lideres"
        />
        <SectionCard title="Acceso restringido">
          <p className="muted">
            Solo administradores y lideres pueden acceder al modulo de configuracion.
          </p>
        </SectionCard>
      </div>
    );
  }

  useEffect(() => { if (!toast.message) return; const t = setTimeout(() => setToast({ type: "info", message: "" }), 3500); return () => clearTimeout(t); }, [toast]);

  const loadConfig = async () => { setError(""); try { const [s, o, st] = await Promise.all([api.get("/config/smtp").catch(() => ({ data: {} })), api.get("/config/oauth").catch(() => ({ data: {} })), api.get("/config/storage").catch(() => ({ data: {} }))]); setSmtp(s.data || {}); setOauth(o.data || {}); setStorage(st.data || {}); } catch (err) { setError(extractError(err, "No se pudo cargar config.")); } };
  const loadUsers = async () => { if (!canManageUsers) return; try { const res = await api.get("/users/"); setUsers(normalizeCollection(res.data)); } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar usuarios.") }); } };
  const loadDocTypes = async () => { try { const res = await api.get("/document-types/"); setDocTypes(normalizeCollection(res.data)); } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar tipos de documento.") }); } };
  const loadAuditLogs = async () => { try { const res = await api.get("/logs/"); setAuditLogs(normalizeCollection(res.data)); } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar auditoria.") }); } };
  const loadRoles = async () => { try { const res = await api.get("/roles/"); setRoles(normalizeCollection(res.data)); } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar roles.") }); } };
  const loadColumnSettings = async () => { try { const res = await api.get("/column-settings/documentos/").catch(() => ({ data: {} })); if (res.data?.config_json) setColumnSettings(res.data.config_json); } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar columnas.") }); } };
  const loadEmailLogs = async () => {
    try {
      let url = "/email-logs/?ordering=-created_at";
      if (emailLogFilters.status) url += `&status=${emailLogFilters.status}`;
      if (emailLogFilters.provider) url += `&provider=${emailLogFilters.provider}`;
      const res = await api.get(url);
      setEmailLogs(normalizeCollection(res.data));
    } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar email logs.") }); }
  };
  const loadPermissions = async () => {
    try {
      const res = await api.get("/config/permissions-bulk");
      const matrix = {};
      (Array.isArray(res.data) ? res.data : []).forEach(p => {
        const key = `${p.role}__${p.module}`;
        matrix[key] = { can_read: p.can_read, can_edit: p.can_edit, can_approve: p.can_approve, can_delete: p.can_delete };
      });
      setPermMatrix(matrix);
    } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar permisos.") }); }
  };
  const savePermissions = async () => {
    if (!roles.length) {
      setToast({ type: "error", message: "Debes crear al menos un rol antes de guardar permisos." });
      return;
    }
    setPermSaving(true);
    try {
      const rows = [];
      Object.entries(permMatrix).forEach(([key, flags]) => {
        const [role, module] = key.split("__");
        rows.push({ role, module, ...flags });
      });
      await api.put("/config/permissions-bulk", { permissions: rows });
      setToast({ type: "success", message: "Permisos guardados correctamente." });
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "Error al guardar permisos.") });
    } finally {
      setPermSaving(false);
    }
  };
  const togglePerm = (role, mod, field) => {
    const key = `${role}__${mod}`;
    setPermMatrix(prev => ({ ...prev, [key]: { can_read: false, can_edit: false, can_approve: false, can_delete: false, ...prev[key], [field]: !(prev[key]?.[field]) } }));
  };
  const loadCatalogs = async () => {
    try {
      const res = await api.get("/catalogs/");
      setCatalogs(normalizeCollection(res.data));
    } catch (err) { setToast({ type: "error", message: extractError(err, "Error al cargar catalogos.") }); }
  };
  const addCatalogItem = async (e) => {
    e.preventDefault();

    const rawCatalogKey = (newCatForm.catalog_key || "").trim();
    const rawNewKey = (newCatForm._newKey || "").trim();
    const rawValue = (newCatForm.value || "").trim();

    // Validaciones de campos obligatorios
    if (!rawCatalogKey && !rawNewKey) {
      setToast({ type: "error", message: "Selecciona o escribe la clave del catálogo." });
      return;
    }
    if ((rawCatalogKey === "__new__" || !rawCatalogKey) && !rawNewKey) {
      setToast({ type: "error", message: "Debes indicar la clave del nuevo catálogo." });
      return;
    }
    if (!rawValue) {
      setToast({ type: "error", message: "El valor del ítem de catálogo no puede estar vacío." });
      return;
    }

    const finalCatalogKey = rawCatalogKey === "__new__" || !rawCatalogKey ? rawNewKey : rawCatalogKey;

    try {
      await api.post("/catalogs/", {
        catalog_key: finalCatalogKey,
        value: rawValue,
        label: rawValue,
        is_active: true,
        sort_order: 0,
      });
      setNewCatForm({ catalog_key: "", value: "" });
      setToast({ type: "success", message: "Item de catalogo agregado." });
      await loadCatalogs();
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "Error.") });
    }
  };
  const removeCatalogItem = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.value}" de ${item.catalog_key}?`)) return;
    try { await api.delete(`/catalogs/${item.id}/`); await loadCatalogs(); setToast({ type: "success", message: "Eliminado." }); }
    catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); }
  };

  useEffect(() => {
    setConfigLoading(true);
    Promise.all([
      loadConfig(),
      loadUsers(),
      loadDocTypes(),
      loadAuditLogs(),
      loadRoles(),
      loadColumnSettings(),
      loadEmailLogs(),
      loadPermissions(),
      loadCatalogs(),
    ]).finally(() => setConfigLoading(false));
  }, [canManageUsers]);

  const saveConfig = async () => {
    setMessage("");
    setError("");

    // Validaciones básicas de SMTP (solo si se intenta configurar SMTP)
    const hasAnySmtp =
      smtp.host ||
      smtp.port ||
      smtp.username ||
      smtp.password ||
      smtp.from_email ||
      smtp.from_name ||
      smtp.test_email;

    if (hasAnySmtp) {
      if (
        !smtp.host ||
        !String(smtp.host).trim() ||
        !smtp.port ||
        !smtp.from_email ||
        !String(smtp.from_email).trim()
      ) {
        setError("Completa los campos obligatorios de SMTP (host, puerto y correo remitente).");
        return;
      }
    }

    // Si no hay SMTP ni OAuth2 configurado, avisar
    if (!hasAnySmtp && (!oauth.provider || oauth.provider === "none")) {
      setError("Configura al menos SMTP u OAuth2 antes de guardar.");
      return;
    }

    // Validaciones básicas de OAuth2 según proveedor
    if (oauth.provider && oauth.provider !== "none") {
      if (oauth.provider === "m365") {
        if (!oauth.tenant_id || !oauth.client_id || !oauth.client_secret || !oauth.sender_email) {
          setError("Completa los campos obligatorios de OAuth2 para Microsoft 365.");
          return;
        }
      }
      if (oauth.provider === "gmail") {
        if (!oauth.client_id || !oauth.client_secret || !oauth.gmail_user || !oauth.gmail_refresh_token) {
          setError("Completa los campos obligatorios de OAuth2 para Gmail.");
          return;
        }
      }
    }

    // Validaciones básicas de almacenamiento
    if (storage.provider && storage.provider !== "local") {
      if (storage.provider === "onedrive" && !storage.onedrive_path) {
        setError("Indica la ruta de OneDrive para el almacenamiento.");
        return;
      }
      if (storage.provider === "gdrive" && !storage.gdrive_folder) {
        setError("Indica la carpeta de Google Drive (ID) para el almacenamiento.");
        return;
      }
      if (storage.provider === "gsite" && !storage.gsite_url) {
        setError("Indica la URL de Google Sites para el almacenamiento.");
        return;
      }
    }

    try {
      await Promise.all([
        api.put("/config/smtp", smtp),
        api.put("/config/oauth", oauth),
        api.put("/config/storage", storage),
      ]);
      setMessage("Configuracion guardada.");
    } catch (err) {
      setError(extractError(err, "No se pudo guardar."));
    }
  };

  const sendTest = async () => {
    const targetEmail =
      (oauth && oauth.test_email) ||
      (smtp && smtp.test_email) ||
      (smtp && smtp.from_email);

    if (!targetEmail || !String(targetEmail).trim()) {
      setError("Indica un correo de prueba en SMTP u OAuth2 antes de enviar.");
      return;
    }
    try {
      const { data } = await api.post("/config/test", { to: targetEmail });
      setMessage(data.message || "Prueba enviada.");
    } catch (err) {
      setError(extractError(err, "No se pudo enviar."));
    }
  };
  const openUserModal = (u = null) => { setEditingUser(u); const role = (u?.roles && u.roles[0]) || (u?.role) || "collaborator"; setUserForm(u ? { username: u.username || "", email: u.email || "", name: u.name || "", role, password: "", isActive: u.is_active !== false } : { username: "", email: "", name: "", role: "collaborator", password: "", isActive: true }); setUserModal(true); };
  const submitUser = async (e) => { e.preventDefault(); if (!editingUser && userForm.password && userForm.password.length < 6) { setToast({ type: "error", message: "La contrasena debe tener al menos 6 caracteres." }); return; } try { const p = { username: userForm.username, email: userForm.email, name: userForm.name, roles: [userForm.role], is_active: userForm.isActive }; if (userForm.password) p.password = userForm.password; if (editingUser?.id) { await api.put(`/users/${editingUser.id}/`, p); } else { await api.post("/users/", p); } setToast({ type: "success", message: "Usuario guardado." }); setUserModal(false); await loadUsers(); } catch (err) { setToast({ type: "error", message: extractError(err, "No se pudo guardar.") }); } };
  const toggleUserStatus = async (u) => { try { await api.patch(`/users/${u.id}/`, { is_active: !u.is_active }); setToast({ type: "success", message: u.is_active ? "Desactivado." : "Activado." }); await loadUsers(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const submitResetPassword = async (e) => { e.preventDefault(); if (!resetModal) return; if (resetPwd.length < 6) { setToast({ type: "error", message: "La contrasena debe tener al menos 6 caracteres." }); return; } try { await api.post(`/users/${resetModal.id}/reset-password/`, { password: resetPwd }); setToast({ type: "success", message: "Contrasena restablecida." }); setResetModal(null); setResetPwd(""); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const addDocType = async (e) => {
    e.preventDefault();
    if (!newDocType.trim()) {
      setToast({ type: "error", message: "El nombre del tipo de documento no puede estar vacío." });
      return;
    }
    try {
      await api.post("/document-types/", { name: newDocType.trim() });
      setNewDocType("");
      await loadDocTypes();
      setToast({ type: "success", message: "Tipo agregado." });
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "Error.") });
    }
  };
  const removeDocType = async (dt) => { if (!window.confirm(`¿Eliminar "${dt.name}"?`)) return; try { await api.delete(`/document-types/${dt.id}/`); await loadDocTypes(); setToast({ type: "success", message: "Eliminado." }); } catch (err) { setToast({ type: "error", message: extractError(err, "Error.") }); } };
  const submitRole = async (e) => { e.preventDefault(); try { await api.post("/roles/", roleForm); setToast({ type: "success", message: "Rol creado." }); setRoleModal(false); setRoleForm({ code: "", name: "", description: "" }); await loadRoles(); } catch (err) { setToast({ type: "error", message: extractError(err, "Error al crear rol.") }); } };
  const saveColumnSettings = async () => {
    const anyVisible = Object.values(columnSettings || {}).some(Boolean);
    if (!anyVisible) {
      setToast({ type: "error", message: "Debes dejar al menos una columna visible." });
      return;
    }
    try {
      await api.put("/column-settings/documentos/", { module: "documentos", config_json: columnSettings });
      setToast({ type: "success", message: "Columnas guardadas." });
    } catch (err) {
      setToast({ type: "error", message: extractError(err, "Error.") });
    }
  };

  const PERM_MODULES = [
    { key: "documentos", label: "Documentos" }, { key: "indicadores", label: "Indicadores" }, { key: "riesgos", label: "Riesgos" },
    { key: "acciones", label: "Acciones" }, { key: "comites", label: "Comites" }, { key: "procesos", label: "Procesos" },
    { key: "ecosistema", label: "Ecosistema" }, { key: "configuracion", label: "Configuracion" },
  ];
  const PERM_LEVELS = [
    { key: "can_read", label: "Leer" }, { key: "can_edit", label: "Editar" },
    { key: "can_approve", label: "Aprobar" }, { key: "can_delete", label: "Eliminar" },
  ];
  const catalogKeys = [...new Set(catalogs.map(c => c.catalog_key))].sort();
  const filteredCatalogs = catalogKey ? catalogs.filter(c => c.catalog_key === catalogKey) : catalogs;

  const configTabs = [
    { id: "usuarios", label: "Usuarios" },
    { id: "roles", label: "Roles" },
    { id: "permisos", label: "Permisos" },
    { id: "catalogos", label: "Catalogos" },
    { id: "columnas", label: "Columnas" },
    { id: "storage", label: "Almacenamiento" },
    { id: "smtp", label: "SMTP" },
    { id: "oauth", label: "OAuth2" },
    { id: "auditoria", label: "Auditoria" },
    { id: "emaillogs", label: "Email logs" },
  ];

  return (
    <div className="stack-lg">
      <PageHeader title="Configuracion" subtitle="Administracion de usuarios, roles, catalogos y sistema" />
      {configLoading ? <p className="muted">Cargando configuracion...</p> : null}
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <ToastMessage type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />

      <div className="process-detail-tabs" style={{ flexWrap: "wrap" }}>{configTabs.map(tab => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} disabled={configLoading}>{tab.label}</button>)}</div>

      {/* ── Usuarios ── */}
      {activeTab === "usuarios" && (
        canManageUsers
          ? (<SectionCard title="Gestion de Usuarios" actions={<button className="btn btn-primary" type="button" onClick={() => openUserModal()}><Plus size={16} /> Nuevo usuario</button>}><DataTable columns={[
            { key: "username", label: "Usuario", render: (u) => u.username },
            { key: "name", label: "Nombre", render: (u) => u.name || "—" },
            { key: "email", label: "Correo", render: (u) => u.email || "—" },
            { key: "role", label: "Rol", render: (u) => (u.roles && u.roles[0]) || u.role || "—" },
            { key: "status", label: "Estado", render: (u) => <StatusBadge status={u.is_active !== false ? "active" : "inactive"} /> },
            { key: "actions", label: "Acciones", render: (u) => (<div className="table-actions"><button type="button" className="btn btn-secondary" onClick={() => openUserModal(u)}>Editar</button><button type="button" className="btn btn-secondary" onClick={() => { setResetModal(u); setResetPwd(""); }}>Reset pwd</button><button type="button" className={u.is_active !== false ? "btn btn-danger" : "btn btn-secondary"} onClick={() => toggleUserStatus(u)}>{u.is_active !== false ? "Desactivar" : "Activar"}</button></div>) },
          ]} rows={users} emptyText="No hay usuarios." /></SectionCard>)
          : (<SectionCard title="Gestion de Usuarios"><p className="muted">Solo administradores y lideres pueden gestionar usuarios. Tu rol no tiene permiso para ver o editar la lista.</p></SectionCard>)
      )}

      {/* ── Roles ── */}
      {activeTab === "roles" && (<SectionCard title="Gestion de Roles" actions={<button className="btn btn-primary" type="button" onClick={() => setRoleModal(true)}><Plus size={16} /> Nuevo rol</button>}>
        <DataTable columns={[
          { key: "code", label: "Codigo", render: r => r.code },
          { key: "name", label: "Nombre", render: r => r.name },
          { key: "description", label: "Descripcion", render: r => r.description || "—" },
        ]} rows={roles} emptyText="No hay roles configurados." />
        <div style={{ marginTop: "1rem" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Roles por defecto</h4>
          <ul className="item-list">
            <li><div><strong>admin</strong><small>Acceso total al sistema</small></div></li>
            <li><div><strong>leader</strong><small>Gestion y aprobacion de procesos</small></div></li>
            <li><div><strong>collaborator</strong><small>Edicion limitada de documentos y acciones</small></div></li>
            <li><div><strong>reader</strong><small>Solo lectura</small></div></li>
          </ul>
        </div>
      </SectionCard>)}

      {/* ── Permisos ── */}
      {activeTab === "permisos" && (<SectionCard title="Matriz de Permisos" subtitle="Asigna permisos por rol y modulo — los cambios se guardan al hacer clic en Guardar" actions={<button type="button" className="btn btn-primary" disabled={permSaving} onClick={savePermissions}>{permSaving ? "Guardando..." : "Guardar permisos"}</button>}>
        {roles.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th rowSpan={2}>Modulo</th>{roles.map(r => <th key={r.code} colSpan={PERM_LEVELS.length} style={{ textAlign: "center", borderBottom: "none" }}>{r.name || r.code}</th>)}</tr>
                <tr>{roles.map(r => PERM_LEVELS.map(l => <th key={`${r.code}-${l.key}`} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 500 }}>{l.label}</th>))}</tr>
              </thead>
              <tbody>
                {PERM_MODULES.map(mod => (
                  <tr key={mod.key}>
                    <td><strong>{mod.label}</strong></td>
                    {roles.map(r => PERM_LEVELS.map(l => {
                      const key = `${r.code}__${mod.key}`;
                      const checked = permMatrix[key]?.[l.key] || false;
                      return <td key={`${r.code}-${mod.key}-${l.key}`} style={{ textAlign: "center" }}><input type="checkbox" checked={checked} onChange={() => togglePerm(r.code, mod.key, l.key)} /></td>;
                    }))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyHint text="Crea roles primero en la tab de Roles." />}
      </SectionCard>)}

      {/* ── Catalogos ── */}
      {activeTab === "catalogos" && (<SectionCard title="Catalogos del Sistema" subtitle="Listas configurables: tipos de documento, severidades, frecuencias, etc.">
        <form className="committee-inline-form" onSubmit={addCatalogItem}>
          <select value={newCatForm.catalog_key} onChange={e => setNewCatForm(p => ({ ...p, catalog_key: e.target.value }))} required style={{ minWidth: 160 }}>
            <option value="">Seleccionar catalogo...</option>
            {catalogKeys.map(k => <option key={k} value={k}>{k}</option>)}
            <option value="__new__">+ Nuevo catalogo</option>
          </select>
          {newCatForm.catalog_key === "__new__" && <input placeholder="Clave del nuevo catalogo" value={newCatForm.catalog_key === "__new__" ? (newCatForm._newKey || "") : ""} onChange={e => setNewCatForm(p => ({ ...p, _newKey: e.target.value }))} required style={{ maxWidth: 180 }} />}
          <input placeholder="Valor del item" value={newCatForm.value} onChange={e => setNewCatForm(p => ({ ...p, value: e.target.value }))} required style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary" onClick={() => { if (newCatForm.catalog_key === "__new__" && newCatForm._newKey) setNewCatForm(p => ({ ...p, catalog_key: p._newKey })); }}>Agregar</button>
        </form>
        <div className="committee-inline-form" style={{ marginBottom: "0.75rem" }}>
          <select value={catalogKey} onChange={e => setCatalogKey(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Todos los catalogos ({catalogs.length})</option>
            {catalogKeys.map(k => <option key={k} value={k}>{k} ({catalogs.filter(c => c.catalog_key === k).length})</option>)}
          </select>
          <span className="muted-label">{filteredCatalogs.length} items</span>
        </div>
        <DataTable columns={[
          { key: "catalog_key", label: "Catalogo", render: c => <StatusBadge status={c.catalog_key} /> },
          { key: "value", label: "Valor", render: c => <strong>{c.value}</strong> },
          { key: "label", label: "Etiqueta", render: c => c.label || "—" },
          { key: "is_active", label: "Activo", render: c => c.is_active !== false ? <CheckCircle2 size={16} style={{ color: "var(--success)" }} /> : <X size={16} style={{ color: "var(--danger)" }} /> },
          { key: "actions", label: "", render: c => <button type="button" className="btn btn-danger" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => removeCatalogItem(c)}>Eliminar</button> },
        ]} rows={filteredCatalogs} emptyText="Sin items de catalogo." />
        {/* Tipos de documento (legacy) */}
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <h4>Tipos de documento</h4>
          <form className="committee-inline-form" onSubmit={addDocType} style={{ marginTop: "0.5rem" }}>
            <input value={newDocType} onChange={e => setNewDocType(e.target.value)} placeholder="Ej: Protocolo, Guia..." style={{ flex: 1 }} />
            <button type="submit" className="btn btn-secondary">Agregar tipo</button>
          </form>
          <ul className="item-list" style={{ marginTop: "0.5rem" }}>{docTypes.map(dt => (<li key={dt.id}><div><strong>{dt.name}</strong><small>{formatDate(dt.created_at || dt.createdAt)}</small></div><button type="button" className="btn btn-danger" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => removeDocType(dt)}>Eliminar</button></li>))}{!docTypes.length && <EmptyHint text="No hay tipos." />}</ul>
        </div>
      </SectionCard>)}

      {/* ── Columnas ── */}
      {activeTab === "columnas" && (<SectionCard title="Visibilidad de Columnas" subtitle="Configura que columnas se muestran en el modulo de documentos">
        <div className="form-grid">
          {Object.entries(columnSettings).map(([key, val]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={val} onChange={e => setColumnSettings(p => ({ ...p, [key]: e.target.checked }))} />
              <span style={{ textTransform: "capitalize" }}>{key}</span>
            </label>
          ))}
        </div>
        <div className="row-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn btn-primary" onClick={saveColumnSettings}>Guardar columnas</button>
        </div>
      </SectionCard>)}

      {/* ── SMTP ── */}
      {activeTab === "smtp" && (<SectionCard title="Configuracion SMTP">
        <div className="form-grid">
          <label><span>Host *</span><input value={smtp.host || ""} onChange={e => setSmtp(p => ({ ...p, host: e.target.value }))} /></label>
          <label><span>Puerto *</span><input type="number" value={smtp.port || ""} onChange={e => setSmtp(p => ({ ...p, port: Number(e.target.value) || "" }))} /></label>
          <label><span>Usuario</span><input value={smtp.username || ""} onChange={e => setSmtp(p => ({ ...p, username: e.target.value }))} /></label>
          <label><span>Contrasena</span><input type="password" value={smtp.password || ""} onChange={e => setSmtp(p => ({ ...p, password: e.target.value }))} /></label>
          <label><span>Correo remitente *</span><input value={smtp.from_email || ""} onChange={e => setSmtp(p => ({ ...p, from_email: e.target.value }))} /></label>
          <label><span>Nombre remitente</span><input value={smtp.from_name || ""} onChange={e => setSmtp(p => ({ ...p, from_name: e.target.value }))} /></label>
          <label><span>Correo de prueba</span><input value={smtp.test_email || ""} onChange={e => setSmtp(p => ({ ...p, test_email: e.target.value }))} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><input type="checkbox" checked={smtp.use_tls !== false} onChange={e => setSmtp(p => ({ ...p, use_tls: e.target.checked }))} /><span>Usar TLS</span></label>
        </div>
        <div className="row-actions" style={{ marginTop: "1rem" }}><button type="button" className="btn btn-primary" onClick={saveConfig}>Guardar</button><button type="button" className="btn btn-secondary" onClick={sendTest}>Enviar prueba</button></div>
      </SectionCard>)}

      {/* ── OAuth2 ── */}
      {activeTab === "oauth" && (<SectionCard title="Configuracion OAuth2" subtitle={oauth.provider === "gmail" ? "Gmail / Workspace: Client ID y Secret en Google Cloud Console; Refresh Token tras autorizar la app." : oauth.provider === "m365" ? "Microsoft 365: datos de la app registrada en Azure Portal (Entra ID)." : "Elige proveedor y completa los campos obligatorios."}>
        <div className="form-grid">
          <label><span>Proveedor</span><select value={oauth.provider || "none"} onChange={e => setOauth(p => ({ ...p, provider: e.target.value }))}><option value="none">Ninguno</option><option value="m365">Microsoft 365</option><option value="gmail">Gmail / Workspace</option></select></label>
          {(oauth.provider === "m365" || !oauth.provider || oauth.provider === "none") && <>
            <label><span>Tenant ID</span><input value={oauth.tenant_id || ""} onChange={e => setOauth(p => ({ ...p, tenant_id: e.target.value }))} placeholder="GUID del directorio en Azure" /></label>
            <label><span>Client ID</span><input value={oauth.client_id || ""} onChange={e => setOauth(p => ({ ...p, client_id: e.target.value }))} placeholder="Application (client) ID" /></label>
            <label><span>Client Secret</span><input type="password" value={oauth.client_secret || ""} onChange={e => setOauth(p => ({ ...p, client_secret: e.target.value }))} placeholder="Valor del secreto en Certificates & secrets" /></label>
            <label><span>Sender Email</span><input type="email" value={oauth.sender_email || ""} onChange={e => setOauth(p => ({ ...p, sender_email: e.target.value }))} placeholder="Correo que envia (ej. notificaciones@dominio.com)" /></label>
          </>}
          {oauth.provider === "gmail" && <>
            <label><span>Client ID</span><input value={oauth.client_id || ""} onChange={e => setOauth(p => ({ ...p, client_id: e.target.value }))} placeholder="OAuth 2.0 Client ID de Google Cloud" /></label>
            <label><span>Client Secret</span><input type="password" value={oauth.client_secret || ""} onChange={e => setOauth(p => ({ ...p, client_secret: e.target.value }))} placeholder="Client secret de la credencial" /></label>
            <label><span>Cuenta Gmail (remitente)</span><input type="email" value={oauth.gmail_user || ""} onChange={e => setOauth(p => ({ ...p, gmail_user: e.target.value }))} placeholder="ej. notificaciones@midominio.com" /></label>
            <label><span>Refresh Token</span><input type="password" value={oauth.gmail_refresh_token || ""} onChange={e => setOauth(p => ({ ...p, gmail_refresh_token: e.target.value }))} placeholder="Token obtenido tras autorizar la app" /></label>
          </>}
          <label><span>Correo de prueba</span><input type="email" value={oauth.test_email || ""} onChange={e => setOauth(p => ({ ...p, test_email: e.target.value }))} placeholder="Destino del correo de prueba" /></label>
        </div>
        <div className="row-actions" style={{ marginTop: "1rem" }}><button type="button" className="btn btn-primary" onClick={saveConfig}>Guardar</button><button type="button" className="btn btn-secondary" onClick={sendTest}>Enviar prueba</button></div>
      </SectionCard>)}

      {/* ── Almacenamiento ── */}
      {activeTab === "storage" && (<SectionCard title="Almacenamiento">
        <div className="form-grid">
          <label><span>Proveedor</span><select value={storage.provider || "local"} onChange={e => setStorage(p => ({ ...p, provider: e.target.value }))}><option value="local">Local</option><option value="onedrive">OneDrive</option><option value="gdrive">Google Drive</option><option value="gsite">Google Sites</option></select></label>
          <label><span>Ruta local</span><input value={storage.local_path || ""} onChange={e => setStorage(p => ({ ...p, local_path: e.target.value }))} /></label>
          {storage.provider === "onedrive" && <label><span>Ruta OneDrive</span><input value={storage.onedrive_path || ""} onChange={e => setStorage(p => ({ ...p, onedrive_path: e.target.value }))} /></label>}
          {storage.provider === "gdrive" && <label><span>Carpeta Google Drive ID</span><input value={storage.gdrive_folder || ""} onChange={e => setStorage(p => ({ ...p, gdrive_folder: e.target.value }))} /></label>}
          {storage.provider === "gsite" && <label><span>URL Google Sites</span><input value={storage.gsite_url || ""} onChange={e => setStorage(p => ({ ...p, gsite_url: e.target.value }))} /></label>}
        </div>
        <div className="row-actions" style={{ marginTop: "1rem" }}><button type="button" className="btn btn-primary" onClick={saveConfig}>Guardar</button></div>
      </SectionCard>)}

      {/* ── Auditoria ── */}
      {activeTab === "auditoria" && (<SectionCard title="Registros de auditoria" subtitle={`${auditLogs.length} registros`} actions={<button type="button" className="btn btn-secondary" onClick={loadAuditLogs}><RefreshCw size={14} /> Actualizar</button>}>
        {auditLogs.length ? (<DataTable columns={[
          { key: "date", label: "Fecha", render: l => formatDateTime(l.created_at || l.createdAt) },
          { key: "event", label: "Evento", render: l => <StatusBadge status={l.event_type || l.eventType || "—"} /> },
          { key: "user", label: "Usuario", render: l => { const u = users.find(u2 => u2.id === l.user || u2.id === l.userId); return u ? u.username : (l.user_name || l.userName || l.user || "—"); } },
          { key: "entity", label: "Entidad", render: l => <span>{l.entity_type || l.entityType || "—"}: <strong>{l.entity_id || l.entityId || ""}</strong></span> },
          { key: "status", label: "Estado", render: l => <StatusBadge status={l.status || "—"} /> },
          { key: "ip", label: "IP", render: l => l.ip || "—" },
          { key: "details", label: "Detalle", render: l => { const d = l.details_json || l.detailsJson; return d?.message || "—"; } },
        ]} rows={auditLogs.slice(0, 100)} emptyText="Sin registros." />) : <EmptyHint text="Sin registros de auditoria." />}
      </SectionCard>)}

      {/* ── Email logs ── */}
      {activeTab === "emaillogs" && (<SectionCard title="Logs de correo" subtitle={`${emailLogs.length} registros`}>
        <div className="filters-grid" style={{ marginBottom: "1rem" }}>
          <label><span>Estado</span><select value={emailLogFilters.status} onChange={e => { setEmailLogFilters(p => ({ ...p, status: e.target.value })); }}><option value="">Todos</option><option value="sent">Enviado</option><option value="failed">Fallido</option><option value="skipped">Omitido</option></select></label>
          <label><span>Proveedor</span><select value={emailLogFilters.provider} onChange={e => { setEmailLogFilters(p => ({ ...p, provider: e.target.value })); }}><option value="">Todos</option><option value="smtp">SMTP</option><option value="m365">M365</option><option value="gmail">Gmail</option></select></label>
          <div className="align-end"><button type="button" className="btn btn-secondary" onClick={loadEmailLogs}><RefreshCw size={14} /> Filtrar</button></div>
        </div>
        {emailLogs.length ? (<div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Proveedor</th><th>Para</th><th>Asunto</th><th>Estado</th><th>Error</th></tr></thead><tbody>{emailLogs.slice(0, 50).map(log => (<tr key={log.id}><td>{formatDateTime(log.created_at || log.createdAt)}</td><td>{log.event_type || log.eventType || "—"}</td><td>{log.provider || "—"}</td><td>{log.to_email || log.toEmail || "—"}</td><td>{log.subject || "—"}</td><td><StatusBadge status={log.status || "—"} /></td><td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{log.error_message || log.errorMessage || "—"}</td></tr>))}</tbody></table></div>) : <EmptyHint text="Sin logs de correo." />}
      </SectionCard>)}

      {/* ── Modals ── */}
      <Modal open={userModal} title={editingUser ? "Editar usuario" : "Nuevo usuario"} onClose={() => setUserModal(false)} size="md">
        <form className="form-grid" onSubmit={submitUser}><label><span>Usuario *</span><input value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))} required /></label><label><span>Nombre</span><input value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} /></label><label><span>Correo</span><input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} /></label><label><span>Rol</span><select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}><option value="admin">Administrador</option><option value="leader">Lider</option><option value="collaborator">Colaborador</option><option value="reader">Solo lectura</option></select></label>{!editingUser && <label><span>Contrasena * (min. 6 caracteres)</span><input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} required={!editingUser} minLength={6} /></label>}<div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setUserModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div></form>
      </Modal>
      <Modal open={Boolean(resetModal)} title={`Reset: ${resetModal?.username || ""}`} onClose={() => setResetModal(null)} size="sm">
        <form className="form-grid" onSubmit={submitResetPassword}><label><span>Nueva contrasena *</span><input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} required minLength={6} /></label><div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setResetModal(null)}>Cancelar</button><button type="submit" className="btn btn-primary">Restablecer</button></div></form>
      </Modal>
      <Modal open={roleModal} title="Nuevo Rol" onClose={() => setRoleModal(false)} size="sm">
        <form className="form-grid" onSubmit={submitRole}>
          <label><span>Codigo *</span><input value={roleForm.code} onChange={e => setRoleForm(p => ({ ...p, code: e.target.value }))} required /></label>
          <label><span>Nombre *</span><input value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} required /></label>
          <label><span>Descripcion</span><textarea rows={2} value={roleForm.description} onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))} /></label>
          <div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => setRoleModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Crear rol</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Analitica: Reportes consolidados cruzando todas las entidades
   ══════════════════════════════════════════════════════════════ */
export function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState({});
  const [risks, setRisks] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/charts"),
      api.get("/risks/"),
      api.get("/indicators/"),
      api.get("/processes/"),
    ])
      .then(([sumRes, chartRes, riskRes, indRes, procRes]) => {
        setSummary(sumRes.data || {});
        setCharts(chartRes.data || {});
        setRisks(normalizeCollection(riskRes.data));
        setIndicators(normalizeCollection(indRes.data));
        setProcesses(normalizeCollection(procRes.data));
      })
      .catch(err => setError(extractError(err, "Error cargando analitica.")))
      .finally(() => setLoading(false));
  }, []);

  const processMap = useMemo(() => new Map(processes.map(p => [p.id, p])), [processes]);

  /* Grafico: Riesgos por categoria de proceso */
  const risksByCategoryData = useMemo(() => {
    const byCat = {};
    risks.forEach(r => {
      const proc = processMap.get(r.process_id || r.processId);
      const cat = proc?.category || "sin_categoria";
      byCat[cat] = (byCat[cat] || 0) + 1;
    });
    const labels = Object.keys(byCat);
    return { labels: labels.map(l => PROCESS_CATEGORY_LABELS[l] || l), datasets: [{ label: "Riesgos", data: labels.map(l => byCat[l]), backgroundColor: CHART_BG.slice(0, labels.length) }] };
  }, [risks, processMap]);

  /* Grafico: Indicadores cumplimiento por proceso */
  const complianceByProcess = useMemo(() => {
    const byProc = {};
    indicators.forEach(ind => {
      const pName = processMap.get(ind.process_id || ind.processId)?.name || "Sin proceso";
      if (!byProc[pName]) byProc[pName] = { meets: 0, total: 0 };
      byProc[pName].total++;
      const t = Number(ind.target || 0); const c = Number(ind.current ?? 0);
      if (t > 0 && c >= t) byProc[pName].meets++;
    });
    const labels = Object.keys(byProc).slice(0, 10);
    return { labels, datasets: [{ label: "% Cumplimiento", data: labels.map(l => byProc[l].total ? Math.round(byProc[l].meets / byProc[l].total * 100) : 0), backgroundColor: "#10b981cc", borderColor: "#10b981", borderWidth: 1 }] };
  }, [indicators, processMap]);

  /* Grafico: Distribucion de documentos por tipo (del charts API) */
  const docsByProcessData = useMemo(() => {
    const dp = charts?.documentsByProcess || [];
    return { labels: dp.map(d => d.process__name || "Sin proceso"), datasets: [{ data: dp.map(d => d.count || 0), backgroundColor: CHART_BG.slice(0, dp.length) }] };
  }, [charts]);

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } };

  return (
    <div className="stack-xl">
      <PageHeader title="Analitica" subtitle="Reportes consolidados e inteligencia de datos" icon={<PieChart size={20} />} />
      {error ? <p className="error">{error}</p> : null}

      <div className="kpi-grid">
        <KpiCard title="Procesos" value={loading ? "..." : formatNumber(processes.length)} helper="Registrados" icon={<FolderKanban size={20} />} tone="info" />
        <KpiCard title="Documentos" value={loading ? "..." : formatNumber(summary?.documents?.total || 0)} helper="Total" icon={<FileText size={20} />} tone="default" />
        <KpiCard title="Indicadores" value={loading ? "..." : formatNumber(indicators.length)} helper="Seguimiento" icon={<TrendingUp size={20} />} tone="success" />
        <KpiCard title="Riesgos" value={loading ? "..." : formatNumber(risks.length)} helper="Identificados" icon={<ShieldAlert size={20} />} tone="danger" />
      </div>

      <div className="two-column-grid">
        <SectionCard title="Riesgos por Categoria de Proceso">
          <div style={{ height: 280 }}>
            {risksByCategoryData.labels.length ? <Bar data={risksByCategoryData} options={chartOpts} /> : <EmptyHint text="Sin datos." />}
          </div>
        </SectionCard>
        <SectionCard title="Cumplimiento Indicadores por Proceso">
          <div style={{ height: 280 }}>
            {complianceByProcess.labels.length ? <Bar data={complianceByProcess} options={{ ...chartOpts, scales: { y: { beginAtZero: true, max: 100 } } }} /> : <EmptyHint text="Sin datos." />}
          </div>
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="Documentos por Proceso">
          <div style={{ height: 280 }}>
            {docsByProcessData.labels.length ? <Doughnut data={docsByProcessData} options={doughnutOpts} /> : <EmptyHint text="Sin datos." />}
          </div>
        </SectionCard>
        <SectionCard title="Resumen General">
          <div className="progress-list">
            <ProgressRow label="Riesgos abiertos" value={summary?.risks?.open || 0} total={risks.length || 1} />
            <ProgressRow label="Acciones activas" value={summary?.actions?.open || 0} total={summary?.actions?.total || 1} />
            <ProgressRow label="Compromisos pendientes" value={summary?.commitments?.pending || 0} total={summary?.commitments?.total || 1} />
            <ProgressRow label="Indicadores en meta" value={indicators.filter(i => { const t = Number(i.target||0); const c = Number(i.current??0); return t > 0 && c >= t; }).length} total={indicators.length || 1} />
          </div>
        </SectionCard>
      </div>

      {/* Tabla resumen por proceso */}
      <SectionCard title="Estado por Proceso" subtitle="Vista cruzada de todos los modulos">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Proceso</th><th>Categoria</th><th>Documentos</th><th>Indicadores</th><th>Riesgos</th><th>Responsable</th></tr>
            </thead>
            <tbody>
              {processes.map(p => {
                const pIndicators = indicators.filter(i => (i.process_id || i.processId) === p.id);
                const pRisks = risks.filter(r => (r.process_id || r.processId) === p.id);
                return (
                  <tr key={p.id}>
                    <td><Link to={`/process-map/${p.id}`} className="inline-link">{p.name}</Link></td>
                    <td>{PROCESS_CATEGORY_LABELS[p.category] || p.category}</td>
                    <td>{(charts?.documentsByProcess || []).find(d => d.process__name === p.name)?.count || 0}</td>
                    <td>{pIndicators.length}</td>
                    <td>{pRisks.length}</td>
                    <td>{p.responsible || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
