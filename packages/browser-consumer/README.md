# @calycode/browser-consumer

Browser-compatible ConfigStorage implementation for Caly Xano tooling using IndexedDB.

## Installation

This package is part of the Caly monorepo. Install dependencies with:

```bash
pnpm install
```

## Usage

```typescript
import { browserConfigStorage } from '@calycode/browser-consumer';
import { Caly } from '@calycode/core';

// Initialize the storage (ensures DB is ready)
await browserConfigStorage.ensureDirs();

// Use with Caly
const caly = new Caly(browserConfigStorage);

// Now you can use Caly methods in the browser
```

## Features

- IndexedDB-based storage for all config and file operations
- Compatible with Chrome extensions and modern browsers
- Implements the full ConfigStorage interface
- Automatic caching for performance

## API

See the ConfigStorage interface in @repo/types for the complete API.

## Chrome Extension Usage

This package is designed for use in Chrome extensions. Ensure your `manifest.json` includes appropriate permissions if needed (IndexedDB doesn't require special permissions).

```json
{
  "manifest_version": 3,
  "permissions": [],
  "background": {
    "service_worker": "background.js"
  }
}
```

In your extension scripts:

```javascript
import { browserConfigStorage } from '@calycode/browser-consumer';
// Use as normal
```

## Limitations

- IndexedDB has storage quotas (typically 50MB-1GB per origin)
- No actual directory structure (virtual paths supported)
- Tar extraction uses js-untar for browser compatibility

## Development

```bash
# Build
pnpm build

# Test (requires browser environment)
pnpm test
```