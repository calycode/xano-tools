# backup restore

{% alert type="note" title="Description" %}
Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano backup restore [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-S, --source-backup <file>` | Local path to the backup file to restore. |
