# registry

{% alert type="note" title="Description" %}
Registry related operations. Use this when you wish to add prebuilt components to your Xano instance.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano registry <command> [options]
```

## Subcommands

| Command | Description |
| --- | --- |
| `add` | Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance. |
| `scaffold` | Scaffold a Xano registry folder with a sample component. A registry has three parts: • index.json — the item list (each entry follows the registry item schema) • <type>/<name>.json — item descriptors (e.g. functions/hello-world.json) • components/<type>/<name>.xs — the actual source files that items point at An item's files[].path points into components/; an item may instead carry inline content. See the registry and registry-item schemas at https://calycode.com/schemas/registry/. |
