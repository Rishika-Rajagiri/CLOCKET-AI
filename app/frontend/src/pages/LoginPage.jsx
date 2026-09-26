import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { LogIn, UserPlus, Code2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState("login");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        login(data.access_token);
        navigate("/");
      } else {
        await apiFetch("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setMode("login");
        setError("Account created! Please sign in.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <Code2 size={40} className="login-logo" />
        <h1>DevOnboard AI</h1>
        <p className="login-tagline">Smart Developer Onboarding Assistant</p>
        <div className="login-features">
          <div className="feature-pill">🔍 Repository Analysis</div>
          <div className="feature-pill">🏗️ Architecture Insights</div>
          <div className="feature-pill">📋 Starter Tasks</div>
          <div className="feature-pill">💬 Codebase Q&A</div>
        </div>
        <div className="security-note">
          <ShieldCheck size={14} />
          <span>Secured with Supabase authentication</span>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-tabs">
          <button
            className={mode === "login" ? "tab-active" : ""}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            className={mode === "signup" ? "tab-active" : ""}
            onClick={() => setMode("signup")}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>

          {error && (
            <div className={`form-message ${error.includes("created") ? "form-success" : "form-error"}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="btn-primary btn-full"
          >
            {mode === "login" ? (
              <><LogIn size={16} /> Sign In</>
            ) : (
              <><UserPlus size={16} /> Create Account</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
