# @calycode/cli

Command-line interface for the providing terminal access to Xano development workflows.

> !WARNING
> WIP and BETA. While we aim to make this CLI robust and reliable partner in everyday Xano work,
> several aspects might be fragile at this point. Use at own risk and we strongly suggest
> exploring the possibilities in sandboxed, or a free Xano instance to avoid production environment disruptions.

## Overview

The CLI package provides:

-  Command-line interface
-  Interactive prompts and progress logs
-  Automation ready commands to create reliable CI/CD-like experiences for Xano

## Installation

### Global Installation

```bash
npm install -g @calycode/cli
## pnpm install @calycode/cli -g
xano --help
```

### NPX Usage

```bash
npx @calycode/cli <command> <options>
## e.g.
## npx @calycode/cli generate-oas --help
```

## Docs

See more detailed documentation here: [@calycode/cli docs](https://calycode.com/cli/docs)

## Context Inheritance

Every command inherit context from:

1. Command-line flags (highest priority)
2. Current context configuration
3. Default values (lowest priority)

## Examples

### Setup instance, generate openapi spec and `ts` client code and serve the open api spec locally.

```bash
# Setup instance (interactive)
xano init

# Or non-interactive setup
xano init --name production --url https://x123.xano.io --token your-metadata-api-token

# Generate OpenAPI specs
xano generate spec --all

# Generate TypeScript client
xano generate codegen --generator typescript-fetch

# Serve documentation
xano serve spec
```

### Multi-Environment Setup

```bash
# Setup multiple instances
xano init --name production --url https://prod.my-instance.xano.io --token prod-token
xano init --name staging --url https://staging.my-instance.xano.io --token staging-token

xano generate spec --group api
# You will be prompted to select all missing context information via prompts.

xano backup export
```

## Integration

### CI/CD Usage

```yaml
# GitHub Actions example
- name: Generate API Documentation
  run: |
     npx -y @calycode/cli generate spec --all
     npx -y @calycode/cli generate codegen --generator typescript-fetch
  env:
     XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
```

### Using in GitHub Actions

You can use this CLI as a GitHub Action as well to automate your Xano workflows.

Here is an example job that checks out your repository and uses the local composite action (`./dist/actions/master-action.yml`), which in turn securely downloads and runs the CLI as npm package via the npx command.

```yaml
jobs:
   sync:
      runs-on: ubuntu-latest

      steps:
         - uses: actions/checkout@v4

         # 1. Setup Node.js and authenticate to the npm registry
         - uses: actions/setup-node@v4
           with:
              node-version: '20'
              registry-url: 'https://registry.npmjs.org'

         # 2. Use the Xano CLI Action from your repository
         # This composite action handles setup and (multiple or single) command execution by calling the published npm package.
         - name: Run Caly-Xano Commands
           uses: ./dist/actions/master-action.yml
           with:
              # Xano Instance name, used to identify the created configuration during command execution
              instance-name: 'production'
              instance-url: ${{ secrets.XANO_URL }}
              # Xano Metadata API token. Make sure to set it up as a secret
              api-token: ${{ secrets.XANO_API_TOKEN }}
              version: 'latest' # or a specific version like '0.1.1'
              # You can specify multiple commands in new lines and the action will execute them in order.
              # See the [documentation](/docs/README.md) for command docs.
              run: |
                 generate-oas --all
```

### Usage with git

In order to actually use the CLI with proper git support it is advised to also define the `--output` flag when running the commands.
This allows users to override the output and as a result keep a proper git history.
The flow is as follows:

1. Run the `xano init` command to configure your instance
2. Make sure you have git installed on your machine
3. Run `git init`
4. Run a command e.g. `xano generate repo --output lib` and then commit these changes to your desired branch
5. Create new branch (possibly name similarly as on your Xano) and run the `xano generate repo --output lib` again. After a new commit and push you now have a fully git-enabled comparison of your two Xano branches.

For a complete guide, see the [Git Workflow documentation](https://calycode.com/cli/docs/#/guides/git-workflow).

## License

MIT
