import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, LoadingSpinner, ErrorMessage } from "../components/Layout.jsx";
import { Send, FileText, MessageSquare } from "lucide-react";

function MessageBubble({ msg }) {
  return (
    <div className={`qa-message qa-${msg.role}`}>
      <div className="qa-role">{msg.role === "user" ? "You" : "DevOnboard AI"}</div>
      <div className="qa-text">{msg.answer || msg.question}</div>
      {msg.sources && msg.sources.length > 0 && (
        <div className="qa-sources">
          <span className="sources-label"><FileText size={11} /> Sources:</span>
          {msg.sources.map((s, i) => (
            <span key={i} className="source-file font-mono text-xs">{s.file}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  "How is authentication implemented?",
  "What are the main API endpoints?",
  "How does the database connection work?",
  "Where is the entry point for the backend?",
  "How are environment variables used?",
];

export default function CodebaseQAPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [messages, setMessages] = React.useState([]);
  const [question, setQuestion] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendQuestion(q) {
    const text = (q || question).trim();
    if (!text) return;
    setQuestion("");
    setError("");
    setMessages((m) => [...m, { role: "user", question: text }]);
    setBusy(true);
    try {
      const data = await apiFetch(
        `/analysis/${repoId}/qa`,
        { method: "POST", body: JSON.stringify({ question: text }) },
        token
      );
      setMessages((m) => [...m, {
        role: "assistant",
        answer: data.answer,
        sources: data.sources || [],
        chunk_count: data.chunk_count,
      }]);
    } catch (err) {
      setError(err.message);
      setMessages((m) => [...m, { role: "assistant", answer: `Error: ${err.message}`, sources: [] }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Codebase Q&A">
      <div className="qa-layout">
        <div className="qa-chat-area">
          {messages.length === 0 && (
            <div className="qa-welcome">
              <MessageSquare size={36} className="text-accent" />
              <h3>Ask anything about the codebase</h3>
              <p className="text-muted">
                Every answer is grounded in the actual repository files using RAG.
                Sources are always shown.
              </p>
              <div className="example-questions">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button key={q} className="example-q" onClick={() => sendQuestion(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {busy && (
            <div className="qa-message qa-assistant qa-thinking">
              <div className="qa-role">DevOnboard AI</div>
              <div className="thinking-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <ErrorMessage message={error} onDismiss={() => setError("")} />

        <form
          className="qa-composer"
          onSubmit={(e) => { e.preventDefault(); sendQuestion(); }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the codebase..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuestion();
              }
            }}
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="btn-primary"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </Layout>
  );
}
