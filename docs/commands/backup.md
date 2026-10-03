# backup

{% alert type="note" title="Description" %}
Backup and restoration operations.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano backup <command> [options]
```

## Subcommands

| Command | Description |
| --- | --- |
| `export` | Backup Xano Workspace via Metadata API |
| `restore` | Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file. |
