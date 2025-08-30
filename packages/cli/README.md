# @calycode/cli

Command-line interface for the Caly CLI providing terminal access to Xano development workflows.

## Overview

The CLI package provides:

-  Complete command-line interface with 14+ commands
-  Node.js filesystem-based configuration storage
-  Interactive prompts and progress logs
-  Integration with external tools (OpenAPI Generator, serve, etc.)

## Installation

### Global Installation

```bash
npm install -g @calycode/cli
caly--help
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
calysetup
# Interactive prompts for instance name, URL, and API key

calysetup --name production --url https://x123.xano.io --api-key your-key
# Non-interactive setup
```

#### `current-context`

Display the current active context:

```bash
calycurrent-context
# Shows: stored json configuration
```

#### `switch-context`

Switch to a different instance, workspace, or branch:

```bash
calyswitch-context
# Interactive prompts

calyswitch-context --instance staging --workspace main --branch develop
# Non-interactive switch
```

### OpenAPI Operations

#### `generate-oas`

Generate improved OpenAPI specifications:

```bash
calygenerate-oas --group user-api
# Generate for specific API group

calygenerate-oas --all
# Generate for all API groups

calygenerate-oas --instance production --workspace main --branch master --group api
# Specify context
```

#### `oas-serve`

Serve OpenAPI specifications locally:

```bash
calyoas-serve
# Starts local server at http://localhost:5999
```

#### `generate-code`

Generate client (and server) libraries from OpenAPI specs (see available [generators](https://openapi-generator.tech/docs/generators)):

```bash
calygenerate-code --generator typescript-fetch
calygenerate-code --generator python --output
```

### Backup & Restore

#### `export-backup`

Export workspace backup:

```bash
calyexport-backup --output backup.tar.gz
calyexport-backup --instance production --workspace main --branch master
```

#### `restore-backup`

Restore workspace from backup (cannot specify branch on restoration):

```bash
calyrestore-backup --file backup.tar.gz --target-workspace staging
```

### Registry Operations

#### `registry-scaffold`

Create a new registry structure:

```bash
calyregistry-scaffold --output ./my-registry
```

#### `registry-add`

Install components to Xano from registry:

```bash
calyregistry-add --registry ./local-registry --item user-auth
calyregistry-add --registry https://registry.example.com --item payment-system
```

#### `registry-serve`

Serve local registry:

```bash
calyregistry-serve --registry ./my-registry --port 5000
```

### Development Tools

#### `generate-repo`

Generate browsable repository from workspace:

```bash
calygenerate-repo
```

#### `run-tests`

Run Xano workspace tests:

```bash
calyrun-tests --group api --verbose
```

#### `lint-xano`

Lint Xano workspace for best practices:

```bash
calylint-xano --fix --output lint-report.json
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
calysetup --name production --url https://x123.xano.io --api-key your-key

# Generate OpenAPI specs
calygenerate-oas --all

# Generate TypeScript client
calygenerate-code --generator typescript-fetch --output ./api-client

# Serve documentation
calyoas-serve
```

### Multi-Environment Setup

```bash
# Setup multiple instances
calysetup --name production --url https://prod.xano.io --api-key prod-key
calysetup --name staging --url https://staging.xano.io --api-key staging-key

# Switch between environments
calyswitch-context --instance staging
calygenerate-oas --group api

calyswitch-context --instance production
calyexport-backup --output prod-backup.tar.gz
```

## Integration

### CI/CD Usage

```yaml
# GitHub Actions example
- name: Generate API Documentation
  run: |
     npx @calycode/cli generate-oas --all
     npx @calycode/cli generate-code --generator typescript-fetch --output ./api
  env:
     XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
```

## License

MIT
