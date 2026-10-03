# oc skills

{% alert type="note" title="Description" %}
Manage Xano skills: self-contained SKILL.md capability packs that teach the agent Xano-specific workflows (database optimization, security, best practices). Installed under ~/.calycode/opencode/skills.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano oc skills <command> [options]
```

## Subcommands

| Command | Description |
| --- | --- |
| `install` | Install or reinstall the Xano skill packs. Use --force to overwrite local edits. |
| `update` | Update skills by fetching the latest versions from GitHub. |
| `status` | Show the status of installed skills. |
| `clear-cache` | Clear the skills cache (skills will be re-downloaded on next install). |
