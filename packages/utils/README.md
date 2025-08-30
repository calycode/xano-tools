# @calycode/utils

Utility functions and helpers for the Caly Xano tools ecosystem.

## Overview

This package provides core utility functions for:
- Xano Metadata API communication
- Configuration management and validation
- String processing and sanitization
- Template placeholder replacement
- Workspace and branch discovery

## Key Functions

### API Helpers

- **`metaApiRequest()`** - Make authenticated requests to Xano Metadata API
- **`metaApiGet()`** - Convenience function for GET requests
- **`metaApiPost()`** - Convenience function for POST requests
- **`metaApiRequestBlob()`** - Request binary data from Xano API

### Configuration Utilities

- **`fetchWorkspacesAndBranches()`** - Discover available workspaces and branches
- **`prepareRequest()`** - Replace placeholders in request templates
- **`sanitizeFileName()`** - Create filesystem-safe names

### Template Processing

- **`replacePlaceholders()`** - Recursively replace {placeholders} in objects/strings

## Usage

### API Communication

```typescript
import { metaApiGet, metaApiPost } from '@calycode/utils';

// Get workspace information
const workspace = await metaApiGet({
  baseUrl: 'https://x123.xano.io',
  token: 'your-api-token',
  path: '/workspace/{id}',
  pathParams: { id: '123' }
});

// Create a new function
const newFunction = await metaApiPost({
  baseUrl: 'https://x123.xano.io',
  token: 'your-api-token',
  path: '/workspace/{workspaceId}/function',
  pathParams: { workspaceId: '123' },
  body: `
   function hello-world {
    input {
      int score
    }
    stack {
      var $x1 {
        value = $input.score + 1
      }
    }
    response {
      value = $x1
    }
  }`
});
```

### Workspace Discovery

```typescript
import { fetchWorkspacesAndBranches } from '@calycode/utils';

const { workspaces, branches } = await fetchWorkspacesAndBranches(
  'https://x123.xano.io',
  'your-api-token'
);

console.log('Available workspaces:', workspaces.map(w => w.name));
console.log('Branches for main workspace:', branches['main']);
```

### Template Processing

```typescript
import { replacePlaceholders } from '@calycode/utils';

const template = {
  url: 'https://{instance}.xano.io/api/{version}',
  headers: { 'X-Branch': '{branch}' }
};

const result = replacePlaceholders(template, {
  instance: 'x123',
  version: 'v1',
  branch: 'main'
});
// Returns: { url: 'https://x123.xano.io/api/v1', headers: { 'X-Branch': 'main' } }
```

### File Name Sanitization

```typescript
import { sanitizeFileName } from '@calycode/utils';

const safeName = sanitizeFileName('My API Group!');
// Returns: 'my_api_group_'
```

## Installation

```bash
npm install @calycode/utils
```

## Dependencies

- `@calycode/types` - TypeScript type definitions

## License

MIT
