# Registry Authoring Guide

This guide covers how to create, publish, and share reusable Xano components using the Xano Tools registry system.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Registry Structure](#registry-structure)
- [Creating Registry Items](#creating-registry-items)
- [Registry Item Schema](#registry-item-schema)
- [Including XanoScript Content](#including-xanoscript-content)
- [Dependency Management](#dependency-management)
- [Testing Your Registry](#testing-your-registry)
- [Publishing Your Registry](#publishing-your-registry)
- [Best Practices](#best-practices)

## Overview

The Xano Tools registry system enables you to:

- **Create reusable components** - Package functions, APIs, tables, and more
- **Share with your team** - Host registries for organization-wide use
- **Manage dependencies** - Components can depend on other components
- **Version your work** - Track changes with metadata timestamps
- **Overcome Snippet limitations** - Build complex, multi-file components that standard Xano Snippets can't handle

### Why Use Registries Over Snippets?

| Feature                   | Xano Snippets | Registry Components |
| ------------------------- | ------------- | ------------------- |
| Multi-file components     | ✅            | ✅                  |
| Dependency management     | ✅            | ✅                  |
| Team sharing              | Limited       | ✅ Full control     |
| Version tracking          | ❌            | ✅                  |
| Custom metadata           | ❌            | ✅                  |
| Programmatic installation | ❌            | ✅ CLI/API          |

## Quick Start

### 1. Scaffold a New Registry

```bash
# Create a new registry folder with sample components
xano registry scaffold --output ./my-registry
```

This creates:

```
my-registry/
├── registry.json           # Registry metadata
├── items/
│   └── sample-function/
│       ├── definition.json # Component definition
│       └── function.xs     # XanoScript content
└── README.md
```

### 2. Modify the Sample Component

Edit `items/sample-function/definition.json`:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "my-utils/string-helpers",
   "type": "registry:function",
   "title": "String Helper Functions",
   "description": "Utility functions for string manipulation",
   "author": "your-name <https://github.com/your-name>",
   "files": [
      {
         "path": "./function.xs",
         "type": "registry:function"
      }
   ]
}
```

### 3. Serve Your Registry Locally

```bash
xano serve registry --path ./my-registry
```

Registry available at: `http://localhost:5500/registry/definitions`

### 4. Test Installation

```bash
# In another terminal, install to your Xano instance
xano registry add my-utils/string-helpers \
  --registry http://localhost:5500/registry/definitions \
  --instance my-instance \
  --workspace main \
  --branch dev
```

## Registry Structure

A registry consists of:

### Registry Root (`registry.json`)

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry.json",
   "name": "my-company-registry",
   "description": "Reusable Xano components for My Company",
   "items": [
      "items/auth/jwt-verify/definition.json",
      "items/utils/string-helpers/definition.json",
      "items/integrations/stripe/definition.json"
   ]
}
```

### Component Folders

Organize components by category:

```
my-registry/
├── registry.json
├── items/
│   ├── auth/
│   │   ├── jwt-verify/
│   │   │   ├── definition.json
│   │   │   └── verify.xs
│   │   └── oauth-google/
│   │       ├── definition.json
│   │       ├── init.xs
│   │       └── callback.xs
│   ├── utils/
│   │   └── string-helpers/
│   │       ├── definition.json
│   │       └── helpers.xs
│   └── integrations/
│       └── stripe/
│           ├── definition.json
│           ├── customer.xs
│           └── webhook.xs
```

## Creating Registry Items

### Supported Component Types

| Type                  | Description           | Use Case                |
| --------------------- | --------------------- | ----------------------- |
| `registry:function`   | Custom function stack | Reusable business logic |
| `registry:addon`      | Addon/extension       | Utility functions       |
| `registry:apigroup`   | API endpoint group    | Complete API modules    |
| `registry:table`      | Database table        | Schema definitions      |
| `registry:middleware` | Request middleware    | Auth, logging, etc.     |
| `registry:task`       | Scheduled task        | Background jobs         |
| `registry:tool`       | AI tool               | LLM integrations        |
| `registry:agent`      | AI agent              | Autonomous workflows    |
| `registry:mcp`        | MCP server            | Model Context Protocol  |
| `registry:realtime`   | Realtime channel      | WebSocket channels      |
| `registry:query`      | API endpoint          | Single API endpoint     |
| `registry:snippet`    | Code snippet          | Reusable code blocks    |
| `registry:test`       | Test suite            | API tests               |
| `registry:file`       | Generic file          | Any file type           |
| Triggers              | Various trigger types | Event handlers          |

### Creating a Function Component

**1. Create the definition file (`definition.json`):**

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "utils/jwt-helper",
   "type": "registry:function",
   "title": "JWT Helper Functions",
   "description": "Functions for JWT token generation and validation",
   "author": "team <https://github.com/team>",
   "categories": ["auth", "security", "jwt"],
   "docs": "## JWT Helper\n\nThis component provides JWT utilities:\n\n- `jwt_generate` - Create signed tokens\n- `jwt_verify` - Validate tokens\n- `jwt_decode` - Decode without verification",
   "postInstallHint": "Remember to set XANO_JWT_SECRET in your environment variables!",
   "files": [
      {
         "path": "./jwt-helper.xs",
         "type": "registry:function",
         "meta": {
            "updated_at": "2024-01-15T10:30:00Z"
         }
      }
   ],
   "registryDependencies": ["utils/base64"],
   "meta": {
      "version": "1.0.0",
      "xano_version": "2.0+"
   }
}
```

**2. Create the XanoScript file (`jwt-helper.xs`):**

For XanoScript syntax and examples, refer to the [official Xano documentation](https://docs.xano.com/xanoscript/vs-code#usage).

### Creating an API Group Component

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "api/user-management",
   "type": "registry:apigroup",
   "title": "User Management API",
   "description": "Complete CRUD API for user management",
   "files": [
      {
         "path": "./user-api.xs",
         "type": "registry:apigroup"
      }
   ],
   "registryDependencies": ["tables/user", "utils/password-hash", "utils/email-validator"]
}
```

### Creating a Table Component

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "tables/user",
   "type": "registry:table",
   "title": "User Table",
   "description": "Standard user table with common fields",
   "files": [
      {
         "path": "./user-table.xs",
         "type": "registry:table"
      }
   ]
}
```

## Registry Item Schema

### Required Fields

| Field   | Type   | Description                                       |
| ------- | ------ | ------------------------------------------------- |
| `name`  | string | Unique identifier (can include `/` for hierarchy) |
| `type`  | string | Component type (see supported types above)        |
| `files` | array  | Files that make up this component                 |

### Optional Fields

| Field                  | Type   | Description                                      |
| ---------------------- | ------ | ------------------------------------------------ |
| `title`                | string | Human-readable display name                      |
| `description`          | string | Brief overview of the component                  |
| `docs`                 | string | Markdown documentation (rendered in registry UI) |
| `author`               | string | Author info: `name <url>`                        |
| `categories`           | array  | Tags for search and organization                 |
| `postInstallHint`      | string | Message shown after installation                 |
| `registryDependencies` | array  | Other components this depends on                 |
| `meta`                 | object | Custom metadata (version, dates, etc.)           |

### Files Array Entry

| Field          | Type   | Required             | Description                         |
| -------------- | ------ | -------------------- | ----------------------------------- |
| `path`         | string | One of path/content  | Relative file path                  |
| `content`      | string | One of path/content  | Inline XanoScript content           |
| `type`         | string | Yes                  | File type (same as component types) |
| `apiGroupName` | string | For `registry:query` | Target API group name               |
| `meta`         | object | No                   | File-specific metadata              |

### Inline Content Example

Instead of referencing a file, you can inline the content:

```json
{
   "name": "utils/simple-helper",
   "type": "registry:function",
   "files": [
      {
         "content": "// XanoScript content here\nfunction simple_helper() {\n  // ...\n}",
         "type": "registry:function"
      }
   ]
}
```

## Including XanoScript Content

### Option 1: File References

Store XanoScript in separate `.xs` files:

```json
{
   "files": [
      {
         "path": "./my-function.xs",
         "type": "registry:function"
      }
   ]
}
```

### Option 2: Inline Content

Include XanoScript directly in the definition:

```json
{
   "files": [
      {
         "content": "// Your XanoScript here",
         "type": "registry:function"
      }
   ]
}
```

### Writing XanoScript

For comprehensive XanoScript documentation, see:

- **Official Xano Docs:** [XanoScript VS Code Usage](https://docs.xano.com/xanoscript/vs-code#usage)
- **Xano VS Code Extension:** Recommended for XanoScript development

## Dependency Management

### How Dependencies Work

When you install a component with `xano registry add`:

1. The CLI reads the component's `registryDependencies` array
2. All dependencies are resolved recursively
3. Dependencies are installed in the correct order (dependencies first)
4. Already-installed components are skipped

### Declaring Dependencies

```json
{
   "name": "api/checkout",
   "type": "registry:apigroup",
   "registryDependencies": [
      "tables/order",
      "tables/product",
      "utils/stripe-client",
      "utils/email-sender"
   ]
}
```

### Dependency Resolution

```
api/checkout
├── tables/order
│   └── (no dependencies)
├── tables/product
│   └── (no dependencies)
├── utils/stripe-client
│   └── utils/http-client
└── utils/email-sender
    └── utils/template-engine
```

**Installation order:**

1. `tables/order`
2. `tables/product`
3. `utils/http-client`
4. `utils/stripe-client`
5. `utils/template-engine`
6. `utils/email-sender`
7. `api/checkout`

### Version Tracking

Components track versions via metadata:

```json
{
   "meta": {
      "version": "1.2.0",
      "updated_at": "2024-01-15T10:30:00Z",
      "changelog": "Added support for refresh tokens"
   }
}
```

> **Note:** The current registry system uses timestamps for version tracking. Full semantic versioning support is planned for future releases.

### Best Practices for Dependencies

1. **Keep dependencies minimal** - Only include what's truly required
2. **Avoid circular dependencies** - A cannot depend on B if B depends on A
3. **Use consistent naming** - Follow a clear naming convention
4. **Document requirements** - Use `postInstallHint` for manual steps

## Testing Your Registry

### Local Testing Workflow

```bash
# Terminal 1: Serve your registry
xano serve registry --path ./my-registry

# Terminal 2: Test installation
xano registry add my-component \
  --registry http://localhost:5500/registry/definitions \
  --instance test-instance \
  --workspace dev \
  --branch feature
```

### Validating Definitions

Ensure your JSON files match the schema:

```bash
# Use a JSON schema validator
npx ajv validate -s https://calycode.com/schemas/registry/registry-item.json -d ./definition.json
```

## Publishing Your Registry

### Option 1: Static File Hosting

Host your registry files on any static server:

```bash
# Build your registry
# Copy to web server
scp -r ./my-registry/* user@server:/var/www/registry/

# Access at: https://registry.example.com/definitions
```

### Option 2: GitHub Pages

```yaml
# .github/workflows/deploy-registry.yml
name: Deploy Registry
on:
   push:
      branches: [main]
      paths: ['registry/**']

jobs:
   deploy:
      runs-on: ubuntu-latest
      steps:
         - uses: actions/checkout@v4
         - uses: peaceiris/actions-gh-pages@v3
           with:
              github_token: ${{ secrets.GITHUB_TOKEN }}
              publish_dir: ./registry
```

### Option 3: NPM Package

Package your registry for npm distribution:

```json
// package.json
{
   "name": "@your-org/xano-registry",
   "files": ["registry/**"],
   "scripts": {
      "serve": "xano serve registry --path ./registry"
   }
}
```

### Team Usage

```bash
# Team members install from your registry
xano registry add auth/jwt-verify \
  --registry https://registry.your-company.com/definitions
```

### Team Usage with NPM Scoped Registry

For organizations using private npm registries, you can leverage npm's scoped package system for controlled access:

```json
// package.json
{
   "name": "@acme-corp/xano-components",
   "version": "1.0.0",
   "description": "Internal Xano components for ACME Corp",
   "private": true,
   "files": ["registry/**"],
   "scripts": {
      "serve": "xano serve registry --path ./registry",
      "validate": "npx ajv validate -s https://calycode.com/schemas/registry/registry.json -d ./registry/registry.json"
   },
   "publishConfig": {
      "registry": "https://npm.pkg.github.com"
   }
}
```

**Team Setup:**

```bash
# 1. Configure npm to use your organization's private registry for the scope
npm config set @acme-corp:registry https://npm.pkg.github.com

# 2. Authenticate with your private registry
npm login --registry=https://npm.pkg.github.com --scope=@acme-corp

# 3. Install the shared registry package
npm install @acme-corp/xano-components

# 4. Serve the registry locally from node_modules
xano serve registry --path ./node_modules/@acme-corp/xano-components/registry

# 5. Install components from the local registry
xano registry add auth/sso-integration \
  --registry http://localhost:5500/registry/definitions \
  --instance production \
  --workspace main
```

**Benefits of NPM Scoped Registries:**

| Feature              | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| Access Control       | Leverage existing npm org permissions and team roles           |
| Version Management   | Use npm's semver for registry versioning                       |
| CI/CD Integration    | Easily integrate with existing npm-based pipelines             |
| Audit Trail          | Track who published what and when via npm audit logs           |
| Offline Development  | Cache packages locally for air-gapped environments             |
| Multi-Registry       | Teams can combine public and private registries per scope      |

**Example: Multi-Team Registry Structure**

```
@acme-corp/xano-components/
├── package.json
├── registry/
│   ├── registry.json
│   └── items/
│       ├── core/              # Shared by all teams
│       │   ├── auth/
│       │   └── logging/
│       ├── team-payments/     # Payments team components
│       │   ├── stripe/
│       │   └── invoicing/
│       └── team-crm/          # CRM team components
│           ├── contacts/
│           └── pipelines/
```

```json
// registry/registry.json
{
   "$schema": "https://calycode.com/schemas/registry/registry.json",
   "name": "acme-corp-registry",
   "description": "ACME Corp internal Xano components",
   "items": [
      "items/core/auth/jwt-sso/definition.json",
      "items/core/logging/audit-log/definition.json",
      "items/team-payments/stripe/checkout/definition.json",
      "items/team-payments/invoicing/generator/definition.json",
      "items/team-crm/contacts/sync/definition.json",
      "items/team-crm/pipelines/automation/definition.json"
   ]
}
```

**Publishing Updates:**

```bash
# Bump version and publish to private registry
npm version patch
npm publish

# Team members update to latest
npm update @acme-corp/xano-components
```

## Best Practices

### Naming Conventions

```
category/component-name

Examples:
- auth/jwt-verify
- utils/string-helpers
- integrations/stripe-webhook
- tables/user
- api/user-management
```

### Documentation

Always include:

1. **Description** - What the component does
2. **Docs** - Detailed usage instructions
3. **postInstallHint** - Required post-install steps
4. **Categories** - For discoverability

### Component Design

1. **Single responsibility** - Each component should do one thing well
2. **Minimal dependencies** - Reduce coupling
3. **Clear interfaces** - Document inputs/outputs
4. **Idempotent installation** - Safe to install multiple times

### Security

1. **No secrets in code** - Use environment variables
2. **Document required secrets** - In postInstallHint
3. **Review before sharing** - Audit code for sensitive data

## Resources

- [Registry Schema](https://calycode.com/schemas/registry/registry.json)
- [Registry Item Schema](https://calycode.com/schemas/registry/registry-item.json)
- [XanoScript Documentation](https://docs.xano.com/xanoscript/vs-code#usage)
- [CLI Documentation](/docs/xano.md)
- [Discord Community](https://links.calycode.com/discord)
