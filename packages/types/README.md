# @calycode/types

TypeScript type definitions and interfaces for the Caly Xano tooling ecosystem.

## Overview

This package provides comprehensive TypeScript types for:
- Configuration management (instances, workspaces, branches)
- API request/response structures
- Event system definitions
- Storage interface abstractions

## Key Types

### Configuration Types

- **`InstanceConfig`** - Xano instance configuration with connection details
- **`WorkspaceConfig`** - Workspace metadata and branch listings
- **`BranchConfig`** - Branch identification and metadata
- **`Context`** - Operational context specification
- **`GlobalConfig`** - Global Caly configuration structure

### API Types

- **`MetaApiRequestOptions`** - Configuration for Xano Metadata API requests
- **`MetaApiRequestBlobOptions`** - Configuration for binary API requests
- **`PathParams`** - URL path parameter replacements
- **`QueryParams`** - URL query string parameters
- **`Headers`** - HTTP header definitions

### Storage Interface

- **`ConfigStorage`** - Abstract storage interface for configuration and file operations

### Event System

- **`EventMap`** - Type-safe event definitions for Caly operations
- **`CalyEvents`** - Specific event types emitted by Caly core

## Usage

```typescript
import {
  InstanceConfig,
  WorkspaceConfig,
  Context,
  ConfigStorage
} from '@calycode/types';

// Define a context for operations
const context: Context = {
  instance: 'production',
  workspace: 'main',
  branch: 'master'
};

// Implement custom storage
class MyStorage implements ConfigStorage {
  async loadGlobalConfig(): Promise<GlobalConfig> {
    // Custom implementation
  }
  // ... other methods
}
```

## Installation

This package is typically installed as a dependency of other Caly packages and doesn't need to be installed directly.

```bash
npm install @calycode/types
```

## License

MIT
