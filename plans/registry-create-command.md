# Registry Create Command Implementation Plan

## Overview

This plan outlines the implementation of a new `xano registry create` command that allows users to interactively create registry components from templates or from existing Xano functions/entities.

## Command Specification

### Command Signature

```bash
xano registry create [options] [name]
```

### Arguments

| Argument | Description                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| `name`   | Optional component name (e.g., `auth/jwt-verify`). If omitted, prompted interactively. |

### Options

| Option                    | Alias | Description                                                                                                       |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| `--type <type>`           | `-t`  | Component type (function, addon, apigroup, table, middleware, task, tool, agent, mcp, realtime, trigger, snippet) |
| `--template <template>`   |       | Use a predefined template (e.g., `auth-jwt`, `crud-api`, `webhook-handler`)                                       |
| `--from-xano`             | `-x`  | Extract from existing Xano entity instead of creating from scratch                                                |
| `--instance <instance>`   |       | Xano instance name (for `--from-xano`)                                                                            |
| `--workspace <workspace>` |       | Workspace name (for `--from-xano`)                                                                                |
| `--branch <branch>`       |       | Branch name (for `--from-xano`)                                                                                   |
| `--output <path>`         | `-o`  | Output directory for the component (default: `./registry/items/<name>`)                                           |
| `--registry <path>`       | `-r`  | Path to registry.json to auto-register the component                                                              |
| `--interactive`           | `-i`  | Force interactive mode even when options are provided                                                             |
| `--dry-run`               |       | Preview what would be created without writing files                                                               |

### Examples

```bash
# Interactive mode - prompted for all options
xano registry create

# Create from template
xano registry create auth/login --type function --template auth-jwt

# Create from existing Xano function
xano registry create utils/my-helper --from-xano --type function

# Create and auto-register in existing registry
xano registry create tables/order --type table --registry ./my-registry/registry.json

# Quick addon creation
xano registry create -t addon addons/string-utils
```

---

## Implementation Architecture

### File Structure

```
packages/cli/src/commands/registry/
├── index.ts                    # Existing - add create command registration
├── create/
│   ├── index.ts               # Command registration and option parsing
│   ├── implementation.ts      # Main create logic
│   ├── interactive.ts         # Interactive prompts
│   ├── from-xano.ts          # Extract from Xano instance
│   └── templates/
│       ├── index.ts          # Template registry
│       ├── base.ts           # Base template interface
│       ├── function.ts       # Function template
│       ├── addon.ts          # Addon template
│       ├── apigroup.ts       # API group template
│       ├── table.ts          # Table template
│       ├── middleware.ts     # Middleware template
│       ├── task.ts           # Task template
│       └── presets/
│           ├── auth-jwt.ts   # JWT auth preset
│           ├── crud-api.ts   # CRUD API preset
│           ├── webhook.ts    # Webhook handler preset
│           └── ...
```

### Core Interfaces

```typescript
// packages/types/src/registry-create.ts

export interface CreateOptions {
   name: string;
   type: RegistryItemType;
   template?: string;
   fromXano?: boolean;
   instance?: string;
   workspace?: string;
   branch?: string;
   output?: string;
   registry?: string;
   interactive?: boolean;
   dryRun?: boolean;
}

export interface ComponentTemplate {
   name: string;
   description: string;
   type: RegistryItemType;

   // Generate the component definition
   generateDefinition(context: TemplateContext): RegistryItemDefinition;

   // Generate XanoScript content
   generateXanoScript(context: TemplateContext): string;

   // Optional: Additional files to create
   additionalFiles?(context: TemplateContext): Array<{
      path: string;
      content: string;
   }>;

   // Optional: Post-creation instructions
   postCreateInstructions?(context: TemplateContext): string;
}

export interface TemplateContext {
   name: string;
   title: string;
   description: string;
   author: string;
   categories: string[];
   customOptions: Record<string, any>;
}

export interface TemplatePreset extends ComponentTemplate {
   // Preset-specific options to prompt for
   promptOptions: PromptOption[];
}

export interface PromptOption {
   name: string;
   message: string;
   type: 'text' | 'select' | 'multiselect' | 'confirm';
   choices?: Array<{ label: string; value: string }>;
   default?: any;
}
```

---

## Core Templates

### 1. Function Template

**File:** `packages/cli/src/commands/registry/create/templates/function.ts`

