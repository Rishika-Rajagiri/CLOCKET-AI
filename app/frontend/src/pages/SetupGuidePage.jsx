import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, LoadingSpinner, ErrorMessage } from "../components/Layout.jsx";
import { Terminal, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Copy } from "lucide-react";

function CopyButton({ text }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button className="copy-btn" onClick={copy} title="Copy to clipboard">
      {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
    </button>
  );
}

function SetupStep({ step }) {
  const [expanded, setExpanded] = React.useState(true);
  return (
    <div className="setup-step">
      <div className="setup-step-header" onClick={() => setExpanded(!expanded)}>
        <span className="step-number">{step.step}</span>
        <span className="step-title">{step.title}</span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>
      {expanded && (
        <div className="setup-step-body">
          <p className="step-desc">{step.description}</p>
          {step.commands && step.commands.length > 0 && (
            <div className="commands-block">
              {step.commands.map((cmd, i) => (
                <div key={i} className="command-line">
                  <code>{cmd}</code>
                  <CopyButton text={cmd} />
                </div>
              ))}
            </div>
          )}
          {step.notes && <p className="step-notes">{step.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function SetupGuidePage() {
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

  if (loading) return <Layout title="Setup Guide"><LoadingSpinner /></Layout>;

  const analysis = data?.analysis;
  const setupSteps = analysis?.setup_guide || [];
  const envVars = analysis?.configuration?.env_vars || [];
  const issues = analysis?.setup_issues || [];

  return (
    <Layout title="Setup Guide">
      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {!analysis && (
        <div className="card text-muted">Analysis not yet available. Please wait for analysis to complete.</div>
      )}

      {/* Prerequisites */}
      {analysis?.technology_stack && (
        <div className="card">
          <h3 className="card-title"><Terminal size={16} /> Technology Stack</h3>
          <div className="prereq-list">
            {(analysis.technology_stack.frameworks || []).map((f) => (
              <span key={f} className="prereq-item">{f}</span>
            ))}
            {Object.entries(analysis.technology_stack.languages || {}).slice(0, 5).map(([lang]) => (
              <span key={lang} className="prereq-item prereq-lang">{lang}</span>
            ))}
          </div>
        </div>
      )}

      {/* Setup steps */}
      {setupSteps.length > 0 && (
        <div className="card">
          <h3 className="card-title">Setup Steps</h3>
          <div className="setup-steps">
            {setupSteps.map((step, i) => (
              <SetupStep key={i} step={typeof step === "object" ? step : { step: i + 1, title: String(step), commands: [], description: "" }} />
            ))}
          </div>
        </div>
      )}

      {/* Environment variables */}
      {envVars.length > 0 && (
        <div className="card">
          <h3 className="card-title">Environment Variables</h3>
          <table className="env-table">
            <thead>
              <tr><th>Variable</th><th>Required</th><th>Description</th></tr>
            </thead>
            <tbody>
              {envVars.map((v) => {
                const name = typeof v === "string" ? v : v.name;
                const required = typeof v === "object" ? v.required : true;
                const desc = typeof v === "object" ? v.description : "";
                return (
                  <tr key={name}>
                    <td><code className="font-mono">{name}</code></td>
                    <td>{required ? <span className="badge-required">required</span> : <span className="badge-optional">optional</span>}</td>
                    <td className="text-muted">{desc || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Configuration issues */}
      {issues.length > 0 && (
        <div className="card">
          <h3 className="card-title"><AlertTriangle size={16} /> Configuration Findings</h3>
          <div className="issues-list">
            {issues.map((issue, i) => (
              <div key={i} className={`issue-item severity-${issue.severity || "low"}`}>
                <span className="issue-type">{(issue.type || "").replace(/_/g, " ")}</span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {setupSteps.length === 0 && !error && analysis && (
        <div className="card text-muted">No setup steps were generated. The repository may not contain sufficient configuration files.</div>
      )}
    </Layout>
  );
}
