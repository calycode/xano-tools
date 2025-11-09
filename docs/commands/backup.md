# backup
>[!NOTE|label:Description]
> #### Backup and restoration operations.

```term
$ xano backup [options]
```

### backup --help
```term
$ xano backup --help
Backup and restoration operations.

Usage: xano backup [options] [command]

Options:
  -h, --help
    display help for command

Commands:
  export
    Backup Xano Workspace via Metadata API

  restore
    Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.

  help
    display help for command


Need help? Visit https://github.com/calycode/xano-tools
```