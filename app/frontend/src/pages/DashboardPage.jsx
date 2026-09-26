import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, EmptyState } from "../components/Layout.jsx";
import { Plus, GitBranch, ExternalLink, Trash2, Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";

const STATUS_ICON = {
  pending: <Clock size={14} />,
  analyzing: <Loader size={14} className="spin" />,
  ready: <CheckCircle size={14} />,
  failed: <AlertCircle size={14} />,
};

export default function DashboardPage() {
  const { token } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [repos, setRepos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchRepos = React.useCallback(async () => {
    try {
      const data = await apiFetch("/repositories/", {}, token);
      setRepos(data.repositories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchRepos();
    // Poll for status updates on repos that are analyzing
    const interval = setInterval(() => {
      if (repos.some((r) => r.status === "analyzing")) fetchRepos();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRepos, repos.some ? repos.some((r) => r.status === "analyzing") : false]);

  async function deleteRepo(repoId) {
    if (!confirm("Delete this repository and all associated analysis?")) return;
    try {
      await apiFetch(`/repositories/${repoId}`, { method: "DELETE" }, token);
      setRepos((r) => r.filter((x) => x.id !== repoId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Layout title="Dashboard"><LoadingSpinner text="Loading repositories..." /></Layout>;

  return (
    <Layout title="Dashboard">
      <div className="dashboard-header">
        <div>
          <p className="text-muted">
            {repos.length === 0
              ? "Get started by adding a GitHub repository to analyze."
              : `${repos.length} repositor${repos.length === 1 ? "y" : "ies"} tracked.`}
          </p>
        </div>
        <Link to="/add-repository" className="btn-primary">
          <Plus size={16} /> Add Repository
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {repos.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={40} />}
          title="No repositories yet"
          description="Add a public GitHub repository to generate your onboarding guide."
          action={
            <Link to="/add-repository" className="btn-primary">
              <Plus size={16} /> Add Your First Repository
            </Link>
          }
        />
      ) : (
        <div className="repo-grid">
          {repos.map((repo) => (
            <div key={repo.id} className="repo-card">
              <div className="repo-card-header">
                <GitBranch size={18} className="repo-icon" />
                <div className="repo-meta">
                  <span className="repo-name">{repo.owner}/{repo.name}</span>
                  <span className="repo-url text-muted">{repo.github_url}</span>
                </div>
              </div>

              <div className="repo-card-body">
                <div className="status-row">
                  {STATUS_ICON[repo.status]}
                  <StatusBadge status={repo.status} />
                  <span className="text-muted text-xs">
                    {new Date(repo.created_at).toLocaleDateString()}
                  </span>
                </div>
                {repo.error_message && (
                  <p className="error-text text-xs">{repo.error_message}</p>
                )}
              </div>

              <div className="repo-card-actions">
                {repo.status === "ready" && (
                  <Link to={`/repository/${repo.id}`} className="btn-sm btn-primary">
                    Open Onboarding
                  </Link>
                )}
                {repo.status === "failed" && (
                  <button
                    className="btn-sm btn-secondary"
                    onClick={async () => {
                      await apiFetch(`/analysis/${repo.id}/trigger`, { method: "POST" }, token);
                      fetchRepos();
                    }}
                  >
                    Retry Analysis
                  </button>
                )}
                {repo.status === "pending" && (
                  <button
                    className="btn-sm btn-primary"
                    onClick={async () => {
                      await apiFetch(`/analysis/${repo.id}/trigger`, { method: "POST" }, token);
                      fetchRepos();
                    }}
                  >
                    Start Analysis
                  </button>
                )}
                {repo.status === "analyzing" && (
                  <span className="text-muted text-sm">Analyzing...</span>
                )}
                <a
                  href={repo.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-sm btn-ghost"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  className="btn-sm btn-ghost btn-danger"
                  onClick={() => deleteRepo(repo.id)}
                  title="Delete repository"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
