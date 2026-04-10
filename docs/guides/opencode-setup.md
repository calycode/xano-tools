# OpenCode AI Agent Setup

This guide covers setting up and using the OpenCode AI agent integration with the CalyCode CLI for AI-assisted Xano development.

> **Note:** The CLI binary name changed from `xano` to `caly-xano` in v2.0. All commands below use `caly-xano`. If you're using an older version, replace `caly-xano` with `xano`.

> [!NOTE]
> CalyCode integrates with [OpenCode](https://opencode.ai), an open-source AI coding agent licensed under MIT. CalyCode is **not affiliated with, maintained by, or endorsed by** the OpenCode project. We simply leverage their excellent open-source tooling to provide AI-assisted Xano development capabilities.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Setup Command](#setup-command)
- [Running OpenCode](#running-opencode)
- [Agents & Slash Commands](#agents--slash-commands)
- [Skills](#skills)
- [Configuration Files](#configuration-files)
- [Native Host for Browser Extension](#native-host-for-browser-extension)
- [Troubleshooting](#troubleshooting)

## Overview

The CalyCode CLI integrates with [OpenCode](https://opencode.ai), an open-source AI coding agent. This integration provides:

- **Specialized Xano Agents** - AI agents trained for XanoScript development
- **Slash Commands** - Quick actions for common Xano tasks
- **Skills** - Domain-specific knowledge for database design, security, and performance
- **Browser Extension Support** - Native messaging host for the CalyCode Chrome extension

## Quick Start

```bash
# 1. Install the CLI globally
npm install -g @calycode/cli

# 2. Set up OpenCode with agents, commands, and skills
caly-xano oc setup

# 3. Run OpenCode interactively
caly-xano oc run

# 4. Or run with a specific agent
caly-xano oc run "@xano-planner Plan a user authentication system"
```

## Setup Command

The `caly-xano oc setup` command installs everything needed for AI-assisted development:

```bash
caly-xano oc setup [options]
```

### Options

| Option           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `--force`        | Re-download and overwrite existing configuration |
| `--skip-config`  | Skip template/skill installation                 |
| `--extension-id` | Register additional Chrome extension IDs         |

### What Gets Installed

The setup command installs files to `~/.calycode/opencode/`:

```
~/.calycode/opencode/
├── opencode.json       # OpenCode configuration
├── AGENTS.md           # Global agent instructions
├── agents/             # Specialized agents
│   ├── xano-planner.md
│   ├── xano-table-designer.md
│   ├── xano-function-writer.md
│   ├── xano-api-writer.md
│   ├── xano-addon-writer.md
│   ├── xano-task-writer.md
│   ├── xano-ai-builder.md
│   └── ...
├── commands/           # Slash commands
│   ├── xano-plan.md
│   ├── xano-table.md
│   ├── xano-function.md
│   ├── xano-api.md
│   └── ...
└── skills/             # Domain-specific knowledge
    ├── xano-database-best-practices/
    ├── xano-query-performance/
    ├── xano-schema-design/
    ├── xano-security/
    ├── xano-data-access/
    ├── xano-monitoring/
    └── caly-xano-cli/
```

### Update Templates

To get the latest agents, commands, and skills:

```bash
# Force re-download all templates
caly-xano oc setup --force

# Or update just templates
caly-xano oc update
```

## Running OpenCode

### Interactive Mode

Start an interactive AI coding session:

```bash
# Start OpenCode in the current directory
caly-xano oc run

# Start in a specific project directory
caly-xano oc run --workdir /path/to/project
```

### With Initial Prompt

Run with a specific task or agent:

```bash
# Use a specialized agent
caly-xano oc run "@xano-planner Design a blog backend with posts and comments"

# Use a slash command
caly-xano oc run "/xano-table Create a users table with email and password"

# Simple prompt
caly-xano oc run "Help me understand this XanoScript function"
```

### Server Mode

Run OpenCode as an HTTP server for programmatic access:

```bash
# Start server on default port (4096)
caly-xano oc serve

# Start on a specific port
caly-xano oc serve --port 8080

# Start in background (detached)
caly-xano oc serve --detach
```

## Agents & Slash Commands

### Specialized Agents

Use `@agent-name` to delegate to specialized agents:

| Agent                   | Use Case                                         |
| ----------------------- | ------------------------------------------------ |
| `@xano-planner`         | Plan features and create implementation roadmaps |
| `@xano-table-designer`  | Design database tables with schemas and indexes  |
| `@xano-function-writer` | Create reusable functions with business logic    |
| `@xano-api-writer`      | Create REST API endpoints                        |
| `@xano-addon-writer`    | Create addons for related data fetching          |
| `@xano-task-writer`     | Create scheduled tasks for background processing |
| `@xano-ai-builder`      | Build AI agents, tools, and MCP servers          |
| `@xano-expert`          | General Xano expertise and troubleshooting       |
| `@debug-helper`         | Debug API and function issues                    |

### Examples

```bash
# Plan a feature
caly-xano oc run "@xano-planner Plan a subscription billing system with Stripe"

# Design a table
caly-xano oc run "@xano-table-designer Create a products table for an e-commerce store"

# Create an API
caly-xano oc run "@xano-api-writer Create CRUD endpoints for user management"

# Debug an issue
caly-xano oc run "@debug-helper My API is returning 500 errors on POST requests"
```

### Slash Commands

Use `/command` for quick actions:

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `/xano-plan`     | Plan a feature or project implementation |
| `/xano-table`    | Create a XanoScript database table       |
| `/xano-function` | Create a XanoScript function             |
| `/xano-api`      | Create a XanoScript API endpoint         |
| `/xano-addon`    | Create a XanoScript addon                |
| `/xano-task`     | Create a XanoScript scheduled task       |
| `/xano-ai`       | Build AI agents, tools, or MCP servers   |
| `/xano-docs`     | Search Xano documentation                |
| `/debug-api`     | Debug an API endpoint                    |
| `/generate-sdk`  | Generate TypeScript SDK from OpenAPI     |

### Examples

```bash
# Create a table
caly-xano oc run "/xano-table users with email, password_hash, role enum (admin, user)"

# Create a function
caly-xano oc run "/xano-function calculate_order_total that sums line items with tax"

# Create an API
caly-xano oc run "/xano-api POST /checkout that processes payment and creates order"
```

## Skills

Skills provide domain-specific knowledge that agents can reference. They are loaded automatically when relevant tasks are detected.

### Available Skills

| Skill                          | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `xano-database-best-practices` | PostgreSQL best practices for Xano             |
| `xano-query-performance`       | Query optimization, N+1 prevention, indexing   |
| `xano-schema-design`           | Schema normalization, data types, constraints  |
| `xano-security`                | Row Level Security, injection prevention, auth |
| `xano-data-access`             | Addons, batch operations, caching patterns     |
| `xano-monitoring`              | Query Analytics, debugging slow queries        |
| `caly-xano-cli`                | CalyCode CLI commands and workflows            |

### Skill Selection Guide

| Task                 | Primary Skill            | Supporting Skills              |
| -------------------- | ------------------------ | ------------------------------ |
| New table design     | `xano-schema-design`     | `xano-database-best-practices` |
| Slow API response    | `xano-query-performance` | `xano-monitoring`              |
| N+1 query issues     | `xano-query-performance` | `xano-data-access`             |
| Security audit       | `xano-security`          | `xano-data-access`             |
| CLI commands         | `caly-xano-cli`          | -                              |
| Production debugging | `xano-monitoring`        | `xano-query-performance`       |

### Using Skills Explicitly

You can reference skills in your prompts:

```bash
caly-xano oc run "Use the xano-security skill to review this login endpoint"

caly-xano oc run "Apply xano-query-performance patterns to optimize this data fetching"
```

## Configuration Files

### opencode.json

The main OpenCode configuration at `~/.calycode/opencode/opencode.json`:

```json
{
   "$schema": "https://opencode.ai/config.json",
   "model": "anthropic/claude-sonnet-4-20250514",
   "small_model": "anthropic/claude-haiku-4-20250514",
   "autoupdate": true,
   "instructions": ["~/.config/opencode/AGENTS.md"],
   "permission": {
      "edit": "ask",
      "bash": {
         "*": "ask",
         "git status": "allow",
         "git diff": "allow",
         "git log": "allow",
         "npm test": "allow",
         "pnpm test": "allow"
      }
   }
}
```

### Customizing Configuration

You can modify the configuration to:

- Change the default model
- Add custom instructions
- Adjust permission settings
- Enable auto-approve for specific commands

### Environment Variables

| Variable                  | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `OPENCODE_CONFIG_DIR`     | Override OpenCode config directory                        |
| `CALY_EXTRA_CORS_ORIGINS` | Additional CORS origins for server mode (comma-separated) |

## Native Host for Browser Extension

The CLI can act as a native messaging host for the CalyCode Chrome extension, enabling browser-to-local communication.

### How It Works

1. Browser extension sends messages via Chrome's Native Messaging API
2. The native host (CLI) receives and processes requests
3. OpenCode server can be started/stopped from the browser
4. Results are returned to the extension

### Setup

The native host is automatically configured during `caly-xano oc setup`. For manual setup:

```bash
# Install native host manifest
caly-xano oc setup

# The manifest is created at:
# Windows: %USERPROFILE%\.calycode\com.calycode.host.json
# macOS: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/
# Linux: ~/.config/google-chrome/NativeMessagingHosts/
```

### Testing Native Host

```bash
# Start native host directly (for debugging)
caly-xano oc native-host

# The native host listens for JSON messages on stdin
# and responds on stdout using Chrome's native messaging protocol
```

## Troubleshooting

### Common Issues

| Issue                   | Solution                                                   |
| ----------------------- | ---------------------------------------------------------- |
| "OpenCode not found"    | Run `caly-xano oc setup` to install configuration           |
| "Agent not recognized"  | Check agent name spelling, run `caly-xano oc setup --force` |
| "Permission denied"     | Adjust permissions in `opencode.json`                      |
| Templates out of date   | Run `caly-xano oc setup --force` to update                  |
| Native host not working | Re-run `caly-xano oc setup`, check registry (Windows)       |
| Server won't start      | Check if port is in use, try different port                |

### Checking Installation Status

```bash
# Check what's installed
ls ~/.calycode/opencode/

# View configuration
cat ~/.calycode/opencode/opencode.json

# List available agents
ls ~/.calycode/opencode/agents/

# List available commands
ls ~/.calycode/opencode/commands/

# List available skills
ls ~/.calycode/opencode/skills/
```

### Logs

Native host logs are written to `~/.calycode/logs/native-host.log`:

```bash
# View logs (Unix)
tail -f ~/.calycode/logs/native-host.log

# View logs (Windows PowerShell)
Get-Content -Wait $env:USERPROFILE\.calycode\logs\native-host.log
```

### Clearing Cache

```bash
# Clear template cache and re-download
caly-xano oc setup --force
```

## Best Practices

### 1. Recommended Workflow

1. **Plan first** - Use `@xano-planner` to create an implementation plan
2. **Tables first** - Create database schemas before APIs
3. **Functions for reuse** - Extract common logic into functions
4. **APIs last** - Build endpoints that use tables and functions
5. **Tasks for automation** - Add scheduled jobs as needed

### 2. Organize Your Prompts

```bash
# Be specific about what you want
caly-xano oc run "@xano-table-designer Create a products table with:
- name (text, required, max 255)
- price (decimal, required, min 0)
- description (text, optional)
- category_id (foreign key to categories)
- created_at (timestamp, auto)"

# Provide context
caly-xano oc run "@xano-api-writer Create a checkout API that:
- Uses the orders table we just created
- Validates cart items exist
- Calculates total with tax
- Returns order confirmation"
```

### 3. Use Skills for Complex Tasks

For optimization or security-sensitive work, reference the appropriate skill:

```bash
# Security review
caly-xano oc run "Use xano-security skill to audit this user registration endpoint"

# Performance optimization
caly-xano oc run "Apply xano-query-performance to optimize this dashboard query"
```

## Resources

- [OpenCode Documentation](https://opencode.ai/docs)
- [XanoScript Guide](/guides/xanoscript)
- [CalyCode CLI Reference](/commands)
- [GitHub Repository](https://github.com/calycode/xano-tools)
- [Discord Community](https://links.calycode.com/discord)
