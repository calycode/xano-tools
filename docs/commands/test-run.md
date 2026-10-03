# test run

{% alert type="note" title="Description" %}
Run an API test suite. Requires a test config file (.json or .js). Schema: https://calycode.com/schemas/testing/config.json | Full guide: https://calycode.github.io/xano-tools/#/guides/testing
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano test run [options]
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
| `-c, --config <path>` | Path to the test configuration file (.json or .js). |
| `-e, --env <keyValue...>` | Inject environment variables (KEY=VALUE) for tests. Repeatable. |
| `--ci` | CI mode: exit with code 1 if any tests fail. Use to block releases. |
| `--fail-on-warnings` | In CI mode, also fail if there are warnings (not just errors). |
