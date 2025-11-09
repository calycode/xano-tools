# backup restore
>[!NOTE|label:Description]
> #### Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.

```term
$ xano backup restore [options]
```
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### -S, --source-backup <file>
**Description:** Local path to the backup file to restore.

### backup restore --help
```term
$ xano backup restore --help
Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.

Usage: xano backup restore [options]

Options:
  --instance <instance>
    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.

  --workspace <workspace>
    The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.

  -S, --source-backup <file>
    Local path to the backup file to restore.

  -h, --help
    display help for command


Need help? Visit https://github.com/calycode/xano-tools
```