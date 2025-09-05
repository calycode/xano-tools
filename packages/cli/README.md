# @calycode/cli

Command-line interface for the Caly-Xano CLI providing terminal access to Xano development workflows.

## Overview

The CLI package provides:

-  Command-line interface with 10+ commands
-  Node.js filesystem-based configuration storage
-  Interactive prompts and progress logs
-  Integration with external tools (OpenAPI Generator, serve, etc.)

## Installation

### Global Installation

```bash
npm install -g @calycode/cli
xano --help
```

### NPX Usage

```bash
npx @calycode/cli --help
```

## Commands

### Instance Management

#### `setup`

Setup a new Xano instance configuration:

```bash
xano setup
# Interactive prompts for instance name, URL, and API key

xano setup --name production --url https://x123.xano.io --api-key your-key
# Non-interactive setup
```

#### `current-context`

Display the current active context:

```bash
xano current-context
# Shows: stored json configuration
```

#### `switch-context`

Switch to a different instance, workspace, or branch:

```bash
xano switch-context
# Interactive prompts

xano switch-context --instance staging --workspace main --branch develop
# Non-interactive switch
```

### OpenAPI Operations

#### `generate-oas`

Generate improved OpenAPI specifications:

```bash
xano generate-oas --group user-api
# Generate for specific API group

xano generate-oas --all
# Generate for all API groups

xano generate-oas --instance production --workspace main --branch master --group api
# Specify context
```

#### `serve-oas`

Serve OpenAPI specifications locally:

```bash
xano serve-oas
# Starts local server at http://localhost:5999
```

#### `generate-code`

Generate client (and server) libraries from OpenAPI specs (see available [generators](https://openapi-generator.tech/docs/generators)):

```bash
xano generate-code --generator typescript-fetch
xano generate-code --generator python
```

### Backup & Restore

#### `export-backup`

Export workspace backup:

```bash
xano export-backup
xano export-backup --instance production --workspace main --branch master
```

#### `restore-backup`

Restore workspace from backup (cannot specify branch on restoration):

```bash
xano restore-backup --file backup.tar.gz --target-workspace staging
```

### Registry Operations (**WIP**)

#### `registry-scaffold`

Create a new registry structure:

```bash
xano registry-scaffold --output ./my-registry
```

#### `registry-add`

Install components to Xano from registry:

```bash
xano registry-add --registry ./local-registry --item user-auth
xano registry-add --registry https://registry.example.com --item payment-system
```

#### `serve-registry`

Serve local registry:

```bash
xano serve-registry --registry ./my-registry --port 5000
```

### Development Tools

#### `generate-repo`

Generate browsable repository from workspace:

```bash
xano generate-repo
```

## Configuration

### Configuration Directory

calystores configuration in `~/.xano-tools/`:

-  `config.json` - Global configuration
-  `instances/` - Instance-specific configurations
-  `tokens/` - API tokens (restricted permissions)

### Environment Variables

Override Metadata API tokens using environment variables:

```bash
export XANO_TOKEN_PRODUCTION=your-production-token
export XANO_TOKEN_STAGING=your-staging-token
```

### Context Inheritance

Commands inherit context from:

1. Command-line flags (highest priority)
2. Current context configuration
3. Default values (lowest priority)

## Examples

### Complete Workflow

```bash
# Setup instance
xano setup --name production --url https://x123.xano.io --api-key your-key

# Generate OpenAPI specs
xano generate-oas --all

# Generate TypeScript client
xano generate-code --generator typescript-fetch
# Serve documentation
xano serve-oas
```

### Multi-Environment Setup

```bash
# Setup multiple instances
xano setup --name production --url https://prod.xano.io --api-key prod-key
xano setup --name staging --url https://staging.xano.io --api-key staging-key

# Switch between environments
xano switch-context --instance staging
xano generate-oas --group api

xano switch-context --instance production
xano export-backup
```

## Integration

### CI/CD Usage

```yaml
# GitHub Actions example
- name: Generate API Documentation
  run: |
     npx @calycode/cli generate-oas --all
     npx @calycode/cli generate-code --generator typescript-fetch
  env:
     XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
```

## License

MIT
