# oc templates

{% alert type="note" title="Description" %}
Manage the OpenCode agent configuration: opencode.json, AGENTS.md, and the agents/ + commands/ prompt files that shape how the AI behaves. Installed under ~/.calycode/opencode.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano oc templates <command> [options]
```

## Subcommands

| Command | Description |
| --- | --- |
| `install` | Install or reinstall the OpenCode agent configuration (opencode.json, AGENTS.md, agents/, commands/). Use --force to overwrite local edits. |
| `update` | Update templates by fetching the latest versions from GitHub. |
| `status` | Show the status of installed OpenCode templates. |
| `clear-cache` | Clear the template cache (templates will be re-downloaded on next install). |
