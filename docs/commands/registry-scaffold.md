# registry scaffold

{% alert type="note" title="Description" %}
Scaffold a Xano registry folder with a sample component. A registry has three parts:
  • index.json — the item list (each entry follows the registry item schema)
  • <type>/<name>.json — item descriptors (e.g. functions/hello-world.json)
  • components/<type>/<name>.xs — the actual source files that items point at
An item's files[].path points into components/; an item may instead carry inline content. See the registry and registry-item schemas at https://calycode.com/schemas/registry/.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano registry scaffold [options]
```

## Options

| Flag | Description |
| --- | --- |
| `--output <path>` | Local output path for the registry |
| `--instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
