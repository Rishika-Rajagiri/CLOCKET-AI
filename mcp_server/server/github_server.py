"""GitHub MCP Server client adapter.

Uses the official GitHub MCP Server Docker image via MultiServerMCPClient,
the same pattern as mcp_server/server/git_server.py.

Read-only tools are allowed by default. Write tools (create_issue, push, etc.)
are excluded unless GITHUB_MCP_ALLOW_WRITE=true.
"""
from __future__ import annotations

import logging
import os

from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# Tools we want to expose from GitHub MCP (read-only subset)
_READ_ONLY_TOOLS = {
    "get_repository",
    "list_branches",
    "list_commits",
    "get_file_contents",
    "search_code",
    "search_repositories",
    "get_tree",
    "list_pull_requests",
    "get_pull_request",
    "list_issues",
    "get_issue",
    "get_me",
}


async def get_github_tools(repository: str | None = None):
    """
    Return LangChain tools from the official GitHub MCP Server.

    Requires:
      - GITHUB_TOKEN env var (GitHub personal access token)
      - Docker available in the container (or npx as fallback)
    """
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token:
        logger.warning("GITHUB_TOKEN not set — GitHub MCP tools unavailable")
        return []

    # Try Docker image first, fall back to npx
    docker_exe = _find_docker()
    if docker_exe:
        server_config = {
            "command": docker_exe,
            "args": [
                "run", "-i", "--rm",
                "-e", f"GITHUB_PERSONAL_ACCESS_TOKEN={github_token}",
                "ghcr.io/github/github-mcp-server",
            ],
            "transport": "stdio",
        }
    else:
        # Fallback: npx (slower but works without Docker)
        server_config = {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-github",
            ],
            "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": github_token},
            "transport": "stdio",
        }

    try:
        client = MultiServerMCPClient({"github": server_config})
        tools = await client.get_tools()

        allow_write = os.getenv("GITHUB_MCP_ALLOW_WRITE", "false").lower() == "true"
        if not allow_write:
            tools = [t for t in tools if t.name in _READ_ONLY_TOOLS]

        logger.info("GitHub MCP: loaded %d tools", len(tools))
        return tools

    except Exception as exc:
        logger.error("Failed to load GitHub MCP tools: %s", exc)
        return []


def _find_docker() -> str | None:
    import shutil
    return shutil.which("docker")