```typescript
export const functionTemplate: ComponentTemplate = {
   name: 'function',
   description: 'A reusable function stack',
   type: 'registry:function',

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:function',
         title: ctx.title,
         description: ctx.description,
         author: ctx.author,
         categories: ctx.categories,
         files: [
            {
               path: './function.xs',
               type: 'registry:function',
            },
         ],
         registryDependencies: [],
         meta: {
            version: '1.0.0',
            created_at: new Date().toISOString(),
         },
      };
   },

   generateXanoScript(ctx) {
      return `// ${ctx.title}
// ${ctx.description}
//
// Usage: Call this function from your API endpoints or other functions.

function ${toFunctionName(ctx.name)}() {
  // Inputs
  input {
    // Add your inputs here
    // example: int as $id { required = true, description = "Record ID" }
  }

  // Function logic
  var $result {
    value = null
  }

  // TODO: Implement your logic here

  // Return result
  return $result
}
`;
   },
};
```

### 2. Addon Template

**File:** `packages/cli/src/commands/registry/create/templates/addon.ts`

```typescript
export const addonTemplate: ComponentTemplate = {
   name: 'addon',
   description: 'A reusable addon/extension',
   type: 'registry:addon',

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:addon',
         title: ctx.title,
         description: ctx.description,
         author: ctx.author,
         categories: ctx.categories,
         files: [
            {
               path: './addon.xs',
               type: 'registry:addon',
            },
         ],
         meta: {
            version: '1.0.0',
            created_at: new Date().toISOString(),
         },
      };
   },

   generateXanoScript(ctx) {
      return `// ${ctx.title}
// ${ctx.description}

addon ${toAddonName(ctx.name)} {
  description = "${ctx.description}"

  // Addon functions
  function example_function() {
    input {
      // Add inputs
    }

    // Logic here
    return null
  }
}
`;
   },
};
```

### 3. API Group Template

**File:** `packages/cli/src/commands/registry/create/templates/apigroup.ts`

```typescript
export const apiGroupTemplate: ComponentTemplate = {
   name: 'apigroup',
   description: 'An API endpoint group',
   type: 'registry:apigroup',

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:apigroup',
         title: ctx.title,
         description: ctx.description,
         author: ctx.author,
         categories: ctx.categories,
         files: [
            {
               path: './api.xs',
               type: 'registry:apigroup',
            },
         ],
         registryDependencies: [],
         meta: {
            version: '1.0.0',
            created_at: new Date().toISOString(),
         },
      };
   },

   generateXanoScript(ctx) {
      const groupName = ctx.name.split('/').pop() || 'api';
      return `// ${ctx.title}
// ${ctx.description}

apigroup ${groupName} {
  description = "${ctx.description}"
  base_path = "/${groupName}"

  // GET endpoint
  query get_items {
    method = "GET"
    path = "/"
    description = "Get all items"

    input {}

    // Logic
    var $items {
      value = []
    }

    return $items
  }

  // POST endpoint
  query create_item {
    method = "POST"
    path = "/"
    description = "Create a new item"

    input {
      json as $data { required = true }
    }

    // Logic
    var $result {
      value = $data
    }

    return $result
  }
}
`;
   },
};
```

### 4. Table Template

**File:** `packages/cli/src/commands/registry/create/templates/table.ts`

```typescript
export const tableTemplate: ComponentTemplate = {
   name: 'table',
   description: 'A database table definition',
   type: 'registry:table',

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:table',
         title: ctx.title,
         description: ctx.description,
         author: ctx.author,
         categories: ctx.categories,
         files: [
            {
               path: './table.xs',
               type: 'registry:table',
            },
         ],
         meta: {
            version: '1.0.0',
            created_at: new Date().toISOString(),
         },
      };
   },

   generateXanoScript(ctx) {
      const tableName = ctx.name.split('/').pop() || 'item';
      return `// ${ctx.title}
// ${ctx.description}

table ${tableName} {
  description = "${ctx.description}"

  // Primary key (required)
  int id {
    primary = true
    auto_increment = true
    description = "Unique identifier"
  }

  // Timestamps
  timestamp created_at {
    default = "now"
    description = "Record creation timestamp"
  }

  timestamp updated_at {
    default = "now"
    on_update = "now"
    description = "Last update timestamp"
  }

  // Add your fields here
  // text name { required = true, description = "Item name" }
  // int status { default = 0, description = "Status code" }
}
`;
   },
};
```

