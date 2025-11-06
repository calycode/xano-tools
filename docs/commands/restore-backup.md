# restore-backup
>[!NOTE|label:Description]
> #### Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.

```term
$ xano restore-backup [options]
```
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### -S, --source-backup <file>
**Description:** Local path to the backup file to restore.
#### --force
**Description:** Force restoration without confirmation, not advised to be specified, useful when ran from a CI/CD pipeline and consequences are acknowledged.

### restore-backup --help
```term
$ xano restore-backup --help
Usage: xano restore-backup [options]

Restore a backup to a Xano Workspace via Metadata API. DANGER! This action
will override all business logic and restore the original v1 branch. Data will
be also restored from the backup file.

Options:
  --instance <instance>       The instance name. This is used to fetch the
                              instance configuration. The value provided at
                              the setup command.
  --workspace <workspace>     The workspace name. This is used to fetch the
                              workspace configuration. Same as on Xano
                              interface.
  -S, --source-backup <file>  Local path to the backup file to restore.
  --force                     Force restoration without confirmation, not
                              advised to be specified, useful when ran from a
                              CI/CD pipeline and consequences are
                              acknowledged.
  -h, --help                  display help for command
```