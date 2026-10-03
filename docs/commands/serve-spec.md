# serve spec

{% alert type="note" title="Description" %}
Serve the Open API specification locally for quick visual check, or to test your APIs via the Scalar API reference.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano serve spec [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-b, --branch <branch>` | The branch name. This is used to select the branch configuration. Same as on Xano Interface. |
| `-g, --group <name>` | API group name. Same as on Xano Interface. |
| `-A, --all` | Regenerate for all API groups in the workspace / branch of the current context. |
| `--listen <port>` | The port where you want your registry to be served locally. By default it is 5000. |
| `--cors` | Do you want to enable CORS? By default false. |
