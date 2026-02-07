# XanoScript in Xano Tools

This guide explains how Xano Tools works with XanoScript and where to find comprehensive XanoScript documentation.

## Table of Contents

- [Overview](#overview)
- [Official XanoScript Documentation](#official-xanoscript-documentation)
- [How Xano Tools Uses XanoScript](#how-xano-tools-uses-xanoscript)
- [Supported Entity Types](#supported-entity-types)
- [Extracting XanoScript](#extracting-xanoscript)
- [Using XanoScript in Registries](#using-xanoscript-in-registries)
- [Development Workflow](#development-workflow)
- [Resources](#resources)

## Overview

XanoScript (`.xs` files) is Xano's domain-specific language for defining backend logic, including functions, APIs, database tables, and more. It provides a text-based representation of Xano's visual function stacks.

**Important:** Xano Tools does not define the XanoScript language—it processes and works with XanoScript as defined by Xano. For comprehensive syntax documentation, refer to the official Xano resources below.

## Official XanoScript Documentation

For complete XanoScript syntax, features, and usage:

> **Official Xano Documentation**
> https://docs.xano.com/xanoscript/vs-code#usage

The official documentation covers:

- XanoScript syntax and grammar
- Function stack definitions
- Variable declarations
- Control flow and conditionals
- Database operations
- Input/output handling
- Built-in functions and operators

## How Xano Tools Uses XanoScript

Xano Tools integrates with XanoScript in several ways:

### 1. Extraction (`generate xanoscript`)

Extract XanoScript from your Xano workspace for version control:

```bash
# Extract XanoScript from all supported entities
xano generate xanoscript \
  --instance production \
  --workspace main \
  --branch live
```

This creates `.xs` files representing your Xano functions, APIs, and other entities.

### 2. Repository Generation (`generate repo`)

Include XanoScript in your repository structure:

```bash
# Generate complete repo with XanoScript
xano generate repo \
  --instance production \
  --workspace main \
  --branch live
```

### 3. Registry Components

Include XanoScript in reusable registry components:

```json
{
   "name": "utils/jwt-helper",
   "type": "registry:function",
   "files": [
      {
         "path": "./jwt-helper.xs",
         "type": "registry:function"
      }
   ]
}
```

### 4. Component Installation (`registry add`)

Deploy XanoScript-based components to your Xano instance:

```bash
xano registry add utils/jwt-helper \
  --registry https://registry.example.com/definitions
```

## Supported Entity Types

Xano Tools can process the following XanoScript entity types:

| Entity Type                | Description                 | CLI Support          |
| -------------------------- | --------------------------- | -------------------- |
| `addon`                    | Reusable utility functions  | ✅ Extract, Registry |
| `function`                 | Custom function stacks      | ✅ Extract, Registry |
| `apigroup`                 | API endpoint groups         | ✅ Extract, Registry |
| `table`                    | Database table definitions  | ✅ Extract, Registry |
| `task`                     | Scheduled tasks             | ✅ Extract, Registry |
| `middleware`               | Request/response middleware | ✅ Extract, Registry |
| `trigger`                  | Workspace-level triggers    | ✅ Extract, Registry |
| `table/trigger`            | Table-level triggers        | ✅ Extract, Registry |
| `agent`                    | AI agents                   | ✅ Extract, Registry |
| `agent/trigger`            | Agent triggers              | ✅ Extract, Registry |
| `tool`                     | AI tools for agents         | ✅ Extract, Registry |
| `mcp_server`               | MCP server definitions      | ✅ Extract, Registry |
| `mcp_server/trigger`       | MCP server triggers         | ✅ Extract, Registry |
| `realtime/channel`         | Realtime WebSocket channels | ✅ Extract, Registry |
| `realtime/channel/trigger` | Channel triggers            | ✅ Extract, Registry |
| `workflow_test`            | Workflow test definitions   | ✅ Extract           |

## Extracting XanoScript

### Basic Extraction

```bash
# Extract from current context
xano generate xanoscript

# Extract from specific instance/workspace/branch
xano generate xanoscript \
  --instance my-instance \
  --workspace my-workspace \
  --branch main
```

### Output Structure

Extracted files are organized by entity type:

```
{output-dir}/
├── addons/
│   ├── utility-addon.xs
│   └── helper-addon.xs
├── functions/
│   ├── auth/
│   │   ├── login.xs
│   │   └── verify-token.xs
│   └── utils/
│       └── format-date.xs
├── apis/
│   ├── user-api/
│   │   ├── _group.xs
│   │   ├── get-users.xs
│   │   └── create-user.xs
│   └── product-api/
│       └── ...
├── tables/
│   ├── user.xs
│   └── product.xs
├── tasks/
│   └── daily-cleanup.xs
└── ...
```

### Including in Repo Generation

XanoScript is automatically included when generating a repository:

```bash
xano generate repo --instance production --workspace main --branch live
```

## Using XanoScript in Registries

### File Reference

Reference XanoScript files in your registry item definitions:

```json
{
   "name": "auth/jwt-verify",
   "type": "registry:function",
   "files": [
      {
         "path": "./jwt-verify.xs",
         "type": "registry:function"
      }
   ]
}
```

### Inline Content

Or include XanoScript content directly:

```json
{
   "name": "utils/simple-helper",
   "type": "registry:function",
   "files": [
      {
         "content": "// XanoScript content here\n...",
         "type": "registry:function"
      }
   ]
}
```

### Multiple Files

Components can include multiple XanoScript files:

```json
{
   "name": "auth/complete-auth",
   "type": "registry:function",
   "files": [
      {
         "path": "./login.xs",
         "type": "registry:function"
      },
      {
         "path": "./register.xs",
         "type": "registry:function"
      },
      {
         "path": "./verify.xs",
         "type": "registry:function"
      }
   ]
}
```

## Development Workflow

### Recommended Setup

1. **Use the Xano VS Code Extension** - Best experience for XanoScript development
2. **Extract existing code** - Use `xano generate xanoscript` to get your current code
3. **Develop in VS Code** - Edit XanoScript with syntax highlighting
4. **Package in registries** - Create reusable components
5. **Deploy via CLI** - Use `xano registry add` to install

### VS Code Extension

The official Xano VS Code extension provides:

- Syntax highlighting for `.xs` files
- IntelliSense and autocompletion
- Direct sync with your Xano instance
- Error checking and validation

> **Note:** The Xano VS Code extension is the preferred solution for XanoScript development. The CLI's `generate xanoscript` command is useful for extraction and version control, but the VS Code extension offers a more complete development experience.

### Version Control

XanoScript files are text-based and work well with Git:

```bash
# Generate XanoScript for version control
xano generate xanoscript --instance prod --workspace main --branch live

# Commit changes
git add .
git commit -m "Extract latest XanoScript from production"
```

## Resources

### Official Xano Documentation

- **XanoScript Reference:** https://docs.xano.com/xanoscript/vs-code#usage
- **Xano Documentation:** https://docs.xano.com

### Xano Tools Documentation

- [Generate XanoScript Command](/docs/commands/generate-xanoscript.md)
- [Generate Repo Command](/docs/commands/generate-repo.md)
- [Registry Authoring Guide](/docs/guides/registry-authoring.md)
- [Registry Add Command](/docs/commands/registry-add.md)

### Community

- [Xano Community](https://community.xano.com)
- [Calycode Discord](https://links.calycode.com/discord)
- [GitHub Repository](https://github.com/calycode/xano-tools)
