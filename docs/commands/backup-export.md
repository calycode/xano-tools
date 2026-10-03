# backup export

{% alert type="note" title="Description" %}
Backup Xano Workspace via Metadata API
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano backup export [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-b, --branch <branch>` | The branch name. This is used to select the branch configuration. Same as on Xano Interface. |
| `--print-output-dir` | Expose usable output path for further reuse. |
| `-O, --output <dir>` | Output directory (overrides default config). |
