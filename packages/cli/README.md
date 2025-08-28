# @mihalytoth20/xcc-cli

Command-line interface for the Xano Community CLI (XCC) providing terminal access to Xano development workflows.

## Overview

The CLI package provides:

-  Complete command-line interface with 14+ commands
-  Node.js filesystem-based configuration storage
-  Interactive prompts and progress logs
-  Integration with external tools (OpenAPI Generator, serve, etc.)

## Installation

### Global Installation

```bash
npm install -g @mihalytoth20/xcc-cli
xcc --help
```

### NPX Usage

```bash
npx @mihalytoth20/xcc-cli --help
```

## Commands

### Instance Management

#### `setup`

Setup a new Xano instance configuration:

```bash
xcc setup
# Interactive prompts for instance name, URL, and API key

xcc setup --name production --url https://x123.xano.io --api-key your-key
# Non-interactive setup
```

#### `current-context`

Display the current active context:

```bash
xcc current-context
# Shows: stored json configuration
```

#### `switch-context`

Switch to a different instance, workspace, or branch:

```bash
xcc switch-context
# Interactive prompts

xcc switch-context --instance staging --workspace main --branch develop
# Non-interactive switch
```

### OpenAPI Operations

#### `generate-oas`

Generate improved OpenAPI specifications:

```bash
xcc generate-oas --group user-api
# Generate for specific API group

xcc generate-oas --all
# Generate for all API groups

xcc generate-oas --instance production --workspace main --branch master --group api
# Specify context
```

#### `oas-serve`

Serve OpenAPI specifications locally:

```bash
xcc oas-serve
# Starts local server at http://localhost:5999
```

#### `generate-code`

Generate client (and server) libraries from OpenAPI specs (see available [generators](https://openapi-generator.tech/docs/generators)):

```bash
xcc generate-code --generator typescript-fetch
xcc generate-code --generator python --output
```

### Backup & Restore

#### `export-backup`

Export workspace backup:

```bash
xcc export-backup --output backup.tar.gz
xcc export-backup --instance production --workspace main --branch master
```

#### `restore-backup`

Restore workspace from backup (cannot specify branch on restoration):

```bash
xcc restore-backup --file backup.tar.gz --target-workspace staging
```

### Registry Operations

#### `registry-scaffold`

Create a new registry structure:

```bash
xcc registry-scaffold --output ./my-registry
```

#### `registry-add`

Install components to Xano from registry:

```bash
xcc registry-add --registry ./local-registry --item user-auth
xcc registry-add --registry https://registry.example.com --item payment-system
```

#### `registry-serve`

Serve local registry:

```bash
xcc registry-serve --registry ./my-registry --port 5000
```

### Development Tools

#### `generate-repo`

Generate browsable repository from workspace:

```bash
xcc generate-repo
```

#### `run-tests`

Run Xano workspace tests:

```bash
xcc run-tests --group api --verbose
```

#### `lint-xano`

Lint Xano workspace for best practices:

```bash
xcc lint-xano --fix --output lint-report.json
```

## Configuration

### Configuration Directory

XCC stores configuration in `~/.xano-community-cli/`:

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
xcc setup --name production --url https://x123.xano.io --api-key your-key

# Generate OpenAPI specs
xcc generate-oas --all

# Generate TypeScript client
xcc generate-code --generator typescript-fetch --output ./api-client

# Serve documentation
xcc oas-serve
```

### Multi-Environment Setup

```bash
# Setup multiple instances
xcc setup --name production --url https://prod.xano.io --api-key prod-key
xcc setup --name staging --url https://staging.xano.io --api-key staging-key

# Switch between environments
xcc switch-context --instance staging
xcc generate-oas --group api

xcc switch-context --instance production
xcc export-backup --output prod-backup.tar.gz
```

## Integration

### CI/CD Usage

```yaml
# GitHub Actions example
- name: Generate API Documentation
  run: |
     npx @mihalytoth20/xcc-cli generate-oas --all
     npx @mihalytoth20/xcc-cli generate-code --generator typescript-fetch --output ./api
  env:
     XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
```

## License

MIT
