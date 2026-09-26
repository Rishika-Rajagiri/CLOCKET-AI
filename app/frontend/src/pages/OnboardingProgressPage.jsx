import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, ErrorMessage } from "../components/Layout.jsx";
import { TrendingUp, CheckCircle, Circle, Clock, SkipForward } from "lucide-react";

const STATUS_ICON = {
  done: <CheckCircle size={16} className="text-green" />,
  in_progress: <Clock size={16} className="text-blue" />,
  todo: <Circle size={16} className="text-gray" />,
  skipped: <SkipForward size={16} className="text-gray" />,
};

export default function OnboardingProgressPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [data, setData] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    Promise.all([
      apiFetch(`/analysis/${repoId}/progress`, {}, token),
      apiFetch(`/analysis/${repoId}/tasks`, {}, token),
    ])
      .then(([prog, taskData]) => {
        setData(prog);
        setTasks(taskData.tasks || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, token]);

  if (loading) return <Layout title="My Onboarding Progress"><LoadingSpinner /></Layout>;

  const summary = data?.summary || { total_tasks: 0, completed_tasks: 0, percentage: 0 };
  const progressMap = {};
  for (const p of data?.progress || []) progressMap[p.task_id] = p;

  const byDifficulty = {
    beginner: tasks.filter((t) => t.difficulty === "beginner"),
    intermediate: tasks.filter((t) => t.difficulty === "intermediate"),
    advanced: tasks.filter((t) => t.difficulty === "advanced"),
  };

  return (
    <Layout title="My Onboarding Progress">
      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {/* Summary */}
      <div className="progress-summary">
        <div className="progress-donut-wrap">
          <svg viewBox="0 0 100 100" className="donut-svg">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="#3b82d4" strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 40 * summary.percentage / 100} ${2 * Math.PI * 40 * (1 - summary.percentage / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="50" textAnchor="middle" dy="0.35em" className="donut-label" fontSize="18" fontWeight="700" fill="#1f2328">
              {summary.percentage}%
            </text>
          </svg>
        </div>
        <div className="progress-stats">
          <div className="stat-box">
            <span className="stat-number text-green">{summary.completed_tasks}</span>
            <span className="stat-label">Tasks Completed</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{summary.total_tasks - summary.completed_tasks}</span>
            <span className="stat-label">Remaining</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{summary.total_tasks}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>
      </div>

      {/* By difficulty */}
      {Object.entries(byDifficulty).map(([diff, diffTasks]) => (
        diffTasks.length > 0 && (
          <div key={diff} className="card">
            <h3 className="card-title">
              <span className={`difficulty-dot difficulty-${diff}`} />
              {diff.charAt(0).toUpperCase() + diff.slice(1)} Tasks
              <span className="text-muted text-sm ml-auto">
                {diffTasks.filter((t) => progressMap[t.id]?.status === "done").length}/{diffTasks.length}
              </span>
            </h3>
            <div className="progress-task-list">
              {diffTasks.map((task) => {
                const p = progressMap[task.id];
                const status = p?.status || "todo";
                return (
                  <div key={task.id} className={`progress-task-row status-${status}`}>
                    {STATUS_ICON[status]}
                    <span className="task-name">{task.title}</span>
                    <StatusBadge status={status} />
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}

      {tasks.length === 0 && (
        <div className="card text-muted">
          No tasks available yet. Wait for the repository analysis to complete.
        </div>
      )}
    </Layout>
  );
}
