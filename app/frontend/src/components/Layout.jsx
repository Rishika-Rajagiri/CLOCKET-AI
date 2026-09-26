import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../main.jsx";
import {
  Home, Plus, GitBranch, Layers, Terminal, ListTodo,
  MessageSquare, TrendingUp, LogOut, Code2
} from "lucide-react";

export function Layout({ children, title }) {
  const { token, user, logout } = React.useContext(AuthContext);
  const location = useLocation();
  const { repoId } = useParams();

  const navItems = [
    { to: "/", icon: <Home size={16} />, label: "Dashboard" },
    { to: "/add-repository", icon: <Plus size={16} />, label: "Add Repository" },
  ];

  const repoItems = repoId ? [
    { to: `/repository/${repoId}`, icon: <GitBranch size={16} />, label: "Overview" },
    { to: `/repository/${repoId}/architecture`, icon: <Layers size={16} />, label: "Architecture" },
    { to: `/repository/${repoId}/setup`, icon: <Terminal size={16} />, label: "Setup Guide" },
    { to: `/repository/${repoId}/tasks`, icon: <ListTodo size={16} />, label: "Starter Tasks" },
    { to: `/repository/${repoId}/qa`, icon: <MessageSquare size={16} />, label: "Codebase Q&A" },
    { to: `/repository/${repoId}/progress`, icon: <TrendingUp size={16} />, label: "My Progress" },
  ] : [];

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <Code2 size={20} className="brand-icon" />
          <div>
            <span className="brand-name">DevOnboard AI</span>
            <span className="brand-sub">Smart Onboarding</span>
          </div>
        </div>

        <div className="nav-section">
          <span className="nav-section-label">Navigation</span>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${location.pathname === item.to ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        {repoItems.length > 0 && (
          <div className="nav-section">
            <span className="nav-section-label">Repository</span>
            {repoItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-item ${location.pathname === item.to ? "active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user?.email || "User"}</span>
          </div>
          <button className="btn-ghost" onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

export function StatusBadge({ status }) {
  const colors = {
    pending: "badge-gray",
    analyzing: "badge-blue",
    ready: "badge-green",
    failed: "badge-red",
    beginner: "badge-green",
    intermediate: "badge-amber",
    advanced: "badge-red",
    todo: "badge-gray",
    in_progress: "badge-blue",
    done: "badge-green",
    skipped: "badge-gray",
  };
  return (
    <span className={`badge ${colors[status] || "badge-gray"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

export function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss}>✕</button>}
    </div>
  );
}

export function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
