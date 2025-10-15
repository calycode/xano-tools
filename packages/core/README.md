# @calycode/core

Core functionality for the @calycode/cli providing programmatic access to Xano development workflows.
The implementation is meant to be platform agnostic, so to write a consumer of this core featureset
starts with writing a storage implementation.

## Installation

```bash
npm install @calycode/core

# or pnpm
# pnpm add @calycode/core
```

## Overview

The core package provides the main `Caly` class that orchestrates all Xano operations including:
- Instance setup and configuration management
- OpenAPI specification generation
- Workspace backup and restore operations
- Context loading and validation
- Exposes events during execution to allow for rich feedback on consumer side (_WIP_)

## Key Features

### Instance Management
- Setup new Xano instances with authentication
- Validate configuration contexts

### OpenAPI Generation
- Generate comprehensive OpenAPI specifications from Xano APIs
- Support for multiple API groups

### Backup & Restore
- Export complete workspace backups
- Restore workspaces from backup data

### Repository Generation
- Convert Xano workspace data into browsable file structures
- Organize functions, tables, and queries into logical hierarchies

## Usage

### Basic Setup

```typescript
import { Caly } from '@calycode/caly-core';
// Implement your own storage interface based on the platform you're using
import { nodeConfigStorage } from '@calycode/cli';

const calyInstance = new Caly(nodeConfigStorage);

// Setup a new Xano instance
await calyInstance.setupInstance({
  name: 'production',
  url: 'https://x123.xano.io',
  apiKey: 'your-metadata-api-key'
});
```

> [!NOTE]
> For exact core feature implementation see the code.

### Event Handling

In the consumers of the 'core' you can listen for events as per the example and as a result give more detailed progress feedback to the user.

```typescript
// Listen for events
calyInstance.on('setup-progress', (data) => {
  console.log('Setup progress:', data.message);
});

calyInstance.on('oas-generated', (data) => {
  console.log('OAS generated for group:', data.group);
});
```

### Storage Abstraction

Caly uses a `ConfigStorage` interface to abstract filesystem operations, allowing it to work in different environments (Node.js, browser, etc.). This means that you **need** to implement your own storage implementation to use the Caly class. e.g. the @calycode/cli implements a Node.js based storage implementation.


## License

MIT
