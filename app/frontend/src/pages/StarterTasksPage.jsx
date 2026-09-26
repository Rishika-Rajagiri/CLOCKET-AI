import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, ErrorMessage } from "../components/Layout.jsx";
import { ListTodo, FileText, Tag, Clock } from "lucide-react";

function TaskCard({ task, progress, onProgressChange }) {
  const [expanded, setExpanded] = React.useState(false);
  const currentStatus = progress?.status || "todo";

  return (
    <div className={`task-card difficulty-${task.difficulty}`}>
      <div className="task-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="task-header-left">
          <span className={`difficulty-dot difficulty-${task.difficulty}`} />
          <div>
            <div className="task-title">{task.title}</div>
            <div className="task-meta">
              <StatusBadge status={task.difficulty} />
              {task.estimated_effort && (
                <span className="text-muted text-xs"><Clock size={11} /> {task.estimated_effort}</span>
              )}
            </div>
          </div>
        </div>
        <div className="task-header-right">
          <select
            className={`progress-select status-${currentStatus}`}
            value={currentStatus}
            onChange={(e) => { e.stopPropagation(); onProgressChange(task.id, e.target.value); }}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="skipped">Skip</option>
          </select>
          <span className="expand-toggle">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="task-card-body">
          <p>{task.description}</p>

          {task.files_involved?.length > 0 && (
            <div className="task-section">
              <h4><FileText size={13} /> Files Involved</h4>
              <div className="file-tags">
                {task.files_involved.map((f) => (
                  <span key={f} className="file-tag font-mono text-xs">{f}</span>
                ))}
              </div>
            </div>
          )}

          {task.skills?.length > 0 && (
            <div className="task-section">
              <h4><Tag size={13} /> Skills</h4>
              <div className="skill-tags">
                {task.skills.map((s) => <span key={s} className="skill-tag">{s}</span>)}
              </div>
            </div>
          )}

          {task.acceptance_criteria?.length > 0 && (
            <div className="task-section">
              <h4>✓ Acceptance Criteria</h4>
              <ul className="criteria-list">
                {task.acceptance_criteria.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {task.reason && (
            <div className="task-reason">
              <strong>Why this task:</strong> {task.reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StarterTasksPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [tasks, setTasks] = React.useState([]);
  const [progressMap, setProgressMap] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    Promise.all([
      apiFetch(`/analysis/${repoId}/tasks`, {}, token),
      apiFetch(`/analysis/${repoId}/progress`, {}, token),
    ])
      .then(([tasksData, progressData]) => {
        setTasks(tasksData.tasks || []);
        const map = {};
        for (const p of progressData.progress || []) map[p.task_id] = p;
        setProgressMap(map);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, token]);

  async function handleProgressChange(taskId, status) {
    try {
      await apiFetch(
        `/analysis/${repoId}/progress`,
        { method: "POST", body: JSON.stringify({ task_id: taskId, status }) },
        token
      );
      setProgressMap((m) => ({ ...m, [taskId]: { ...(m[taskId] || {}), task_id: taskId, status } }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Layout title="Starter Tasks"><LoadingSpinner /></Layout>;

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.difficulty === filter);
  const counts = {
    all: tasks.length,
    beginner: tasks.filter((t) => t.difficulty === "beginner").length,
    intermediate: tasks.filter((t) => t.difficulty === "intermediate").length,
    advanced: tasks.filter((t) => t.difficulty === "advanced").length,
  };
  const done = Object.values(progressMap).filter((p) => p.status === "done").length;

  return (
    <Layout title="Starter Tasks">
      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {tasks.length > 0 && (
        <div className="task-summary-bar">
          <div className="progress-stat">
            <span className="progress-number">{done}</span>
            <span className="text-muted">/ {tasks.length} done</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="filter-tabs">
        {["all", "beginner", "intermediate", "advanced"].map((level) => (
          <button
            key={level}
            className={`filter-tab ${filter === level ? "active" : ""} filter-${level}`}
            onClick={() => setFilter(level)}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
            <span className="filter-count">{counts[level]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-muted">
          {tasks.length === 0
            ? "No starter tasks generated yet. Wait for analysis to complete."
            : `No ${filter} tasks found.`}
        </div>
      ) : (
        <div className="tasks-list">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              progress={progressMap[task.id]}
              onProgressChange={handleProgressChange}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