### 5. Middleware Template

**File:** `packages/cli/src/commands/registry/create/templates/middleware.ts`

```typescript
export const middlewareTemplate: ComponentTemplate = {
   name: 'middleware',
   description: 'Request/response middleware',
   type: 'registry:middleware',

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:middleware',
         title: ctx.title,
         description: ctx.description,
         author: ctx.author,
         categories: ctx.categories,
         postInstallHint: 'Apply this middleware to your API groups that require it.',
         files: [
            {
               path: './middleware.xs',
               type: 'registry:middleware',
            },
         ],
         meta: {
            version: '1.0.0',
            created_at: new Date().toISOString(),
         },
      };
   },

   generateXanoScript(ctx) {
      return `// ${ctx.title}
// ${ctx.description}

middleware ${toFunctionName(ctx.name)} {
  description = "${ctx.description}"
  type = "request"  // or "response"

  // Middleware logic
  // Access request via $request
  // Modify or validate as needed

  // Example: Check for required header
  // precondition ($request.headers.x_api_key != null) {
  //   error_type = "unauthorized"
  //   error = "API key required"
  // }
}
`;
   },
};
```

### 6. Task Template

**File:** `packages/cli/src/commands/registry/create/templates/task.ts`

```typescript
export const taskTemplate: ComponentTemplate = {
   name: 'task',
   description: 'A scheduled background task',
   type: 'registry:task',

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:task',
         title: ctx.title,
         description: ctx.description,
         author: ctx.author,
         categories: ctx.categories,
         postInstallHint: 'Configure the schedule in Xano after installation.',
         files: [
            {
               path: './task.xs',
               type: 'registry:task',
            },
         ],
         meta: {
            version: '1.0.0',
            created_at: new Date().toISOString(),
         },
      };
   },

   generateXanoScript(ctx) {
      return `// ${ctx.title}
// ${ctx.description}

task ${toFunctionName(ctx.name)} {
  description = "${ctx.description}"
  // Schedule configured in Xano UI after installation

  // Task logic
  var $start_time {
    value = now()
  }

  // TODO: Implement task logic

  var $end_time {
    value = now()
  }

  // Log completion
  debug {
    message = "Task completed"
    data = {
      duration_ms = $end_time - $start_time
    }
  }
}
`;
   },
};
```

---

## Template Presets

### 1. JWT Authentication Preset

**File:** `packages/cli/src/commands/registry/create/templates/presets/auth-jwt.ts`

```typescript
export const authJwtPreset: TemplatePreset = {
   name: 'auth-jwt',
   description: 'JWT authentication functions (generate, verify, refresh)',
   type: 'registry:function',

   promptOptions: [
      {
         name: 'algorithm',
         message: 'JWT algorithm',
         type: 'select',
         choices: [
            { label: 'HS256 (symmetric)', value: 'HS256' },
            { label: 'RS256 (asymmetric)', value: 'RS256' },
         ],
         default: 'HS256',
      },
      {
         name: 'includeRefresh',
         message: 'Include refresh token functionality?',
         type: 'confirm',
         default: true,
      },
      {
         name: 'expirationMinutes',
         message: 'Token expiration (minutes)',
         type: 'text',
         default: '60',
      },
   ],

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:function',
         title: ctx.title || 'JWT Authentication',
         description: ctx.description || 'JWT token generation and verification functions',
         author: ctx.author,
         categories: ['auth', 'jwt', 'security'],
         postInstallHint: `Set XANO_JWT_SECRET environment variable for ${ctx.customOptions.algorithm} signing.`,
         files: [
            { path: './jwt-generate.xs', type: 'registry:function' },
            { path: './jwt-verify.xs', type: 'registry:function' },
            ...(ctx.customOptions.includeRefresh
               ? [{ path: './jwt-refresh.xs', type: 'registry:function' }]
               : []),
         ],
         meta: {
            version: '1.0.0',
            algorithm: ctx.customOptions.algorithm,
            expiration_minutes: ctx.customOptions.expirationMinutes,
         },
      };
   },

   generateXanoScript(ctx) {
      // Primary file content
      return `// JWT Generate Token
// Generates a signed JWT token

