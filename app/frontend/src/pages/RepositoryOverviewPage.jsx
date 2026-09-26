import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, ErrorMessage } from "../components/Layout.jsx";
import { GitBranch, Layers, Terminal, ListTodo, MessageSquare, TrendingUp, ExternalLink, RefreshCw, Code, Database, Globe, Box, Star } from "lucide-react";

export default function RepositoryOverviewPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchData = React.useCallback(async () => {
    try {
      const result = await apiFetch(`/analysis/${repoId}/results`, {}, token);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [repoId, token]);

  React.useEffect(() => {
    fetchData();
    let interval;
    if (data?.repository?.status === "analyzing") {
      interval = setInterval(fetchData, 5000);
    }
    return () => clearInterval(interval);
  }, [fetchData, data?.repository?.status]);

  if (loading) return <Layout title="Repository Overview"><LoadingSpinner text="Loading repository data..." /></Layout>;

  const repo = data?.repository;
  const analysis = data?.analysis;

  if (!repo) return <Layout title="Repository Overview"><ErrorMessage message="Repository not found." /></Layout>;

  const stack = analysis?.technology_stack || {};
  const langs = Object.entries(stack.languages || {}).slice(0, 6);
  const frameworks = stack.frameworks || [];
  const infra = stack.infrastructure || [];
  const databases = analysis?.database_info?.databases || [];

  const navCards = [
    { to: `/repository/${repoId}/architecture`, icon: <Layers size={20} />, label: "Architecture", desc: "Visual component breakdown" },
    { to: `/repository/${repoId}/setup`, icon: <Terminal size={20} />, label: "Setup Guide", desc: "Step-by-step instructions" },
    { to: `/repository/${repoId}/tasks`, icon: <ListTodo size={20} />, label: "Starter Tasks", desc: "Beginner-friendly contributions" },
    { to: `/repository/${repoId}/qa`, icon: <MessageSquare size={20} />, label: "Codebase Q&A", desc: "Ask questions about the code" },
    { to: `/repository/${repoId}/progress`, icon: <TrendingUp size={20} />, label: "My Progress", desc: "Track your onboarding journey" },
  ];

  return (
    <Layout title={`${repo.owner}/${repo.name}`}>
      {error && <ErrorMessage message={error} onDismiss={() => setError("")} />}

      {/* Status banner */}
      {repo.status !== "ready" && (
        <div className={`status-banner status-${repo.status}`}>
          {repo.status === "analyzing" && (
            <><span className="spinner-sm" /> Analyzing repository... This may take a few minutes.</>
          )}
          {repo.status === "failed" && (
            <>Analysis failed: {repo.error_message}
              <button className="btn-sm btn-secondary ml-auto" onClick={async () => {
                await apiFetch(`/analysis/${repoId}/trigger`, { method: "POST" }, token);
                fetchData();
              }}>
                <RefreshCw size={13} /> Retry
              </button>
            </>
          )}
          {repo.status === "pending" && (
            <>Analysis pending.
              <button className="btn-sm btn-primary ml-auto" onClick={async () => {
                await apiFetch(`/analysis/${repoId}/trigger`, { method: "POST" }, token);
                fetchData();
              }}>
                Start Analysis
              </button>
            </>
          )}
        </div>
      )}

      {/* Repository header */}
      <div className="card repo-header-card">
        <div className="repo-title-row">
          <GitBranch size={24} className="text-accent" />
          <div>
            <h2>{repo.owner}/{repo.name}</h2>
            <a href={repo.github_url} target="_blank" rel="noopener noreferrer" className="text-muted text-sm link-external">
              {repo.github_url} <ExternalLink size={12} />
            </a>
          </div>
          <StatusBadge status={repo.status} />
        </div>
        {analysis?.onboarding_plan && (
          <p className="onboarding-plan-summary">{analysis.onboarding_plan.substring(0, 300)}{analysis.onboarding_plan.length > 300 ? "..." : ""}</p>
        )}
      </div>

      {/* Tech stack */}
      {analysis && (
        <div className="cards-grid-3">
          <div className="card">
            <h3 className="card-title"><Code size={16} /> Languages</h3>
            <div className="tag-list">
              {langs.map(([lang, count]) => (
                <span key={lang} className="tag">{lang} <span className="tag-count">({count})</span></span>
              ))}
              {langs.length === 0 && <span className="text-muted">None detected</span>}
            </div>
          </div>
          <div className="card">
            <h3 className="card-title"><Box size={16} /> Frameworks</h3>
            <div className="tag-list">
              {frameworks.map((f) => <span key={f} className="tag tag-blue">{f}</span>)}
              {frameworks.length === 0 && <span className="text-muted">None detected</span>}
            </div>
          </div>
          <div className="card">
            <h3 className="card-title"><Database size={16} /> Databases</h3>
            <div className="tag-list">
              {databases.map((d) => <span key={d} className="tag tag-purple">{d}</span>)}
              {infra.map((i) => <span key={i} className="tag tag-gray">{i}</span>)}
              {databases.length === 0 && infra.length === 0 && <span className="text-muted">None detected</span>}
            </div>
          </div>
        </div>
      )}

      {/* Navigation cards */}
      <h3 className="section-title">Onboarding Sections</h3>
      <div className="nav-cards-grid">
        {navCards.map((card) => (
          <Link key={card.to} to={card.to} className="nav-card">
            <div className="nav-card-icon">{card.icon}</div>
            <div>
              <div className="nav-card-label">{card.label}</div>
              <div className="nav-card-desc">{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Setup issues */}
      {analysis?.setup_issues?.length > 0 && (
        <div className="card">
          <h3 className="card-title text-amber">⚠ Configuration Findings</h3>
          <div className="issues-list">
            {analysis.setup_issues.map((issue, i) => (
              <div key={i} className={`issue-item severity-${issue.severity}`}>
                <span className="issue-type">{issue.type?.replace(/_/g, " ")}</span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
