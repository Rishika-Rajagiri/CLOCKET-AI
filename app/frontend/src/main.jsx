import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";

// Pages
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AddRepositoryPage from "./pages/AddRepositoryPage.jsx";
import RepositoryOverviewPage from "./pages/RepositoryOverviewPage.jsx";
import ArchitecturePage from "./pages/ArchitecturePage.jsx";
import SetupGuidePage from "./pages/SetupGuidePage.jsx";
import StarterTasksPage from "./pages/StarterTasksPage.jsx";
import CodebaseQAPage from "./pages/CodebaseQAPage.jsx";
import OnboardingProgressPage from "./pages/OnboardingProgressPage.jsx";

// Auth context
export const AuthContext = React.createContext(null);
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiFetch(path, options = {}, token = "") {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.detail || payload.message || "Request failed");
  return payload;
}

function AuthProvider({ children }) {
  const [token, setToken] = React.useState(
    () => localStorage.getItem("devonboard_token") || ""
  );
  const [user, setUser] = React.useState(null);

  const login = (accessToken) => {
    localStorage.setItem("devonboard_token", accessToken);
    setToken(accessToken);
  };

  const logout = () => {
    localStorage.removeItem("devonboard_token");
    localStorage.removeItem("devonboard_repo");
    setToken("");
    setUser(null);
  };

  React.useEffect(() => {
    if (!token) return;
    apiFetch("/auth/me", {}, token)
      .then(setUser)
      .catch(() => logout());
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { token } = React.useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/add-repository" element={<ProtectedRoute><AddRepositoryPage /></ProtectedRoute>} />
          <Route path="/repository/:repoId" element={<ProtectedRoute><RepositoryOverviewPage /></ProtectedRoute>} />
          <Route path="/repository/:repoId/architecture" element={<ProtectedRoute><ArchitecturePage /></ProtectedRoute>} />
          <Route path="/repository/:repoId/setup" element={<ProtectedRoute><SetupGuidePage /></ProtectedRoute>} />
          <Route path="/repository/:repoId/tasks" element={<ProtectedRoute><StarterTasksPage /></ProtectedRoute>} />
          <Route path="/repository/:repoId/qa" element={<ProtectedRoute><CodebaseQAPage /></ProtectedRoute>} />
          <Route path="/repository/:repoId/progress" element={<ProtectedRoute><OnboardingProgressPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
