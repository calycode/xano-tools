# registry add

{% alert type="note" title="Description" %}
Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano registry add [components...] [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-b, --branch <branch>` | The branch name. This is used to select the branch configuration. Same as on Xano Interface. |
| `--registry <url>` | URL to the component registry. Default: http://localhost:5500/registry/definitions |
