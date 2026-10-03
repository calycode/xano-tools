# init

{% alert type="note" title="Description" %}
Initialize the CLI with Xano instance configurations (interactively or via flags), this enables the CLI to know about context, APIs and in general this is required for any command to succeed.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano init [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--name <name>` | Instance name (for non-interactive setup) |
| `--url <url>` | Instance base URL (for non-interactive setup) |
| `--token <token>` | Metadata API token (for non-interactive setup) |
| `--directory <directory>` | Directory where to init the repo (for non-interactive setup) |
| `--no-set-current` | Flag to not set this instance as the current context, by default it is set. |
