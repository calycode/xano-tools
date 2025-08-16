```
Usage: xcc <command> [options]

 __  __                             ____   _       ___ 
 \ \/ /   __ _   _ __     ___      / ___| | |     |_ _|
  \  /   / _` | | '_ \   / _ \    | |     | |      | | 
  /  \  | (_| | | | | | | (_) |   | |___  | |___   | | 
 /_/\_\  \__,_| |_| |_|  \___/     \____| |_____| |___|
                                                       

Supercharge your Xano workflow: automate backups, docs, testing, and version control — no AI guesswork, just reliable, transparent dev tools.

Options:
  -v, --version   output the version number
  -h, --help      display help for command


Core Commands:
  setup               -h, --help
    Setup Xano instance configurations (interactively or via flags)

  switch-context      -h, --help
    Switch instance/workspace context


Code Generation:
  generate-oas        -h, --help
    Update and generate OpenAPI spec(s) for the current context.

  generate-code       -h, --help
    Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.

  generate-repo       -h, --help
    Process Xano workspace into repo structure

  generate-functions  -h, --help
    Analyze the functions available in the current (or provided) context.


Backup & Restore:
  export-backup       -h, --help
    Backup Xano Workspace via Metadata API

  restore-backup      -h, --help
    Restore a backup to a Xano Workspace via Metadata API


Testing & Linting:
  lint                -h, --help
    Lint backend logic, based on provided local file. Remote and dynamic sources are WIP...

  test-via-oas        -h, --help
    Run an API test suite via the OpenAPI spec. WIP...


Other:
  current-context     -h, --help
    

Need help? Visit https://github.com/MihalyToth20/xano-community-cli
```