function jwt_generate() {
  input {
    json as $payload { required = true, description = "Token payload (claims)" }
    int as $expires_in { default = ${ctx.customOptions.expirationMinutes}, description = "Expiration in minutes" }
  }

  // Get secret from environment
  var $secret {
    value = env("XANO_JWT_SECRET")
  }

  precondition ($secret != null && $secret != "") {
    error_type = "configuration_error"
    error = "XANO_JWT_SECRET not configured"
  }

  // Add standard claims
  var $claims {
    value = {
      ...$payload,
      iat = now(),
      exp = now() + ($expires_in * 60 * 1000)
    }
  }

  // Generate token
  var $token {
    value = jwt.encode($claims, $secret, "${ctx.customOptions.algorithm}")
  }

  return $token
}
`;
   },

   additionalFiles(ctx) {
      const files = [
         {
            path: './jwt-verify.xs',
            content: `// JWT Verify Token
// Verifies and decodes a JWT token

function jwt_verify() {
  input {
    text as $token { required = true, description = "JWT token to verify" }
  }

  var $secret {
    value = env("XANO_JWT_SECRET")
  }

  try_catch {
    try {
      var $decoded {
        value = jwt.decode($token, $secret, "${ctx.customOptions.algorithm}")
      }

      // Check expiration
      precondition ($decoded.exp > now()) {
        error_type = "token_expired"
        error = "Token has expired"
      }

      return {
        valid = true,
        payload = $decoded
      }
    }
    catch ($error) {
      return {
        valid = false,
        error = $error.message
      }
    }
  }
}
`,
         },
      ];

      if (ctx.customOptions.includeRefresh) {
         files.push({
            path: './jwt-refresh.xs',
            content: `// JWT Refresh Token
// Refreshes an expired or near-expiry token

function jwt_refresh() {
  input {
    text as $token { required = true, description = "Token to refresh" }
    int as $expires_in { default = ${ctx.customOptions.expirationMinutes}, description = "New expiration in minutes" }
  }

  // Verify current token (allow expired for refresh)
  var $secret {
    value = env("XANO_JWT_SECRET")
  }

  try_catch {
    try {
      var $decoded {
        value = jwt.decode($token, $secret, "${ctx.customOptions.algorithm}", { ignore_exp = true })
      }

      // Remove old timing claims
      var $payload {
        value = object.filter($decoded, ["iat", "exp", "nbf"])
      }

      // Generate new token
      call jwt_generate {
        payload = $payload
        expires_in = $expires_in
      } as $new_token

      return $new_token
    }
    catch ($error) {
      precondition (false) {
        error_type = "invalid_token"
        error = "Cannot refresh invalid token"
      }
    }
  }
}
`,
         });
      }

      return files;
   },

   postCreateInstructions(ctx) {
      return `
## JWT Authentication Setup

