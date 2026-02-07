---
description: Build XanoScript AI agents, MCP servers, or tools
mode: agent
---

Delegate to @xano-ai-builder to create AI-powered XanoScript components.

**Context to include:**
- Type of component (agent, tool, or MCP server)
- For agents: purpose, LLM provider preference, tools it should use
- For tools: what action it performs, input parameters, response format
- For MCP servers: which tools to expose, usage instructions

The agent will create properly structured files in `agents/`, `tools/`, or `mcp_servers/`.
