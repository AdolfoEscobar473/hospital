import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

function normalizeCollection(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeEndpoint(endpoint) {
  if (!endpoint.startsWith("/")) return `/${endpoint}`;
  return endpoint;
}

export default function CrudResourcePage({
  title,
  endpoint,
  fields,
  readOnly = false,
  afterLoad,
  extraHeader,
}) {
  const initial = useMemo(() => {
    const base = {};
    fields.forEach((f) => {
      if (!f.readOnly) base[f.key] = f.defaultValue ?? "";
    });
    return base;
  }, [fields]);

  const [form, setForm] = useState(initial);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resource = normalizeEndpoint(endpoint);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(resource);
      const rows = normalizeCollection(data);
      setItems(rows);
      if (afterLoad) {
        afterLoad(rows);
      }
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cargar la informacion.");
    } finally {
      setLoading(false);
    }
  }, [afterLoad, resource]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post(resource.endsWith("/") ? resource : `${resource}/`, form);
      setForm(initial);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el registro.");
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{items.length} registros</p>
        </div>
        <button type="button" onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {extraHeader}
      {error && <p className="error">{error}</p>}

      {!readOnly && (
        <form className="inline-form" onSubmit={submit}>
          {fields
            .filter((f) => !f.readOnly)
            .map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <input
                  type={field.type || "text"}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required={Boolean(field.required)}
                />
              </label>
            ))}
          <button type="submit">Crear</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id || JSON.stringify(row)}>
                {fields.map((field) => (
                  <td key={field.key}>{String(row[field.key] ?? row[field.altKey] ?? "")}</td>
                ))}
              </tr>
            ))}
            {!items.length && !loading && (
              <tr>
                <td colSpan={fields.length}>Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
