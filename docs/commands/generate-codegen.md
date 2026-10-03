# generate codegen

{% alert type="note" title="Description" %}
Create a client library from the OpenAPI specification. If the spec has not been generated yet, it is produced as the first step. Supports all OpenAPI Generator clients plus Orval clients (as orval-<client>).
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano generate codegen [passthroughArgs...] [options]
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
| `--generator <generator>` | Generator to use (default: typescript-fetch). If omitted in an interactive terminal you will be prompted to pick one. See all options at: https://openapi-generator.tech/docs/generators or the full list of orval clients. To use orval client, write the generator as this: orval-<orval-client>. |
| `--debug` | Specify this flag in order to allow logging. Logs will appear in output/_logs. Default: false |
