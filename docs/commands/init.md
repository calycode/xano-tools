# init
>[!NOTE|label:Description]
> #### Initialize the CLI with Xano instance configurations (interactively or via flags), this enables the CLI to know about context, APIs and in general this is required for any command to succeed.

```term
$ xano init [options]
```
### Options

#### --name <name>
**Description:** Instance name (for non-interactive setup)
#### --url <url>
**Description:** Instance base URL (for non-interactive setup)
#### --token <token>
**Description:** Metadata API token (for non-interactive setup)
#### --no-set-current
**Description:** Flag to not set this instance as the current context, by default it is set.

### init --help
```term
$ xano init --help
Usage: xano init [options]

Initialize the CLI with Xano instance configurations (interactively or via
flags), this enables the CLI to know about context, APIs and in general
this is required for any command to succeed.

Options:
  --name <name>     Instance name (for non-interactive setup)
  --url <url>       Instance base URL (for non-interactive setup)
  --token <token>   Metadata API token (for non-interactive setup)
  --no-set-current  Flag to not set this instance as the current context,
                    by default it is set.
  -h, --help        display help for command
```