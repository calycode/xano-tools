# Scaffolding New Xano Components

This guide explains how to create new Xano components using Xano Tools, from initial scaffolding to deployment.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Scaffolding a Registry](#scaffolding-a-registry)
- [Creating Component Definitions](#creating-component-definitions)
- [Writing XanoScript](#writing-xanoscript)
- [Component Templates](#component-templates)
- [Deployment Workflow](#deployment-workflow)
- [Best Practices](#best-practices)

## Overview

Xano Tools provides a component-based approach to creating new Xano functions, APIs, and other entities. Rather than generating boilerplate code directly, you:

1. **Scaffold a registry** - Create a component structure
2. **Define components** - Describe your component in JSON
3. **Write XanoScript** - Implement your business logic
4. **Deploy via CLI** - Install components to your Xano instance

This approach enables:

- **Reusability** - Create once, deploy many times
- **Team sharing** - Share components across projects
- **Version control** - Track changes in Git
- **Dependency management** - Handle complex component relationships

## Quick Start

### Create a New Function Component

```bash
# 1. Scaffold a new registry
xano registry scaffold --output ./my-components

# 2. Navigate to the scaffolded registry
cd my-components

# 3. Serve the registry locally
xano serve registry --path .

# 4. In another terminal, install to your Xano instance
xano registry add sample-function \
  --registry http://localhost:5500/registry/definitions \
  --instance my-instance \
  --workspace main \
  --branch dev
```

## Scaffolding a Registry

### The Scaffold Command

```bash
xano registry scaffold --output <path> [--instance <name>]
```

**Options:**

| Option              | Description                              |
| ------------------- | ---------------------------------------- |
| `--output <path>`   | Where to create the registry folder      |
| `--instance <name>` | Optional: associate with a Xano instance |

### Generated Structure

```
my-components/
├── registry.json           # Registry configuration
├── items/
│   └── sample-function/
│       ├── definition.json # Component metadata
│       └── function.xs     # XanoScript code
└── README.md               # Documentation
```

### Registry Configuration

The `registry.json` file defines your registry:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry.json",
   "name": "my-components",
   "description": "My reusable Xano components",
   "items": ["items/sample-function/definition.json"]
}
```

## Creating Component Definitions

### Function Component

Create `items/my-function/definition.json`:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "my-function",
   "type": "registry:function",
   "title": "My Custom Function",
   "description": "A custom function that does something useful",
   "author": "Your Name <https://github.com/yourname>",
   "categories": ["utility"],
   "files": [
      {
         "path": "./function.xs",
         "type": "registry:function"
      }
   ],
   "postInstallHint": "Call this function from your API endpoints!"
}
```

### API Group Component

Create `items/user-api/definition.json`:

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
   "registryDependencies": ["tables/user"]
}
```

### Table Component

Create `items/tables/user/definition.json`:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "tables/user",
   "type": "registry:table",
   "title": "User Table",
   "description": "Standard user table schema",
   "files": [
      {
         "path": "./user.xs",
         "type": "registry:table"
      }
   ]
}
```

### Addon Component

Create `items/addons/string-utils/definition.json`:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "addons/string-utils",
   "type": "registry:addon",
   "title": "String Utilities Addon",
   "description": "Common string manipulation utilities",
   "files": [
      {
         "path": "./string-utils.xs",
         "type": "registry:addon"
      }
   ]
}
```

### Middleware Component

Create `items/middleware/auth/definition.json`:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "middleware/jwt-auth",
   "type": "registry:middleware",
   "title": "JWT Authentication Middleware",
   "description": "Validates JWT tokens on incoming requests",
   "files": [
      {
         "path": "./jwt-auth.xs",
         "type": "registry:middleware"
      }
   ],
   "postInstallHint": "Set XANO_JWT_SECRET environment variable"
}
```

### Task Component

Create `items/tasks/cleanup/definition.json`:

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry-item.json",
   "name": "tasks/daily-cleanup",
   "type": "registry:task",
   "title": "Daily Cleanup Task",
   "description": "Scheduled task for cleaning up old data",
   "files": [
      {
         "path": "./cleanup.xs",
         "type": "registry:task"
      }
   ]
}
```

## Writing XanoScript

### Getting Started

For XanoScript syntax and examples, refer to:

> **Official Xano Documentation**
> https://docs.xano.com/xanoscript/vs-code#usage

### Recommended Development Setup

1. **Install Xano VS Code Extension** - Best development experience
2. **Extract existing code** - Learn from your existing Xano functions:
   ```bash
   xano generate xanoscript --instance prod --workspace main --branch live
   ```
3. **Study extracted files** - Understand XanoScript patterns
4. **Create new components** - Apply patterns to new components

### Example Workflow

```bash
# Extract XanoScript from existing project for reference
xano generate xanoscript \
  --instance my-instance \
  --workspace main \
  --branch live

# Review extracted files
ls -la xanoscript/functions/

# Copy and modify for your new component
cp xanoscript/functions/example.xs my-components/items/my-function/function.xs
```

## Component Templates

### Organizing Multiple Components

```
my-registry/
├── registry.json
├── items/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── definition.json
│   │   │   └── login.xs
│   │   ├── register/
│   │   │   ├── definition.json
│   │   │   └── register.xs
│   │   └── middleware/
│   │       ├── definition.json
│   │       └── auth-middleware.xs
│   ├── utils/
│   │   ├── string-helpers/
│   │   │   ├── definition.json
│   │   │   └── helpers.xs
│   │   └── date-utils/
│   │       ├── definition.json
│   │       └── date.xs
│   └── tables/
│       ├── user/
│       │   ├── definition.json
│       │   └── user.xs
│       └── session/
│           ├── definition.json
│           └── session.xs
```

### Update Registry Configuration

```json
{
   "$schema": "https://calycode.com/schemas/registry/registry.json",
   "name": "my-complete-registry",
   "description": "Complete set of reusable components",
   "items": [
      "items/auth/login/definition.json",
      "items/auth/register/definition.json",
      "items/auth/middleware/definition.json",
      "items/utils/string-helpers/definition.json",
      "items/utils/date-utils/definition.json",
      "items/tables/user/definition.json",
      "items/tables/session/definition.json"
   ]
}
```

## Deployment Workflow

### Local Development

```bash
# Terminal 1: Serve registry
xano serve registry --path ./my-registry

# Terminal 2: Install components
xano registry add auth/login \
  --registry http://localhost:5500/registry/definitions \
  --instance dev-instance \
  --workspace sandbox \
  --branch dev
```

### Production Deployment

```bash
# Install from hosted registry
xano registry add auth/login utils/string-helpers \
  --registry https://registry.mycompany.com/definitions \
  --instance production \
  --workspace main \
  --branch live
```

### Install Multiple Components

```bash
# Space-separated list
xano registry add tables/user tables/session auth/login auth/register \
  --registry http://localhost:5500/registry/definitions
```

Dependencies are automatically resolved and installed in the correct order.

## Best Practices

### 1. Use Consistent Naming

```
category/component-name

Good:
- auth/jwt-verify
- utils/string-helpers
- tables/user
- api/user-management

Bad:
- myFunction
- StringHelpers
- USER_TABLE
```

### 2. Document Everything

```json
{
   "name": "auth/jwt-verify",
   "title": "JWT Token Verification",
   "description": "Verifies and decodes JWT tokens with RS256 or HS256 algorithms",
   "docs": "## Usage\n\nCall `jwt_verify(token)` with your token...",
   "postInstallHint": "Set XANO_JWT_SECRET or configure your RS256 public key"
}
```

### 3. Declare Dependencies Properly

```json
{
   "name": "api/checkout",
   "registryDependencies": ["tables/order", "tables/product", "utils/stripe-client"]
}
```

### 4. Use Metadata for Versioning

```json
{
   "meta": {
      "version": "1.2.0",
      "updated_at": "2024-01-15T10:30:00Z",
      "xano_version": "2.0+",
      "changelog": "Added support for refresh tokens"
   }
}
```

### 5. Test Before Sharing

```bash
# Always test in a development branch first
xano registry add my-component \
  --registry http://localhost:5500/registry/definitions \
  --instance test \
  --workspace dev \
  --branch feature-test
```

## Next Steps

- **[Registry Authoring Guide](/docs/guides/registry-authoring.md)** - Complete registry documentation
- **[XanoScript Guide](/docs/guides/xanoscript.md)** - Working with XanoScript
- **[Patterns & Best Practices](/docs/guides/patterns.md)** - Common patterns for Xano development
- **[Registry Add Command](/docs/commands/registry-add.md)** - CLI reference

## Resources

- **XanoScript Docs:** https://docs.xano.com/xanoscript/vs-code#usage
- **Registry Schema:** https://calycode.com/schemas/registry/registry.json
- **Registry Item Schema:** https://calycode.com/schemas/registry/registry-item.json
- **Discord Community:** https://links.calycode.com/discord
