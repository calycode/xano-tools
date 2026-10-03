# generate xanoscript

{% alert type="note" title="Description" %}
Process a Xano workspace into XanoScript files. Supports tables, functions and APIs. The Xano VS Code extension is the preferred solution over this command. These outputs are also included in the default repo generation command.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano generate xanoscript [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-b, --branch <branch>` | The branch name. This is used to select the branch configuration. Same as on Xano Interface. |
| `--print-output-dir` | Expose usable output path for further reuse. |
