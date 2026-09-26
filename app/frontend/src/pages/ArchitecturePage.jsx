import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, LoadingSpinner, ErrorMessage } from "../components/Layout.jsx";

// Simple SVG-based architecture graph — no external charting library needed
function ArchGraph({ architecture }) {
  const sections = [
    { key: "frontend", label: "Frontend", color: "#3b82d4", items: architecture.frontend || [] },
    { key: "backend", label: "Backend", color: "#7c5cd8", items: architecture.backend || [] },
    { key: "database", label: "Database", color: "#22c55e", items: architecture.database || [] },
    { key: "authentication", label: "Auth", color: "#f59e0b", items: architecture.authentication || [] },
    { key: "deployment", label: "Deployment", color: "#64748b", items: architecture.deployment || [] },
    { key: "external_services", label: "External", color: "#ec4899", items: architecture.external_services || [] },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="arch-graph">
      {sections.map((section) => (
        <div key={section.key} className="arch-layer" style={{ "--layer-color": section.color }}>
          <div className="arch-layer-label" style={{ color: section.color }}>
            {section.label}
          </div>
          <div className="arch-layer-items">
            {section.items.map((item, i) => (
              <div key={i} className="arch-node" style={{ borderColor: section.color }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArchitecturePage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    apiFetch(`/analysis/${repoId}/results`, {}, token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, token]);

  if (loading) return <Layout title="Architecture"><LoadingSpinner /></Layout>;

  const arch = data?.analysis?.architecture || {};
  const summary = arch.summary || "";

  const dataFlows = arch.data_flow || [];
  const apis = data?.analysis?.apis || [];

  return (
    <Layout title="Architecture">
      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {summary && (
        <div className="card highlight-card">
          <p>{summary}</p>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">System Architecture</h3>
        {Object.values(arch).every((v) => !v || (Array.isArray(v) && v.length === 0) || typeof v === "string") ? (
          <p className="text-muted">Architecture analysis not yet available.</p>
        ) : (
          <ArchGraph architecture={arch} />
        )}
      </div>

      {dataFlows.length > 0 && (
        <div className="card">
          <h3 className="card-title">Data Flow</h3>
          <ol className="flow-list">
            {dataFlows.map((flow, i) => (
              <li key={i}>{flow}</li>
            ))}
          </ol>
        </div>
      )}

      {apis.length > 0 && (
        <div className="card">
          <h3 className="card-title">Detected API Endpoints ({apis.length})</h3>
          <div className="api-table-wrap">
            <table className="api-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {apis.slice(0, 50).map((api, i) => (
                  <tr key={i}>
                    <td><span className={`method-badge method-${(api.method || "GET").toLowerCase()}`}>{api.method || "GET"}</span></td>
                    <td className="font-mono text-sm">{api.path}</td>
                    <td className="text-muted text-xs">{api.file}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
