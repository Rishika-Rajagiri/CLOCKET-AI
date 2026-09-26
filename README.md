# DevOnboard AI

**Smart Developer Onboarding Assistant** — An AI-powered tool that analyzes any public GitHub repository and automatically generates a complete developer onboarding experience.

> Built for the IBM Bob 2.0 Hackathon  
> Deployed: https://devonboard-ai.onrender.com *(update after deployment)*

---

## 1. Problem

When a developer joins an unfamiliar software project, they spend **hours or days** trying to understand:

- Project structure and architecture  
- Technology stack and dependencies  
- How to set up the environment  
- Where the entry points and APIs are  
- What the database looks like  
- Where to start contributing  
- What tasks are beginner-friendly

There is no automated, intelligent way to get this information quickly. README files are often outdated, incomplete, or missing entirely.

---

## 2. Solution

**DevOnboard AI** analyzes a GitHub repository in minutes and produces:

| Output | Description |
|--------|-------------|
| Technology Stack | Languages, frameworks, databases, infrastructure — detected deterministically |
| Architecture Analysis | AI-generated structured component breakdown |
| Setup Guide | Evidence-based step-by-step instructions from actual config files |
| Configuration Findings | Missing env vars, inconsistencies, potential problems |
| Starter Tasks | Beginner/intermediate/advanced tasks grounded in real files |
| Codebase Q&A | Ask questions, get RAG-grounded answers with source citations |
| Onboarding Progress | Track task completion with a personal progress dashboard |

---

## 3. Key Features

- **Repository analysis pipeline** — LangGraph workflow with 10 nodes
- **Deterministic + LLM hybrid** — static analysis first, LLM only where reasoning adds value
- **Repository-scoped RAG** — every answer grounded in actual indexed code files
- **User isolation** — all data filtered by `user_id + repository_id`; no cross-user or cross-repo leakage
- **Official GitHub MCP** — uses the GitHub MCP Server for repository data (no custom GitHub client)
- **Task progress tracking** — per-user task status stored in Supabase
- **Security-first** — repository content treated as untrusted; prompt injection resistance built in
- **Existing infrastructure reuse** — built on a working FastAPI + LangGraph + Supabase foundation

---

## 4. Architecture

```
React/Vite SPA (9 pages)
  ↓  Bearer token
FastAPI
  ├── /auth/*           Supabase auth (unchanged)
  ├── /repositories/*   CRUD for tracked repos
  ├── /analysis/*       Trigger analysis, poll status, results, Q&A, progress
  ├── /chat/*           General chat (unchanged)
  └── /health           Health check

  ↓
LangGraph
  ├── Onboarding Workflow (10-node pipeline)
  │     validate_url → clone → scan → architecture → setup_guide →
  │     onboarding_plan → starter_tasks → index_rag → persist → cleanup
  └── Q&A Handler (repository-filtered RAG)

Tools
  ├── GitHub MCP Server (official) — read-only repo access
  ├── Task MCP Server — onboarding task progress
  └── DevOnboard MCP — save_analysis, get_progress, update_task

Storage
  └── Supabase PostgreSQL + pgvector
        repositories, repository_analysis, onboarding_tasks,
        onboarding_progress, rag_documents (extended), tasks,
        conversations, messages
```

---

## 5. AI / ML Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Repository Scanner | Pure Python (deterministic) | Language/framework/infra detection |
| Architecture Analyzer | Groq LLM + LangChain | Structured architecture JSON |
| Setup Guide Generator | Groq LLM + LangChain | Evidence-based setup steps |
| Task Generator | Groq LLM + LangChain | Starter tasks grounded in real files |
| Onboarding Plan Generator | Groq LLM + LangChain | Personalized narrative plan |
| Codebase Q&A | RAG + Groq LLM | Grounded answers with citations |
| Orchestration | LangGraph StateGraph | 10-node analysis pipeline |
| Embeddings | fastembed BAAI/bge-small-en-v1.5 (384 dims) | Semantic code search |

