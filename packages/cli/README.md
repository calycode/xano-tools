# @calycode/caly-xano-cli

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
npm install -g @calycode/caly-xano-cli
caly-xano --help
```

### NPX Usage

```bash
npx @calycode/caly-xano-cli --help
```

## Commands

### Instance Management

#### `setup`

Setup a new Xano instance configuration:

```bash
caly-xano setup
# Interactive prompts for instance name, URL, and API key

caly-xano setup --name production --url https://x123.xano.io --api-key your-key
# Non-interactive setup
```

#### `current-context`

Display the current active context:

```bash
caly-xano current-context
# Shows: stored json configuration
```

#### `switch-context`

Switch to a different instance, workspace, or branch:

```bash
caly-xano switch-context
# Interactive prompts

caly-xano switch-context --instance staging --workspace main --branch develop
# Non-interactive switch
```

### OpenAPI Operations

#### `generate-oas`

Generate improved OpenAPI specifications:

```bash
caly-xano generate-oas --group user-api
# Generate for specific API group

caly-xano generate-oas --all
# Generate for all API groups

caly-xano generate-oas --instance production --workspace main --branch master --group api
# Specify context
```

#### `serve-oas`

Serve OpenAPI specifications locally:

```bash
caly-xano serve-oas
# Starts local server at http://localhost:5999
```

#### `generate-code`

Generate client (and server) libraries from OpenAPI specs (see available [generators](https://openapi-generator.tech/docs/generators)):

```bash
caly-xano generate-code --generator typescript-fetch
caly-xano generate-code --generator python
```

### Backup & Restore

#### `export-backup`

Export workspace backup:

```bash
caly-xano export-backup
caly-xano export-backup --instance production --workspace main --branch master
```

#### `restore-backup`

Restore workspace from backup (cannot specify branch on restoration):

```bash
caly-xano restore-backup --file backup.tar.gz --target-workspace staging
```

### Registry Operations (**WIP**)

#### `registry-scaffold`

Create a new registry structure:

```bash
caly-xano registry-scaffold --output ./my-registry
```

#### `registry-add`

Install components to Xano from registry:

```bash
caly-xano registry-add --registry ./local-registry --item user-auth
caly-xano registry-add --registry https://registry.example.com --item payment-system
```

#### `serve-registry`

Serve local registry:

```bash
caly-xano serve-registry --registry ./my-registry --port 5000
```

### Development Tools

#### `generate-repo`

Generate browsable repository from workspace:

```bash
caly-xano generate-repo
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
caly-xano setup --name production --url https://x123.xano.io --api-key your-key

# Generate OpenAPI specs
caly-xano generate-oas --all

# Generate TypeScript client
caly-xano generate-code --generator typescript-fetch
# Serve documentation
caly-xano serve-oas
```

### Multi-Environment Setup

```bash
# Setup multiple instances
caly-xano setup --name production --url https://prod.xano.io --api-key prod-key
caly-xano setup --name staging --url https://staging.xano.io --api-key staging-key

# Switch between environments
caly-xano switch-context --instance staging
caly-xano generate-oas --group api

caly-xano switch-context --instance production
caly-xano export-backup
```

## Integration

### CI/CD Usage

```yaml
# GitHub Actions example
- name: Generate API Documentation
  run: |
     npx @calycode/caly-xano-cli generate-oas --all
     npx @calycode/caly-xano-cli generate-code --generator typescript-fetch
  env:
     XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
```

## License

MIT