1. Set the environment variable:
   \`\`\`
   XANO_JWT_SECRET=your-secure-secret-key
   \`\`\`

2. For ${ctx.customOptions.algorithm}:
   ${
      ctx.customOptions.algorithm === 'RS256'
         ? '- Generate RSA key pair and configure public/private keys'
         : '- Use a strong random string (32+ characters)'
   }

3. Usage in your APIs:
   - Call \`jwt_generate\` after successful login
   - Call \`jwt_verify\` in protected endpoints
   ${ctx.customOptions.includeRefresh ? '- Call `jwt_refresh` to extend sessions' : ''}
`;
   },
};
```

### 2. CRUD API Preset

**File:** `packages/cli/src/commands/registry/create/templates/presets/crud-api.ts`

```typescript
export const crudApiPreset: TemplatePreset = {
   name: 'crud-api',
   description: 'Complete CRUD API for a resource',
   type: 'registry:apigroup',

   promptOptions: [
      {
         name: 'resourceName',
         message: 'Resource name (singular, e.g., "user", "product")',
         type: 'text',
      },
      {
         name: 'tableName',
         message: 'Database table name',
         type: 'text',
      },
      {
         name: 'includePagination',
         message: 'Include pagination for list endpoint?',
         type: 'confirm',
         default: true,
      },
      {
         name: 'includeSearch',
         message: 'Include search/filter capability?',
         type: 'confirm',
         default: true,
      },
      {
         name: 'softDelete',
         message: 'Use soft delete (is_deleted flag)?',
         type: 'confirm',
         default: false,
      },
   ],

   generateDefinition(ctx) {
      const deps = [`tables/${ctx.customOptions.tableName}`];

      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:apigroup',
         title: ctx.title || `${capitalize(ctx.customOptions.resourceName)} API`,
         description:
            ctx.description || `CRUD API for ${ctx.customOptions.resourceName} management`,
         author: ctx.author,
         categories: ['api', 'crud', ctx.customOptions.resourceName],
         registryDependencies: deps,
         files: [{ path: './api.xs', type: 'registry:apigroup' }],
         meta: {
            version: '1.0.0',
            resource: ctx.customOptions.resourceName,
            table: ctx.customOptions.tableName,
         },
      };
   },

   generateXanoScript(ctx) {
      const { resourceName, tableName, includePagination, includeSearch, softDelete } =
         ctx.customOptions;
      const plural = pluralize(resourceName);

      return `// ${capitalize(resourceName)} CRUD API
// Complete REST API for ${resourceName} management

apigroup ${plural} {
  description = "CRUD operations for ${plural}"
  base_path = "/${plural}"

  // LIST - Get all ${plural}
  query list {
    method = "GET"
    path = "/"
    description = "Get all ${plural}${includePagination ? ' with pagination' : ''}"

    input {
      ${
         includePagination
            ? `
      int as $page { default = 1, min = 1, description = "Page number" }
      int as $per_page { default = 20, min = 1, max = 100, description = "Items per page" }
      `
            : ''
      }
      ${
         includeSearch
            ? `
      text as $search { description = "Search term" }
      `
            : ''
      }
    }

    ${
       includePagination
          ? `
    var $offset {
      value = ($page - 1) * $per_page
    }
    `
          : ''
    }

    db.query "${tableName}" {
      ${softDelete ? 'where = { is_deleted == false }' : ''}
      ${
         includeSearch
            ? `
      where = {
        ${softDelete ? 'is_deleted == false &&' : ''}
        (name includes? $search || description includes? $search)
      }
      `
            : ''
      }
      ${
         includePagination
            ? `
      paging = {
        limit = $per_page,
        offset = $offset
      }
      `
            : ''
      }
      return = { type = "list" }
    } as $items

    ${
       includePagination
          ? `
    db.query "${tableName}" {
      ${softDelete ? 'where = { is_deleted == false }' : ''}
      return = { type = "count" }
    } as $total

    return {
      items = $items,
      pagination = {
        page = $page,
        per_page = $per_page,
        total = $total,
        total_pages = math.ceil($total / $per_page)
      }
    }
    `
          : 'return $items'
    }
  }

  // GET - Get single ${resourceName}
  query get {
    method = "GET"
    path = "/:id"
    description = "Get a ${resourceName} by ID"

    input {
      int as $id { in = "path", required = true, description = "${capitalize(resourceName)} ID" }
    }

    db.get "${tableName}" {
      field_name = "id"
      field_value = $id
    } as $item

    precondition ($item != null${softDelete ? ' && $item.is_deleted != true' : ''}) {
      error_type = "not_found"
      error = "${capitalize(resourceName)} not found"
    }

    return $item
  }

  // CREATE - Create new ${resourceName}
  query create {
    method = "POST"
    path = "/"
    description = "Create a new ${resourceName}"

    input {
      json as $data { required = true, description = "${capitalize(resourceName)} data" }
    }

    // TODO: Add validation

    db.add "${tableName}" {
      data = $data
    } as $new_item

    return $new_item
  }

  // UPDATE - Update ${resourceName}
  query update {
    method = "PATCH"
    path = "/:id"
    description = "Update a ${resourceName}"

    input {
      int as $id { in = "path", required = true, description = "${capitalize(resourceName)} ID" }
      json as $data { required = true, description = "Fields to update" }
    }

    // Verify exists
    db.get "${tableName}" {
      field_name = "id"
      field_value = $id
    } as $existing

    precondition ($existing != null${softDelete ? ' && $existing.is_deleted != true' : ''}) {
      error_type = "not_found"
      error = "${capitalize(resourceName)} not found"
    }

    db.patch "${tableName}" {
      field_name = "id"
      field_value = $id
      data = $data
    } as $updated

    return $updated
  }

  // DELETE - Delete ${resourceName}
  query delete {
    method = "DELETE"
    path = "/:id"
    description = "${softDelete ? 'Soft delete' : 'Delete'} a ${resourceName}"

    input {
      int as $id { in = "path", required = true, description = "${capitalize(resourceName)} ID" }
    }

    // Verify exists
    db.get "${tableName}" {
      field_name = "id"
      field_value = $id
    } as $existing

    precondition ($existing != null${softDelete ? ' && $existing.is_deleted != true' : ''}) {
      error_type = "not_found"
      error = "${capitalize(resourceName)} not found"
    }

    ${
       softDelete
          ? `
    db.patch "${tableName}" {
      field_name = "id"
      field_value = $id
      data = {
        is_deleted = true,
        deleted_at = now()
      }
    }
    `
          : `
    db.del "${tableName}" {
      field_name = "id"
      field_value = $id
    }
    `
    }

    return { success = true }
  }
}
`;
   },
};
```

### 3. Webhook Handler Preset

**File:** `packages/cli/src/commands/registry/create/templates/presets/webhook.ts`

```typescript
export const webhookPreset: TemplatePreset = {
   name: 'webhook',
   description: 'Webhook receiver endpoint with signature verification',
   type: 'registry:apigroup',

   promptOptions: [
      {
         name: 'provider',
         message: 'Webhook provider',
         type: 'select',
         choices: [
            { label: 'Stripe', value: 'stripe' },
            { label: 'GitHub', value: 'github' },
            { label: 'Custom (HMAC-SHA256)', value: 'custom' },
            { label: 'No verification', value: 'none' },
         ],
      },
      {
         name: 'secretEnvVar',
         message: 'Environment variable for webhook secret',
         type: 'text',
         default: 'WEBHOOK_SECRET',
      },
   ],

   generateDefinition(ctx) {
      return {
         $schema: 'https://calycode.com/schemas/registry/registry-item.json',
         name: ctx.name,
         type: 'registry:apigroup',
         title: ctx.title || `${capitalize(ctx.customOptions.provider)} Webhook Handler`,
         description: ctx.description || `Handles webhooks from ${ctx.customOptions.provider}`,
         author: ctx.author,
         categories: ['webhook', 'integration', ctx.customOptions.provider],
         postInstallHint: `Set ${ctx.customOptions.secretEnvVar} environment variable with your webhook signing secret.`,
         files: [{ path: './webhook.xs', type: 'registry:apigroup' }],
         meta: {
            version: '1.0.0',
            provider: ctx.customOptions.provider,
         },
      };
   },

   generateXanoScript(ctx) {
      const { provider, secretEnvVar } = ctx.customOptions;

      const verificationCode = {
         stripe: `
    // Stripe signature verification
    var $signature {
      value = $headers["stripe-signature"]
    }

    precondition ($signature != null) {
      error_type = "unauthorized"
      error = "Missing Stripe signature"
    }

    var $secret {
      value = env("${secretEnvVar}")
    }

    // Verify Stripe signature
    call verify_stripe_signature {
      payload = $raw_body,
      signature = $signature,
      secret = $secret
    } as $is_valid

    precondition ($is_valid) {
      error_type = "unauthorized"
      error = "Invalid signature"
    }`,
         github: `
    // GitHub signature verification
    var $signature {
      value = $headers["x-hub-signature-256"]
    }

    precondition ($signature != null) {
      error_type = "unauthorized"
      error = "Missing GitHub signature"
    }

    var $secret {
      value = env("${secretEnvVar}")
    }

    var $expected {
      value = "sha256=" + crypto.hmac("sha256", $raw_body, $secret)
    }

    precondition ($signature == $expected) {
      error_type = "unauthorized"
      error = "Invalid signature"
    }`,
         custom: `
    // HMAC-SHA256 signature verification
    var $signature {
      value = $headers["x-signature"]
    }

    precondition ($signature != null) {
      error_type = "unauthorized"
      error = "Missing signature header"
    }

    var $secret {
      value = env("${secretEnvVar}")
    }

    var $expected {
      value = crypto.hmac("sha256", $raw_body, $secret)
    }

    precondition ($signature == $expected) {
      error_type = "unauthorized"
      error = "Invalid signature"
    }`,
         none: `
    // No signature verification
    // WARNING: Consider adding verification in production`,
      };

      return `// Webhook Handler
// Receives and processes webhooks from ${provider}

apigroup webhook {
  description = "Webhook receiver for ${provider}"
  base_path = "/webhook"

  query receive {
    method = "POST"
    path = "/${provider}"
    description = "Receive ${provider} webhook"

    input {
      json as $body { required = true }
      json as $headers { source = "headers" }
      text as $raw_body { source = "raw_body" }
    }

    ${verificationCode[provider] || verificationCode.none}

    // Process webhook event
    var $event_type {
      value = $body.type  // Adjust based on provider format
    }

    conditional {
      if ($event_type == "example.event") {
        // Handle specific event
        call handle_example_event { data = $body }
      }
      else {
        // Log unhandled event
        debug {
          message = "Unhandled webhook event"
          data = { type = $event_type }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return { received = true }
  }
}
`;
   },
};
```

---

## From-Xano Extraction

### Implementation

**File:** `packages/cli/src/commands/registry/create/from-xano.ts`

```typescript
export async function extractFromXano(
   core: XanoCore,
   options: {
      type: RegistryItemType;
      instance: string;
      workspace: string;
      branch: string;
      entityName?: string;
   },
): Promise<{
   definition: RegistryItemDefinition;
   files: Array<{ path: string; content: string }>;
}> {
   // 1. Prompt user to select entity if not specified
   const entities = await fetchEntitiesOfType(core, options);

   const selectedEntity = options.entityName
      ? entities.find((e) => e.name === options.entityName)
      : await promptSelectEntity(entities);

   // 2. Fetch XanoScript for the entity
   const xanoscript = await fetchEntityXanoScript(core, selectedEntity);

   // 3. Generate registry item definition
   const definition: RegistryItemDefinition = {
      $schema: 'https://calycode.com/schemas/registry/registry-item.json',
      name: generateComponentName(selectedEntity),
      type: options.type,
      title: selectedEntity.name,
      description: selectedEntity.description || `Extracted from Xano: ${selectedEntity.name}`,
      author: await getGitAuthor(),
      categories: inferCategories(selectedEntity),
      files: [
         {
            path: `./${sanitizeFilename(selectedEntity.name)}.xs`,
            type: options.type,
         },
      ],
      meta: {
         version: '1.0.0',
         extracted_from: {
            instance: options.instance,
            workspace: options.workspace,
            branch: options.branch,
            entity_id: selectedEntity.id,
         },
         extracted_at: new Date().toISOString(),
      },
   };

   // 4. Return definition and files
   return {
      definition,
      files: [
         {
            path: `./${sanitizeFilename(selectedEntity.name)}.xs`,
            content: xanoscript,
         },
      ],
   };
}
```

---

## Interactive Mode

### Implementation

**File:** `packages/cli/src/commands/registry/create/interactive.ts`

```typescript
import { intro, outro, text, select, multiselect, confirm, spinner } from '@clack/prompts';

