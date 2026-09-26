import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, ErrorMessage } from "../components/Layout.jsx";
import { Plus, GitBranch, Info } from "lucide-react";

export default function AddRepositoryPage() {
  const { token } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const repo = await apiFetch(
        "/repositories/",
        { method: "POST", body: JSON.stringify({ github_url: url.trim() }) },
        token
      );
      // Immediately trigger analysis
      await apiFetch(`/analysis/${repo.id}/trigger`, { method: "POST" }, token);
      navigate(`/repository/${repo.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Layout title="Add Repository">
      <div className="narrow-form">
        <div className="form-hero">
          <GitBranch size={32} className="form-hero-icon" />
          <p>
            Enter a public GitHub repository URL to generate an AI-powered onboarding guide.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form card">
          <label className="field">
            <span>GitHub Repository URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              required
              autoFocus
            />
            <span className="field-hint">
              Must be a public repository in the format: https://github.com/owner/repo
            </span>
          </label>

          <ErrorMessage message={error} onDismiss={() => setError("")} />

          <div className="info-box">
            <Info size={14} />
            <div>
              <strong>What happens next?</strong>
              <ul>
                <li>Repository is cloned and analyzed</li>
                <li>Technology stack and architecture are detected</li>
                <li>Setup guide is generated from evidence in the code</li>
                <li>Starter tasks are created based on real files</li>
                <li>Files are indexed for Codebase Q&A</li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="btn-primary btn-full"
          >
            {busy ? (
              <><span className="spinner-sm" /> Registering...</>
            ) : (
              <><Plus size={16} /> Add Repository & Start Analysis</>
            )}
          </button>
        </form>

        <div className="example-repos">
          <p className="text-muted text-sm">Try these example repositories:</p>
          <div className="example-list">
            {[
              "https://github.com/tiangolo/fastapi",
              "https://github.com/pallets/flask",
              "https://github.com/vercel/next.js",
            ].map((ex) => (
              <button
                key={ex}
                className="btn-ghost text-sm"
                onClick={() => setUrl(ex)}
              >
                {ex.replace("https://github.com/", "")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
