---
name: caly-xano-cli
description: CLI for Xano backend automation - backups, OpenAPI specs, documentation, testing, code generation, and registry management. Use before running xano commands to ensure correct syntax and workflow.
---

# Caly Xano CLI

Automate backups, docs, testing, and version control for Xano backends.

## FIRST: Verify Installation

```bash
xano --version  # Requires v0.15.0+
```

If not installed:

```bash
npm install -g @calycode/cli
```

## Key Guidelines

- **Initialize first**: Run `xano init` before using any other commands. This sets up instance configuration.
- **Context-aware**: Most commands inherit `--instance`, `--workspace`, `--branch` from current context.
- **Use `--all` flag**: For bulk operations across all API groups in a workspace.
- **OpenAPI-centric**: Many commands generate or consume OpenAPI 3.1+ specifications.
- **Non-destructive by default**: Backup restore is the only destructive operation (requires explicit flags).

## Quick Start: New Project

```bash
# Initialize with Xano instance (interactive)
xano init

# Or non-interactive setup
xano init --name my-instance --url https://x123.xano.io --token <METADATA_API_TOKEN> --directory ./my-project
```

## Quick Reference: Core Commands

| Task                  | Command                                               |
| --------------------- | ----------------------------------------------------- |
| Initialize CLI        | `xano init`                                           |
| Generate OpenAPI spec | `xano generate spec`                                  |
| Generate all specs    | `xano generate spec --all`                            |
| Create SDK/client     | `xano generate codegen --generator typescript-axios`  |
| Generate docs         | `xano generate docs`                                  |
| Export backup         | `xano backup export`                                  |
| Restore backup        | `xano backup restore --source-backup backup.json`     |
| Run API tests         | `xano test run --test-config-path ./test-config.json` |
| Serve OpenAPI locally | `xano serve spec`                                     |

---

## Initialization

### Interactive Setup

```bash
xano init
```

Prompts for:

- Instance name (identifier for this config)
- Instance URL (e.g., `https://x123.xano.io`)
- Metadata API token (from Xano dashboard)
- Output directory

### Non-Interactive Setup

```bash
xano init \
  --name production \
  --url https://x123.xano.io \
  --token <METADATA_API_TOKEN> \
  --directory ./xano-project
```

### Options

| Option              | Description                  |
| ------------------- | ---------------------------- |
| `--name <name>`     | Instance identifier          |
| `--url <url>`       | Xano instance base URL       |
| `--token <token>`   | Metadata API token           |
| `--directory <dir>` | Output directory             |
| `--no-set-current`  | Don't set as current context |

---

## OpenAPI Specification Generation

### Generate for Single API Group

```bash
# Uses current context
xano generate spec

# Specify API group
xano generate spec --group "API Group Name"

# Include table schemas
xano generate spec --include-tables
```

### Generate for All API Groups

```bash
xano generate spec --all
```

### Options

| Option               | Description             |
| -------------------- | ----------------------- |
| `--instance <name>`  | Instance name from init |
| `--workspace <name>` | Workspace name          |
| `--branch <name>`    | Branch name             |
| `--group <name>`     | Specific API group      |
| `--all`              | All API groups          |
| `--include-tables`   | Include table schemas   |
| `--print-output-dir` | Print output path       |

### Output

Generates OpenAPI 3.1+ spec with Scalar API Reference documentation.

---

## Code Generation (SDK/Client)

### Generate TypeScript Client

```bash
xano generate codegen --generator typescript-axios
```

### Available Generators

Supports **all** OpenAPI Generator tools plus Orval clients:

```bash
# OpenAPI Generator (100+ generators)
xano generate codegen --generator typescript-axios
xano generate codegen --generator python
xano generate codegen --generator kotlin
xano generate codegen --generator swift5

# Orval clients (prefix with orval-)
xano generate codegen --generator orval-axios
xano generate codegen --generator orval-fetch
xano generate codegen --generator orval-react-query
```

### Passthrough Arguments

```bash
# Pass additional args to generator
xano generate codegen --generator typescript-axios -- --additional-properties=supportsES6=true
```

### Options

| Option               | Description                      |
| -------------------- | -------------------------------- |
| `--generator <name>` | Generator name                   |
| `--all`              | Generate for all API groups      |
| `--debug`            | Enable logging to `output/_logs` |

---

## Documentation Generation

### Generate Internal Docs

```bash
xano generate docs
```

Collects all descriptions and internal documentation from Xano instance into a static documentation suite.

### Options

| Option               | Description                        |
| -------------------- | ---------------------------------- |
| `-I, --input <file>` | Local schema file (.yaml or .json) |
| `-O, --output <dir>` | Output directory                   |
| `-F, --fetch`        | Force fetch from Xano API          |

---

## Repository Generation

### Generate Repo Structure

```bash
xano generate repo
```

Processes Xano workspace into a repo structure with Xanoscripts (Xano 2.0+).

### Options

