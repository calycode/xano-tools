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
| `--port <port>` | Port to prefer (default: 4096). Falls back to the next free port when busy; use `auto` to always let the host pick. |
| `--password <password>` | Password for the OpenCode server (default: generated). V2 servers read this as `OPENCODE_PASSWORD`. |
| `-d, --detach` | Run the server in the background (detached mode) |

The actual port and password are printed after startup. A busy `--port` is a preference, not a hard failure, so scripts should read the printed URL instead of assuming the requested port.