export async function interactiveCreate(): Promise<CreateOptions> {
   intro('Create Registry Component');

   // 1. Choose creation method
   const method = await select({
      message: 'How do you want to create the component?',
      options: [
         { label: 'From template', value: 'template' },
         { label: 'From preset (pre-configured template)', value: 'preset' },
         { label: 'Extract from Xano instance', value: 'from-xano' },
         { label: 'Blank component', value: 'blank' },
      ],
   });

   // 2. Component type (if not preset)
   let type: RegistryItemType;
   if (method !== 'preset') {
      type = await select({
         message: 'Component type',
         options: [
            { label: 'Function', value: 'registry:function' },
            { label: 'Addon', value: 'registry:addon' },
            { label: 'API Group', value: 'registry:apigroup' },
            { label: 'Table', value: 'registry:table' },
            { label: 'Middleware', value: 'registry:middleware' },
            { label: 'Task', value: 'registry:task' },
            { label: 'Tool (AI)', value: 'registry:tool' },
            { label: 'Agent (AI)', value: 'registry:agent' },
            { label: 'MCP Server', value: 'registry:mcp' },
            { label: 'Realtime Channel', value: 'registry:realtime' },
         ],
      });
   }

   // 3. Template/preset selection
   let template: string | undefined;
   if (method === 'template') {
      template = await selectTemplate(type);
   } else if (method === 'preset') {
      const preset = await selectPreset();
      template = preset.name;
      type = preset.type;
   }

   // 4. Component name
   const name = await text({
      message: 'Component name (e.g., auth/jwt-verify)',
      placeholder: 'category/component-name',
      validate: validateComponentName,
   });

   // 5. Metadata
   const title = await text({
      message: 'Title (human-readable)',
      initialValue: generateTitle(name),
   });

   const description = await text({
      message: 'Description',
      placeholder: 'Brief description of what this component does',
   });

   const categories = await multiselect({
      message: 'Categories (for search/organization)',
      options: getCategoryOptions(type),
   });

   // 6. Output options
   const output = await text({
      message: 'Output directory',
      initialValue: `./registry/items/${name}`,
   });

   const addToRegistry = await confirm({
      message: 'Add to existing registry.json?',
      initialValue: true,
   });

   let registry: string | undefined;
   if (addToRegistry) {
      registry = await text({
         message: 'Path to registry.json',
         initialValue: './registry/registry.json',
      });
   }

   return {
      name,
      type,
      template,
      fromXano: method === 'from-xano',
      output,
      registry,
      // ... other options
   };
}
```

---

## Command Registration

**File:** `packages/cli/src/commands/registry/create/index.ts`

```typescript
import { Command } from 'commander';
import { createComponent } from './implementation';
import { interactiveCreate } from './interactive';

