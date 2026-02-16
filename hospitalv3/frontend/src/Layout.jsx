import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BotMessageSquare,
  ChartColumnBig,
  CircleGauge,
  ClipboardList,
  FileText,
  HandHelping,
  LifeBuoy,
  Search,
  Settings,
  ShieldAlert,
  Users,
  Workflow,
} from "lucide-react";
import { useAuth } from "./auth";
import api from "./api";
import { toInitials } from "./utils/formatters";

const LOGO_PATHS = ["/logo-hospital.png", "/logo-hospital.jpg", "/vite.svg"];
function BrandLogo({ className, fallbackIcon: FallbackIcon = Activity, size = 44, variant = "sidebar" }) {
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = LOGO_PATHS[current];
  const onError = () => {
    if (current + 1 < LOGO_PATHS.length) setCurrent((c) => c + 1);
    else setFailed(true);
  };
  const isCompact = variant === "sidebar";
  if (failed) {
    return (
      <div className={className} style={{ minWidth: size, height: size, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #0f9c5f, #0d7a4a)", borderRadius: 8 }}>
        <FallbackIcon size={size * 0.5} color="#fff" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="E.S.E. Hospital San Vicente de Paul"
      className={className}
      onError={onError}
      style={{
        height: isCompact ? size : "auto",
        maxHeight: isCompact ? size : 140,
        width: "auto",
        maxWidth: isCompact ? 200 : 320,
        objectFit: "contain",
        objectPosition: "left center",
      }}
    />
  );
}

export { BrandLogo };
const navSections = [
  {
    title: "Operacion",
    items: [
      { to: "/", label: "Dashboard", icon: CircleGauge },
      { to: "/documents", label: "Documentos", icon: FileText, badgeKey: "documents" },
      { to: "/indicators", label: "Indicadores", icon: ChartColumnBig },
      { to: "/risks", label: "Riesgos", icon: ShieldAlert, badgeKey: "risksOpen" },
      { to: "/actions", label: "Acciones", icon: ClipboardList },
      { to: "/committees", label: "Comites", icon: Users, badgeKey: "commitmentsPending" },
    ],
  },
  {
    title: "Analitica",
    items: [
      { to: "/process-map", label: "Mapa de procesos", icon: Workflow },
      { to: "/ecosystem", label: "Ecosistema", icon: BotMessageSquare },
      { to: "/analytics", label: "Analitica", icon: ChartColumnBig },
      { to: "/search", label: "Buscar", icon: Search },
      { to: "/my-work", label: "Mi trabajo", icon: HandHelping },
    ],
  },
  {
    title: "Administracion",
    items: [
      { to: "/support", label: "Soporte", icon: LifeBuoy },
      { to: "/config", label: "Configuracion", icon: Settings },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarStats, setSidebarStats] = useState({
    documents: "-",
    risksOpen: "-",
    commitmentsPending: "-",
  });

  useEffect(() => {
    let alive = true;
    api
      .get("/dashboard/summary")
      .then((res) => {
        if (!alive) return;
        setSidebarStats({
          documents: res.data?.documents?.total ?? "-",
          risksOpen: res.data?.risks?.open ?? "-",
          commitmentsPending: res.data?.commitments?.pending ?? "-",
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const sectionTitle = useMemo(() => {
    for (const section of navSections) {
      const match = section.items.find((item) => item.to === location.pathname);
      if (match) return match.label;
    }
    if (location.pathname.startsWith("/process-map/")) return "Detalle del proceso";
    return "Panel operativo";
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-box">
          <BrandLogo className="brand-logo" size={44} variant="sidebar" />
          <div className="brand-text">
            <strong>SGI</strong>
            <span>Gestion Integral</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="sidebar-group">
              <p>{section.title}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) => (isActive ? "side-link active" : "side-link")}
                  >
                    <span className="side-link-left">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </span>
                    {item.badgeKey ? <span className="link-badge">{sidebarStats[item.badgeKey]}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{toInitials(user?.name || user?.username)}</div>
          <div>
            <strong>{user?.name || user?.username || "Usuario"}</strong>
            <small>{user?.email || "sin correo"}</small>
          </div>
        </div>
      </aside>

      <main className="app-content">
        <header className="app-topbar">
          <div>
            <h1>{sectionTitle}</h1>
          </div>
          <div className="app-topbar-actions">
            <span className="user-inline">{user?.name || user?.username || "Usuario"}</span>
            <button type="button" className="btn btn-danger" onClick={logout}>
              Cerrar sesion
            </button>
          </div>
        </header>
        <section className="app-page">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
