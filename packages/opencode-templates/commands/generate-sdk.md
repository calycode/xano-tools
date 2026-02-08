---
description: Generate a TypeScript SDK client from your Xano workspace API
agent: build
---

# Generate TypeScript SDK

Generate a TypeScript SDK for your Xano API:

$ARGUMENTS

## Process

### Step 1: Ensure Prerequisites

You need:

1. CalyCode CLI installed (`npm install -g @calycode/cli`)
2. Xano instance configured (`xano init`)
3. Workspace with published API endpoints

### Step 2: Generate SDK

Run the generation command:

```bash
# Basic generation
xano generate --instance <instance-name> --workspace <workspace-name>

# With specific output directory
xano generate --instance <instance-name> --workspace <workspace-name> --output ./src/api

# Force fetch latest schema from Xano
xano generate --instance <instance-name> --workspace <workspace-name> --fetch
```

### Step 3: SDK Features

The generated SDK includes:

- **Type-safe API methods** for each endpoint
- **Request/response types** from your OpenAPI spec
- **Error handling** with typed error responses
- **Authentication helpers** for token management
- **Runtime validation** (optional)

### Step 4: Usage Example

```typescript
import { XanoClient } from './generated-sdk';

const client = new XanoClient({
   baseUrl: 'https://your-instance.xano.io/api:endpoint',
   authToken: 'your-jwt-token',
});

// Type-safe API calls
const users = await client.user.list({ limit: 10, offset: 0 });
const user = await client.user.get({ id: 123 });
```

## Configuration Options

| Option        | Description                                |
| ------------- | ------------------------------------------ |
| `--instance`  | Xano instance name (from setup)            |
| `--workspace` | Workspace name                             |
| `--output`    | Output directory (default: ./generated)    |
| `--fetch`     | Force fetch latest schema from Xano        |
| `--generator` | Generator type (default: typescript-fetch) |

## Troubleshooting

- **"No workspace found"**: Run `xano init` first
- **"Schema not found"**: Use `--fetch` to get latest from Xano
- **Type errors**: Regenerate after API changes