export function registerCreateCommand(registry: Command, core: XanoCore) {
   registry
      .command('create')
      .description('Create a new registry component from templates or existing Xano entities')
      .argument('[name]', 'Component name (e.g., auth/jwt-verify)')
      .option('-t, --type <type>', 'Component type')
      .option('--template <template>', 'Use a predefined template')
      .option('-x, --from-xano', 'Extract from existing Xano entity')
      .option('--instance <instance>', 'Xano instance name')
      .option('--workspace <workspace>', 'Workspace name')
      .option('--branch <branch>', 'Branch name')
      .option('-o, --output <path>', 'Output directory')
      .option('-r, --registry <path>', 'Path to registry.json to auto-register')
      .option('-i, --interactive', 'Force interactive mode')
      .option('--dry-run', 'Preview without writing files')
      .action(async (name, options) => {
         // Determine if interactive mode
         const isInteractive = options.interactive || (!name && !options.type);

         let createOptions: CreateOptions;

         if (isInteractive) {
            createOptions = await interactiveCreate();
         } else {
            createOptions = {
               name,
               type: options.type,
               template: options.template,
               fromXano: options.fromXano,
               instance: options.instance,
               workspace: options.workspace,
               branch: options.branch,
               output: options.output,
               registry: options.registry,
               dryRun: options.dryRun,
            };
         }

         await createComponent(core, createOptions);
      });
}
```

---

## Documentation Update

Add to `docs/commands/registry-create.md`:

```markdown
# registry create

