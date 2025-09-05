# serve-registry
> #### Serve the registry locally. This allows you to actually use your registry without deploying it.

```sh
xano serve-registry [options]
```
### Options

#### --root <path>
**Description:** Where did you put your registry?
#### --listen <port>
**Description:** The port where you want your registry to be served locally. By default it is 5000.
#### --cors
**Description:** Do you want to enable CORS? By default false.

### serve-registry --help
```sh
Usage: xano serve-registry [options]

Serve the registry locally. This allows you to actually use your registry without deploying
it.

Options:
  --root <path>    Where did you put your registry?
  --listen <port>  The port where you want your registry to be served locally. By default
                   it is 5000.
  --cors           Do you want to enable CORS? By default false.
  -h, --help       display help for command
```