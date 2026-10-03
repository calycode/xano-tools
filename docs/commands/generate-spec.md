# generate spec

{% alert type="note" title="Description" %}
Update and generate OpenAPI spec(s) for the current context, or all API groups at once. Fetches the API definition directly from the Xano instance via the metadata API (there is no local-input mode). Produces an opinionated API reference powered by Scalar and upgrades the docs to OAS 3.1+.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano generate spec [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-b, --branch <branch>` | The branch name. This is used to select the branch configuration. Same as on Xano Interface. |
| `-g, --group <name>` | API group name. Same as on Xano Interface. |
| `-A, --all` | Regenerate for all API groups in the workspace / branch of the current context. |
| `--print-output-dir` | Expose usable output path for further reuse. |
| `--include-tables` | Requests table schema fetching and inclusion into the generate spec. By default tables are not included. |