> [!NOTE|label:Description]
>
> #### Create a new registry component from templates, presets, or existing Xano entities.

## Quick Start

\`\`\`bash

# Interactive mode

xano registry create

# From template

xano registry create auth/login -t function --template auth-jwt

# From existing Xano function

xano registry create utils/my-helper -t function --from-xano
\`\`\`

## Options

...
```

---

## Implementation Phases

### Phase 1: Core Command (Week 1)

- [ ] Command registration and option parsing
- [ ] Basic templates (function, addon, table)
- [ ] Interactive mode with @clack/prompts
- [ ] Output file generation

### Phase 2: Templates & Presets (Week 2)

- [ ] Remaining templates (apigroup, middleware, task, tool, agent, mcp, realtime)
- [ ] Presets (auth-jwt, crud-api, webhook)
- [ ] Auto-registration in registry.json

### Phase 3: From-Xano Extraction (Week 3)

- [ ] Entity selection from Xano instance
- [ ] XanoScript extraction
- [ ] Metadata inference
- [ ] Dependency detection

### Phase 4: Polish (Week 4)

- [ ] Dry-run mode
- [ ] Documentation
- [ ] Tests
- [ ] Error handling improvements

---

## Success Criteria

1. Users can create components without manually writing JSON
2. Templates produce valid, working XanoScript
3. Presets provide complete, production-ready solutions
4. Extraction from Xano preserves all functionality
5. Interactive mode guides users through all options
6. Generated components pass `xano registry add` validation
