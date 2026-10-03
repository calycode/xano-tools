# serve registry

{% alert type="note" title="Description" %}
Serve the registry locally. This allows you to actually use your registry without deploying it to any remote host.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano serve registry [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--root <path>` | Where did you put your registry? (Local path to the registry directory) |
| `--listen <port>` | The port where you want your registry to be served locally. By default it is 5000. |
| `--cors` | Do you want to enable CORS? By default false. |