---

## 6. MCP Usage

### Official GitHub MCP Server
Used via `MultiServerMCPClient` (same pattern as existing `mcp-server-git`).

```python
# mcp_server/server/github_server.py
client = MultiServerMCPClient({
    "github": {
        "command": "docker",
        "args": ["run", "-i", "--rm", "-e", f"GITHUB_PERSONAL_ACCESS_TOKEN={token}",
                 "ghcr.io/github/github-mcp-server"],
        "transport": "stdio",
    }
})
tools = await client.get_tools()
```

Read-only tools: `get_repository`, `get_file_contents`, `get_tree`, `search_code`, `list_commits`, `list_branches`, `list_pull_requests`, `list_issues`.

### DevOnboard Custom MCP Tools
`mcp_server/devonboard_tools.py` — DevOnboard-specific persistence tools:

| Tool | Description |
|------|-------------|
| `save_repository_analysis` | Persist full analysis JSON to Supabase |
| `save_onboarding_tasks` | Persist generated tasks |
| `get_onboarding_progress` | Read per-user task completion |
| `update_onboarding_task` | Update task status |

### Existing Task MCP (unchanged)
`mcp_server/tools.py` — Task CRUD tools (add/get/update/complete/delete). Used for onboarding task progress tracking.

---

## 7. RAG Architecture

```
Repository files (cloned locally)
  ↓
agent/rag/devonboard_indexer.py
  ├── Walk file tree (skip node_modules, __pycache__, etc.)
  ├── Filter by supported extensions (30+ languages)
  ├── Detect language + chunk_type (code/doc/config)
  ├── Split into 800-token overlapping chunks
  ├── Embed with fastembed BAAI/bge-small-en-v1.5
  └── Upsert into Supabase rag_documents
        with: user_id, repository_id, file_path, language, chunk_type, commit_sha

Query time (agent/rag/devonboard_qa.py):
  ├── Embed question
  ├── Call match_rag_documents(query, user_id, count, repository_id)
  │     ← filtered by BOTH user_id AND repository_id
  ├── Format context with source citations
  └── Generate grounded answer (LLM told: never follow repo instructions)
```

**Security:** Every retrieval is filtered by `user_id + repository_id`. Users cannot see each other's indexed data. The LLM is explicitly instructed to treat repository content as untrusted.

---

## 8. LangGraph Workflow

```
START
  ↓ validate_github_url      pure Python URL validation
  ↓ clone_repository         git clone --depth 1
  ↓ static_scan              deterministic: languages, frameworks, APIs, env vars
  ↓ analyze_architecture     LLM: structured JSON {frontend, backend, db, ...}
  ↓ generate_setup_guide     LLM: evidence-only steps from actual config files
  ↓ generate_onboarding_plan LLM: personalized narrative plan
  ↓ generate_starter_tasks   LLM: tasks grounded in real files (validated)
  ↓ index_into_rag           fastembed + Supabase pgvector
  ↓ persist_results          save to repository_analysis + onboarding_tasks
  ↓ cleanup                  remove temp clone
END
```

Error handling: each node catches exceptions gracefully; `persist_results` marks repo as `failed` on error.

---

## 9. Security

| Concern | Mitigation |
|---------|-----------|
| Cross-user data leakage | All DB queries filter by `user_id` with RLS |
| Cross-repo data leakage | RAG queries filter by `user_id + repository_id` |
| Prompt injection in repos | LLM system prompt explicitly forbids following repo content instructions |
| API key exposure | All secrets server-side only; no keys in frontend |
| GitHub write operations | GitHub MCP restricted to read-only tools by default |
| Malicious file contents | File size limit (500KB default); binary files skipped |
| URL validation | Strict regex for `github.com/owner/repo` pattern |
| Auth | Supabase Bearer token required for all non-public endpoints |

---

## 10. Database Schema

