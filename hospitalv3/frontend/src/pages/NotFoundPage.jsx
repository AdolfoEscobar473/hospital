import { Link } from "react-router-dom";
import SectionCard from "../components/ui/SectionCard";

export function NotFoundPage() {
  return (
    <SectionCard title="Ruta no encontrada">
      <Link className="inline-link" to="/">Volver al dashboard</Link>
    </SectionCard>
  );
}
