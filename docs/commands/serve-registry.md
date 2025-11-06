# serve-registry
>[!NOTE|label:Description]
> #### Serve the registry locally. This allows you to actually use your registry without deploying it to any remote host.

```term
$ xano serve-registry [options]
```
### Options

#### --root <path>
**Description:** Where did you put your registry? (Local path to the registry directory)
#### --listen <port>
**Description:** The port where you want your registry to be served locally. By default it is 5000.
#### --cors
**Description:** Do you want to enable CORS? By default false.

### serve-registry --help
```term
$ xano serve-registry --help
Usage: xano serve-registry [options]

Serve the registry locally. This allows you to actually use your registry
without deploying it to any remote host.

Options:
  --root <path>    Where did you put your registry? (Local path to the
                   registry directory)
  --listen <port>  The port where you want your registry to be served locally.
                   By default it is 5000.
  --cors           Do you want to enable CORS? By default false.
  -h, --help       display help for command
```