# @calycode/caly-core

Core functionality for the Caly CLI providing programmatic access to Xano development workflows.

## Overview

The core package provides the main `Caly` class that orchestrates all Xano operations including:
- Instance setup and configuration management
- OpenAPI specification generation
- Workspace backup and restore operations
- Context switching and validation
- Exposes events during execution to allow for rich feedback on consumer side

## Key Features

### Instance Management
- Setup new Xano instances with authentication
- Switch between different instances, workspaces, and branches
- Validate configuration contexts

### OpenAPI Generation
- Generate comprehensive OpenAPI specifications from Xano APIs
- Support for multiple API groups
- Enhanced schemas with examples and metadata

### Backup & Restore
- Export complete workspace backups
- Restore workspaces from backup data
- Support for cross-instance migrations

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

### Context Management

```typescript
// Switch to a different context
await calyInstance.switchContext({
  instance: 'staging',
  workspace: 'main',
  branch: 'develop'
});

// Load and validate context
const context = await calyInstance.loadAndValidateContext({
  instance: 'production',
  workspace: 'main',
  branch: 'master'
});
```

### OpenAPI Generation

```typescript
// Generate OAS for specific API groups
const results = await calyInstance.updateOpenapiSpec(
  'production',
  'main',
  'master',
  ['user-api', 'admin-api']
);

// Generate OAS for all API groups
const allResults = await calyInstance.updateOpenapiSpec(
  'production',
  'main',
  'master',
  ['all']
);
```

### Backup Operations

```typescript
// Export workspace backup
const backupData = await calyInstance.exportBackup({
  instance: 'production',
  workspace: 'main',
  branch: 'master'
});

// Restore from backup (suggested to pass on the backupFile as a stream as backups can be big)
const formData = new FormData();
formData.append('backup', backupFile);

await calyInstance.restoreBackup({
  instance: 'staging',
  workspace: 'main',
  formData: formData
});
```

### Event Handling

```typescript
// Listen for events
calyInstance.on('setup-progress', (data) => {
  console.log('Setup progress:', data.message);
});

calyInstance.on('oas-generated', (data) => {
  console.log('OAS generated for group:', data.group);
});
```

## Architecture

The Caly class extends `TypedEmitter` to provide a type-safe event system. All operations emit events that can be consumed by CLI interfaces or other integrations.

### Storage Abstraction

Caly uses a `ConfigStorage` interface to abstract filesystem operations, allowing it to work in different environments (Node.js, browser, etc.). This means that you **need** to implement your own storage implementation to use the Caly class.

### Error Handling

All methods include comprehensive error handling with descriptive error messages and proper exception types.

## Installation

```bash
npm install @calycode/caly-core
```

## Dependencies

- `@calycode/types` - TypeScript type definitions
- `@calycode/utils` - Utility functions

## License

MIT
