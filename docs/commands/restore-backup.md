# restore-backup
> #### Restore a backup to a Xano Workspace via Metadata API

```sh
xano restore-backup [options]
```
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### --source-backup <file>
**Description:** Path to the backup file to restore
#### --force
**Description:** Force restoration without confirmation

### restore-backup --help
```sh
Usage: xano restore-backup [options]

Restore a backup to a Xano Workspace via Metadata API

Options:
  --instance <instance>    The instance name. This is used to fetch the instance
                           configuration. The value provided at the setup
                           command.
  --workspace <workspace>  The workspace name. This is used to fetch the
                           workspace configuration. Same as on Xano interface.
  --source-backup <file>   Path to the backup file to restore
  --force                  Force restoration without confirmation
  -h, --help               display help for command
```