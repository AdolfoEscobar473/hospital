import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { extractError } from "./common";

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = await login(form.username, form.password);
      if (payload.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        setTimeout(() => navigate("/", { replace: true }), 0);
      }
    } catch (err) {
      setError(extractError(err, "Credenciales invalidas"));
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <img src="/logo-hospital.png" alt="E.S.E. Hospital San Vicente de Paul" onError={(e) => { const img = e.target; if (img.src.endsWith("logo-hospital.png")) img.src = "/logo-hospital.jpg"; else if (img.src.endsWith("logo-hospital.jpg")) img.src = "/vite.svg"; img.onerror = null; }} style={{ maxHeight: 110, maxWidth: 320, width: "100%", objectFit: "contain" }} />
        </div>
        <h1>Ingreso SGI Hospital</h1>
        <p>Sistema de Gestion Integral – San Vicente de Paul</p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          <span>Usuario</span>
          <input type="text" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} required />
        </label>
        <label>
          <span>Contrasena</span>
          <input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setMessage("Contrasena actualizada correctamente.");
      setTimeout(() => navigate("/", { replace: true }), 700);
    } catch (err) {
      setError(extractError(err, "No se pudo actualizar la contrasena."));
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Cambiar contrasena</h1>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <label>
          <span>Contrasena actual</span>
          <input type="password" value={form.currentPassword} onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))} required />
        </label>
        <label>
          <span>Nueva contrasena</span>
          <input type="password" minLength={6} value={form.newPassword} onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))} required />
        </label>
        <button className="btn btn-primary" type="submit">Guardar</button>
      </form>
    </div>
  );
}