| Option               | Description          |
| -------------------- | -------------------- |
| `-I, --input <file>` | Local schema file    |
| `-O, --output <dir>` | Output directory     |
| `-F, --fetch`        | Force fetch from API |

---

## Backups

### Export Backup

```bash
xano backup export
```

Creates a full backup of workspace via Metadata API.

### Restore Backup

```bash
xano backup restore --source-backup ./backup.json
```

**WARNING**: This is destructive! Overwrites all business logic and restores v1 branch. Data is also restored.

### Options

| Option                       | Description      |
| ---------------------------- | ---------------- |
| `--instance <name>`          | Target instance  |
| `--workspace <name>`         | Target workspace |
| `-S, --source-backup <file>` | Backup file path |

---

## API Testing

### Run Test Suite

```bash
xano test run --test-config-path ./test-config.json
```

Executes API tests based on OpenAPI spec.

### With Environment Variables

```bash
xano test run \
  --test-config-path ./test-config.json \
  --test-env API_KEY=secret \
  --test-env BASE_URL=https://api.example.com
```

### Options

| Option                      | Description                  |
| --------------------------- | ---------------------------- |
| `--test-config-path <path>` | Path to test config          |
| `--test-env <KEY=VALUE>`    | Inject env vars (repeatable) |
| `--all`                     | Test all API groups          |

### Test Config Schema

See: https://calycode.com/schemas/testing/config.json

---

## Local Servers

### Serve OpenAPI Spec

```bash
# Default port 5000
xano serve spec

# Custom port with CORS
xano serve spec --listen 8080 --cors
```

Opens Scalar API Reference for testing APIs locally.

### Serve Registry

```bash
xano serve registry --root ./my-registry --listen 5500
```

### Options

| Option            | Description                        |
| ----------------- | ---------------------------------- |
| `--listen <port>` | Port (default: 5000)               |
| `--cors`          | Enable CORS                        |
| `--root <path>`   | Registry directory (registry only) |

---

## Registry (Component Sharing)

### Add Component from Registry

```bash
xano registry add component-name

# Multiple components
xano registry add auth-flow user-management

# Custom registry URL
xano registry add component-name --registry https://my-registry.com/definitions
```

### Scaffold New Registry

```bash
xano registry scaffold --output ./my-registry
```

Creates a registry folder with sample component following the schema.

### Registry Schemas

- Registry: https://calycode.com/schemas/registry/registry.json
- Registry Item: https://calycode.com/schemas/registry/registry-item.json

---

## AI Integration (OpenCode)

Uses the latest available OpenCode version via `npx opencode`. Use this when requiring custom subagents to work on subtasks.
More on OpenCode here: https://opencode.ai/docs

### Initialize OpenCode Host

```bash
xano oc init
```

Sets up native host integration for the @calycode extension.

### Serve OpenCode Server

```bash
# Default port 4096
xano oc serve

# Custom port, detached mode
xano oc serve --port 8000 --detach
```

### Execute OpenCode CLI commands:
```bash
# Run any task with OpenCode
xano oc run "/review"
```

---

## Common Context Options

Most commands accept these context options:

| Option               | Description                    |
| -------------------- | ------------------------------ |
| `--instance <name>`  | Instance name from init        |
| `--workspace <name>` | Workspace name (as in Xano UI) |
| `--branch <name>`    | Branch name (as in Xano UI)    |
| `--group <name>`     | API group name                 |
| `--all`              | Apply to all API groups        |
| `--print-output-dir` | Output the result path         |

---

## Typical Workflows

### Initial Setup

```bash
# 1. Initialize
xano init --name prod --url https://x123.xano.io --token $TOKEN --directory ./project

# 2. Generate OpenAPI specs
xano generate spec --all

# 3. Generate TypeScript client
xano generate codegen --generator typescript-axios --all
```

### CI/CD Pipeline

```bash
# Generate specs and client
xano generate spec --all
xano generate codegen --generator typescript-axios --all

# Run tests
xano test run --test-config-path ./test-config.json --all

# Create backup
xano backup export
```

### Local Development

```bash
# Serve OpenAPI docs locally
xano serve spec --listen 5000 --cors

# In another terminal, serve registry
xano serve registry --root ./registry --listen 5500
```

---

## Troubleshooting

| Issue                     | Solution                                       |
| ------------------------- | ---------------------------------------------- |
| `command not found: xano` | Install: `npm install -g @calycode/cli`        |
| Auth/token errors         | Re-run `xano init` with valid token            |
| Context not found         | Ensure `xano init` was run in project          |
| API group not found       | Check `--group` matches Xano UI exactly        |
| Spec generation fails     | Verify Metadata API token has read permissions |

---

## Resources

- GitHub: https://github.com/calycode/xano-tools
- Discord: https://links.calycode.com/discord
- Test Config Schema: https://calycode.com/schemas/testing/config.json
- Registry Schema: https://calycode.com/schemas/registry/registry.json
