# oc

{% alert type="note" title="Description" %}
Manage OpenCode AI integration and tools.
  Powered by OpenCode - The open source AI coding agent.
  GitHub: https://github.com/anomalyco/opencode
  License: MIT (see LICENSES/opencode-ai.txt)
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano oc <command> [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--cwd` | Run OpenCode proxy commands from the current shell directory |
| `--workdir <path>` | Run OpenCode proxy commands from a specific working directory |
| `--oc-version <version>` | Override OpenCode package version for this command |

## Subcommands

| Command | Description |
| --- | --- |
| `init` | Initialize OpenCode native host integration and configuration for use with the CalyCode extension. |
| `templates` | Manage the OpenCode agent configuration: opencode.json, AGENTS.md, and the agents/ + commands/ prompt files that shape how the AI behaves. Installed under ~/.calycode/opencode. |
| `skills` | Manage Xano skills: self-contained SKILL.md capability packs that teach the agent Xano-specific workflows (database optimization, security, best practices). Installed under ~/.calycode/opencode/skills. |
| `serve` | Serve the OpenCode AI server locally. |
| `native-host` | Native host operations for browser extension integration. |
| `run` | Run any OpenCode CLI command (default) |
