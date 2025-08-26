# @mihalytoth20/xcc-core

Core functionality for the Xano Community CLI (XCC) providing programmatic access to Xano development workflows.

## Overview

The core package provides the main `XCC` class that orchestrates all Xano operations including:
- Instance setup and configuration management
- OpenAPI specification generation
- Workspace backup and restore operations
- Context switching and validation
- Event-driven architecture for CLI integration

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
import { XCC } from '@mihalytoth20/xcc-core';
import { nodeConfigStorage } from '@mihalytoth20/xcc-cli';

const xcc = new XCC(nodeConfigStorage);

// Setup a new Xano instance
await xcc.setupInstance({
  name: 'production',
  url: 'https://x123.xano.io',
  apiKey: 'your-metadata-api-key'
});
```

### Context Management

```typescript
// Switch to a different context
await xcc.switchContext({
  instance: 'staging',
  workspace: 'main',
  branch: 'develop'
});

// Load and validate context
const context = await xcc.loadAndValidateContext({
  instance: 'production',
  workspace: 'main',
  branch: 'master'
});
```

### OpenAPI Generation

```typescript
// Generate OAS for specific API groups
const results = await xcc.updateOpenapiSpec(
  'production',
  'main',
  'master',
  ['user-api', 'admin-api']
);

// Generate OAS for all API groups
const allResults = await xcc.updateOpenapiSpec(
  'production',
  'main',
  'master',
  ['all']
);
```

### Backup Operations

```typescript
// Export workspace backup
const backupData = await xcc.exportBackup({
  instance: 'production',
  workspace: 'main',
  branch: 'master'
});

// Restore from backup
const formData = new FormData();
formData.append('backup', backupFile);

await xcc.restoreBackup({
  instance: 'staging',
  workspace: 'main',
  formData: formData
});
```

### Event Handling

```typescript
// Listen for events
xcc.on('setup-progress', (data) => {
  console.log('Setup progress:', data.message);
});

xcc.on('oas-generated', (data) => {
  console.log('OAS generated for group:', data.group);
});
```

## Architecture

The XCC class extends `TypedEmitter` to provide a type-safe event system. All operations emit events that can be consumed by CLI interfaces or other integrations.

### Storage Abstraction

XCC uses a `ConfigStorage` interface to abstract filesystem operations, allowing it to work in different environments (Node.js, browser, etc.).

### Error Handling

All methods include comprehensive error handling with descriptive error messages and proper exception types.

## Installation

```bash
npm install @mihalytoth20/xcc-core
```

## Dependencies

- `@mihalytoth20/xcc-types` - TypeScript type definitions
- `@mihalytoth20/xcc-utils` - Utility functions

## License

MIT
