# generate
>[!NOTE|label:Description]
> #### Transforamtive operations that allow you to view you Xano through a fresh set of eyes.

```term
$ xano generate [options]
```

### generate --help
```term
$ xano generate --help
Transforamtive operations that allow you to view you Xano through a fresh set of eyes.

Usage: xano generate [options] [command]

Options:
  -h, --help
    display help for command

Commands:
  codegen
    Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step. Supports **all** openapi tools generators + orval clients.

  docs
    Collect all descriptions, and internal documentation from a Xano instance and combine it into a nice documentation suite that can be hosted on a static hosting.

  spec
    Update and generate OpenAPI spec(s) for the current context, or all API groups simultaneously. This generates an opinionated API documentation powered by Scalar API Reference. + this command brings the Swagger docs to OAS 3.1+ version.

  repo
    Process Xano workspace into repo structure. We use the export-schema metadata API to offer the full details. However that is enriched with the Xanoscripts after Xano 2.0 release.

  xanoscript
    Process Xano workspace into repo structure. Supports table, function and apis as of know. Xano VSCode extension is the preferred solution over this command. Outputs of this process are also included in the default repo generation command.

  help
    display help for command


Need help? Visit https://github.com/calycode/xano-tools
```