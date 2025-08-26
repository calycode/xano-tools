# @mihalytoth20/xcc-utils

Utility functions and helpers for the Xano Community CLI (XCC) ecosystem.

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
import { metaApiGet, metaApiPost } from '@mihalytoth20/xcc-utils';

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
  body: { name: 'my-function', code: 'return "hello"' }
});
```

### Workspace Discovery

```typescript
import { fetchWorkspacesAndBranches } from '@mihalytoth20/xcc-utils';

const { workspaces, branches } = await fetchWorkspacesAndBranches(
  'https://x123.xano.io',
  'your-api-token'
);

console.log('Available workspaces:', workspaces.map(w => w.name));
console.log('Branches for main workspace:', branches['main']);
```

### Template Processing

```typescript
import { replacePlaceholders } from '@mihalytoth20/xcc-utils';

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
import { sanitizeFileName } from '@mihalytoth20/xcc-utils';

const safeName = sanitizeFileName('My API Group!');
// Returns: 'my_api_group_'
```

## Installation

```bash
npm install @mihalytoth20/xcc-utils
```

## Dependencies

- `@mihalytoth20/xcc-types` - TypeScript type definitions

## License

MIT