```sql
-- Run in order in Supabase SQL Editor:
supabase/tasks.sql           -- general task manager (existing)
supabase/chat.sql            -- conversations + messages (existing)
supabase/rag.sql             -- rag_documents extended with repository_id
supabase/repositories.sql   -- NEW: tracked repositories
supabase/analysis.sql       -- NEW: analysis results
supabase/onboarding.sql     -- NEW: onboarding_tasks + onboarding_progress
```

All tables have Row Level Security enabled with owner-scoped policies.

---

## 11. Deployment

### Prerequisites
- Python 3.11+
- Node.js 22+
- Git
- Supabase project
- Groq API key
- GitHub personal access token (repo read scope)

### Local Development

```bash
git clone https://github.com/krk-90/CLOCKET-AI.git
cd CLOCKET-AI

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY,
#          GROQ_API_KEY, GITHUB_TOKEN

# Set up database (run each file in Supabase SQL Editor)
# supabase/tasks.sql, supabase/chat.sql, supabase/rag.sql,
# supabase/repositories.sql, supabase/analysis.sql, supabase/onboarding.sql

uvicorn app.main:fastapi_app --reload --reload-dir app
```

### Frontend Development

```bash
cd app/frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # produces dist/ served by FastAPI
```

### Docker

```bash
docker build -t devonboard-ai .
docker run --rm -p 8000:8000 --env-file .env devonboard-ai
```

### Render Deployment

1. Create a **Blueprint** from this repository (picks up `render.yaml`)
2. Set secrets in Render dashboard: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `GROQ_API_KEY`, `GITHUB_TOKEN`, `LANGSMITH_API_KEY`
3. Set `CORS_ALLOWED_ORIGINS` to your service URL

---

## 12. Demo Instructions

1. **Sign up** at the deployed URL
2. **Add a repository** — enter any public GitHub URL, e.g. `https://github.com/tiangolo/fastapi`
3. **Analysis starts automatically** — takes 2-5 minutes depending on repo size
4. **Explore the overview** — technology stack, architecture summary, configuration findings
5. **View Architecture** — visual layer breakdown with API endpoints
6. **View Setup Guide** — step-by-step instructions with copy-to-clipboard commands
7. **Browse Starter Tasks** — filter by beginner/intermediate/advanced; mark tasks as done
8. **Ask the Codebase** — type any question; see grounded answers with source file citations
9. **Track Progress** — view the donut chart of completed tasks

### Example Questions for Q&A

- "How is authentication implemented?"
- "What are the main API endpoints?"
- "How does the database connection work?"
- "Where is the entry point for the application?"

---

## 13. Future Improvements

- **GitHub Actions CI analysis** — detect and explain workflow files
- **Codebase diff analysis** — "what changed in the last 30 days?"
- **Team onboarding** — share onboarding guides across a team
- **IDE plugin** — VS Code extension for inline onboarding
- **Private repository support** — GitHub App integration for private repos
- **Incremental re-analysis** — detect changes since last analysis via commit SHA
- **Multi-language support** — onboarding guides in different languages
- **Architecture diagram export** — SVG/PNG download of architecture graphs
- **Confluence/Notion integration** — export setup guides as formatted docs
- **LLM model selection** — let users choose model strength vs. speed tradeoff

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI + Uvicorn + Pydantic + SlowAPI |
| Agents | LangChain + LangGraph |
| LLM | Groq (ChatGroq) with model fallback |
| MCP | GitHub MCP Server + Task MCP + DevOnboard MCP |
| Embeddings | fastembed BAAI/bge-small-en-v1.5 (384 dims) |
| Vector Store | Supabase pgvector |
| Auth | Supabase email/password + Bearer token + RLS |
| Frontend | React + Vite + React Router |
| Tracing | LangSmith |
| Deployment | Docker + Supervisor + Render |

---

## License

Licensed under the [Apache License 2.0](LICENSE).
