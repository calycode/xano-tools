# oc serve

{% alert type="note" title="Description" %}
Serve the OpenCode AI server locally.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano oc serve [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--port <port>` | Port to prefer, or "auto" to let the host pick (default: 4096; falls back when busy) |
| `-d, --detach` | Run the server in the background (detached mode) |
| `--password <password>` | Password for the OpenCode server (default: generated) |
