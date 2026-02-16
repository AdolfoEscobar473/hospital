import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import { useAuth } from "./auth";
import { ChangePasswordPage, DashboardPage, LoginPage, NotFoundPage } from "./pages/index";
import { allModuleRoutes } from "./moduleRoutes";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        {allModuleRoutes.map((route) => (
          <Route key={route.path} path={route.path.slice(1)} element={route.element} />
        ))}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
