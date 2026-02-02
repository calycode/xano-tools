# API Testing Guide

This guide covers the testing capabilities of the Caly Xano CLI, enabling you to build robust, test-driven development workflows for your Xano APIs.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Configuration](#test-configuration)
  - [JSON Configuration](#json-configuration)
  - [JavaScript Configuration](#javascript-configuration)
- [Environment Variables](#environment-variables)
- [Runtime Values & Chaining](#runtime-values--chaining)
- [Custom Assertions](#custom-assertions)
- [Built-in Assertions](#built-in-assertions)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The Caly Xano CLI provides a powerful API testing framework that:

- **Executes tests sequentially** - Tests run in order, allowing chained workflows
- **Supports dynamic values** - Use `{{ENVIRONMENT.KEY}}` placeholders for secrets and config
- **Extracts runtime values** - Store response data for use in subsequent tests
- **Custom assertions** - Write your own validation logic in JavaScript
- **CI/CD ready** - Exit with non-zero codes to block deployments on failures

## Quick Start

```bash
# 1. Create a test configuration file
# test-config.json (see examples below)

# 2. Run tests
xano test run -c ./test-config.json

# 3. Run tests with environment variables
xano test run -c ./test-config.json -e API_KEY=secret -e USER_EMAIL=test@example.com

# 4. Run in CI mode (exit code 1 on failure)
xano test run -c ./test-config.json --ci

# 5. Run for all API groups
xano test run -c ./test-config.json --all --ci
```

## Command Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--config <path>` | `-c` | Path to test configuration file (.json or .js) |
| `--env <KEY=VALUE>` | `-e` | Inject environment variable (repeatable) |
| `--ci` | | Enable CI mode: exit with code 1 on failures |
| `--fail-on-warnings` | | Also fail in CI mode if there are warnings |
| `--all` | | Run tests for all API groups |
| `--group <name>` | | Run tests for specific API group |
| `--instance <name>` | | Target instance |
| `--workspace <name>` | | Target workspace |
| `--branch <name>` | | Target branch |
| `--print-output-dir` | | Expose usable output path for further reuse |

## Test Configuration

### JSON Configuration

The simplest approach is a JSON array of test entries:

```json
[
  {
    "path": "/auth/login",
    "method": "POST",
    "headers": {},
    "queryParams": null,
    "requestBody": {
      "email": "{{ENVIRONMENT.TEST_EMAIL}}",
      "password": "{{ENVIRONMENT.TEST_PASSWORD}}"
    },
    "store": [
      { "key": "AUTH_TOKEN", "path": "$.authToken" }
    ],
    "customAsserts": {}
  },
  {
    "path": "/users/me",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {{ENVIRONMENT.AUTH_TOKEN}}"
    },
    "queryParams": null,
    "requestBody": null,
    "customAsserts": {}
  }
]
```

### Test Entry Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | API endpoint path (e.g., `/users`, `/auth/login`) |
| `method` | string | Yes | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `headers` | object | Yes | Request headers (can use `{{ENVIRONMENT.KEY}}` placeholders) |
| `queryParams` | array\|null | Yes | Query parameters array or `null` |
| `requestBody` | any | Yes | Request body or `null` (can use placeholders) |
| `store` | array | No | Extract values from response for later use |
| `customAsserts` | object | No | Custom assertion functions (JS configs only) |

### Query Parameters Format

```json
{
  "queryParams": [
    { "name": "limit", "in": "query", "value": "10" },
    { "name": "offset", "in": "query", "value": "0" },
    { "name": "userId", "in": "path", "value": "{{ENVIRONMENT.USER_ID}}" }
  ]
}
```

### JavaScript Configuration

For advanced use cases (custom assertions, dynamic config), use a `.js` file:

```javascript
// test-config.js

// Load environment from file (optional)
require('dotenv').config({ path: '.env.test' });

/** @type {import('@repo/types').TestConfig} */
module.exports = [
  {
    path: '/health',
    method: 'GET',
    headers: {},
    queryParams: null,
    requestBody: null,
    customAsserts: {
      hasStatus: {
        fn: (ctx) => {
          if (!ctx.result?.status) {
            throw new Error('Response missing status field');
          }
        },
        level: 'error'
      }
    }
  },
  {
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    queryParams: null,
    requestBody: {
      email: '{{ENVIRONMENT.TEST_EMAIL}}',
      password: '{{ENVIRONMENT.TEST_PASSWORD}}'
    },
    store: [
      { key: 'AUTH_TOKEN', path: '$.authToken' },
      { key: 'USER_ID', path: '$.user.id' }
    ],
    customAsserts: {
      tokenExists: {
        fn: (ctx) => {
          if (!ctx.result?.authToken) {
            throw new Error('Login did not return authToken');
          }
        },
        level: 'error'
      },
      tokenFormat: {
        fn: (ctx) => {
          const token = ctx.result?.authToken;
          if (token && !token.startsWith('eyJ')) {
            throw new Error('Token does not appear to be a JWT');
          }
        },
        level: 'warn'
      }
    }
  }
];
```

## Environment Variables

### Priority Order

1. **CLI arguments** (`-e KEY=VALUE`) - Highest priority
2. **Process environment** (`XANO_*` prefixed variables)
3. **Loaded from config** (JS configs can use `dotenv`)

### Using in Test Config

Use the `{{ENVIRONMENT.KEY}}` pattern anywhere in:
- Headers
- Query parameter values
- Request body
- Path (for path parameters)

```json
{
  "headers": {
    "Authorization": "Bearer {{ENVIRONMENT.API_TOKEN}}",
    "X-Custom-Header": "{{ENVIRONMENT.CUSTOM_VALUE}}"
  },
  "requestBody": {
    "email": "{{ENVIRONMENT.TEST_EMAIL}}",
    "config": {
      "nested": "{{ENVIRONMENT.NESTED_VALUE}}"
    }
  }
}
```

### Loading from .env Files (JS Config)

```javascript
// test-config.js
require('dotenv').config({ path: '.env.test' });

// Now process.env contains values from .env.test
// The test runner automatically picks up XANO_* prefixed vars
module.exports = [
  // ... your tests
];
```

For multiple environments:

```javascript
// test-config.js
const path = require('path');

// Determine environment
const env = process.env.TEST_ENV || 'development';
const envFile = `.env.test.${env}`;

// Load environment-specific file
require('dotenv').config({ path: path.resolve(process.cwd(), envFile) });

module.exports = [
  // ... your tests
];
```

## Runtime Values & Chaining

Extract values from responses using JSONPath-like expressions:

```json
{
  "path": "/auth/login",
  "method": "POST",
  "requestBody": { "email": "test@example.com", "password": "secret" },
  "store": [
    { "key": "AUTH_TOKEN", "path": "$.authToken" },
    { "key": "USER_ID", "path": "$.user.id" },
    { "key": "USER_NAME", "path": "$.user.profile.name" },
    { "key": "FIRST_ITEM", "path": "$.items[0].id" }
  ]
}
```

**Stored values are available in subsequent tests:**

```json
{
  "path": "/users/{{ENVIRONMENT.USER_ID}}",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{ENVIRONMENT.AUTH_TOKEN}}"
  }
}
```

### JSONPath Syntax

| Expression | Description |
|-----------|-------------|
| `$.field` | Root level field |
| `.field` | Same as above |
| `$.nested.field` | Nested field |
| `$.array[0]` | First array element |
| `$.array[0].field` | Field from first array element |

## Custom Assertions

Custom assertions are JavaScript functions that validate response data:

```javascript
{
  customAsserts: {
    assertName: {
      fn: (context) => {
        // Throw an error to fail the assertion
        if (!isValid(context.result)) {
          throw new Error('Validation failed: reason');
        }
      },
      level: 'error' // or 'warn' or 'off'
    }
  }
}
```

### Assert Context

The `context` object passed to assertion functions contains:

| Property | Type | Description |
|----------|------|-------------|
| `requestOutcome` | Response | Raw fetch Response object |
| `result` | any | Parsed response body (JSON or text) |
| `method` | string | HTTP method used |
| `path` | string | API endpoint path |

### Assert Levels

| Level | Behavior |
|-------|----------|
| `error` | Marks test as failed |
| `warn` | Records warning, test still passes |
| `off` | Assertion is skipped |

### Example Assertions

```javascript
const customAsserts = {
  // Validate response structure
  hasRequiredFields: {
    fn: (ctx) => {
      const required = ['id', 'email', 'createdAt'];
      const missing = required.filter(f => !(f in ctx.result));
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }
    },
    level: 'error'
  },

  // Validate status code specifically
  isCreated: {
    fn: (ctx) => {
      if (ctx.requestOutcome.status !== 201) {
        throw new Error(`Expected 201 Created, got ${ctx.requestOutcome.status}`);
      }
    },
    level: 'error'
  },

  // Performance check
  fastResponse: {
    fn: (ctx) => {
      // Note: duration is not in context, this is a placeholder pattern
      // You would need to track timing externally
    },
    level: 'warn'
  },

  // Data validation
  validEmail: {
    fn: (ctx) => {
      const email = ctx.result?.email;
      if (email && !email.includes('@')) {
        throw new Error('Invalid email format in response');
      }
    },
    level: 'error'
  },

  // Array length check
  hasItems: {
    fn: (ctx) => {
      if (!Array.isArray(ctx.result) || ctx.result.length === 0) {
        throw new Error('Expected non-empty array');
      }
    },
    level: 'error'
  }
};
```

## Built-in Assertions

When `customAsserts` is empty or not provided, these built-in assertions run:

| Assertion | Level | Description |
|-----------|-------|-------------|
| `statusOk` | error | Response status is 2xx |
| `responseDefined` | warn | Response body is not null/undefined |
| `responseSchema` | off | Validates against OpenAPI schema (disabled by default) |

## CI/CD Integration

### Basic CI Usage

```bash
# Run tests and fail pipeline on errors
xano test run -c ./test-config.json --ci
```

### GitHub Actions Example

```yaml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Caly CLI
        run: npm install -g @calycode/cli
      
      - name: Run API Tests
        env:
          XANO_TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          XANO_TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
        run: |
          xano test run \
            -c ./test-config.json \
            --instance production \
            --workspace main \
            --branch prod \
            --all \
            --ci
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: '**/tests/**/*.json'
```

### GitLab CI Example

```yaml
api-tests:
  stage: test
  image: node:20
  before_script:
    - npm install -g @calycode/cli
  script:
    - xano test run -c ./test-config.json --all --ci
  variables:
    XANO_TEST_EMAIL: ${TEST_EMAIL}
    XANO_TEST_PASSWORD: ${TEST_PASSWORD}
  artifacts:
    when: always
    paths:
      - '**/tests/**/*.json'
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed (only in `--ci` mode) |

## Best Practices

### 1. Organize Tests by Flow

```javascript
module.exports = [
  // Authentication flow
  { path: '/auth/login', /* ... */ },
  { path: '/auth/refresh', /* ... */ },
  
  // User operations (authenticated)
  { path: '/users/me', /* ... */ },
  { path: '/users/me/settings', /* ... */ },
  
  // Cleanup
  { path: '/auth/logout', /* ... */ }
];
```

### 2. Use Environment Variables for Secrets

Never hardcode credentials:

```javascript
// ❌ Bad
{ requestBody: { password: 'mysecret123' } }

// ✅ Good
{ requestBody: { password: '{{ENVIRONMENT.TEST_PASSWORD}}' } }
```

### 3. Chain Tests with Runtime Values

```javascript
[
  // Create resource
  {
    path: '/posts',
    method: 'POST',
    requestBody: { title: 'Test Post' },
    store: [{ key: 'POST_ID', path: '$.id' }]
  },
  // Verify creation
  {
    path: '/posts/{{ENVIRONMENT.POST_ID}}',
    method: 'GET'
  },
  // Cleanup
  {
    path: '/posts/{{ENVIRONMENT.POST_ID}}',
    method: 'DELETE'
  }
]
```

### 4. Use Meaningful Assert Names

```javascript
customAsserts: {
  // ❌ Bad
  check1: { fn: (ctx) => { /* ... */ }, level: 'error' },
  
  // ✅ Good
  userHasValidEmail: { fn: (ctx) => { /* ... */ }, level: 'error' },
  responseTimeUnder500ms: { fn: (ctx) => { /* ... */ }, level: 'warn' }
}
```

### 5. Separate Test Configs by Environment

```
tests/
├── test-config.dev.js
├── test-config.staging.js
└── test-config.prod.js
```

```bash
# Development
xano test run -c ./tests/test-config.dev.js --branch dev

# Staging
xano test run -c ./tests/test-config.staging.js --branch staging

# Production (read-only tests)
xano test run -c ./tests/test-config.prod.js --branch prod --ci
```

## Test Results

Test results are written to JSON files at:
```
{workspace}/{branch}/tests/{api_group}/test-results-{timestamp}.json
```

Example output:
```json
[
  {
    "path": "/users",
    "method": "GET",
    "success": true,
    "errors": null,
    "warnings": null,
    "duration": 145
  },
  {
    "path": "/auth/login",
    "method": "POST",
    "success": false,
    "errors": [
      { "key": "statusOk", "message": "POST:/auth/login | ❌ Response status was 401 (expected 200)" }
    ],
    "warnings": null,
    "duration": 89
  }
]
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Environment variable not found" | Check `XANO_*` prefix or use `-e` flag |
| "Unsupported test config file type" | Use `.json` or `.js` extension |
| "Cannot find module 'dotenv'" | Install: `npm install dotenv` |
| Tests pass locally, fail in CI | Ensure all `XANO_*` secrets are set in CI |
| "Request failed" errors | Check API endpoint paths and authentication |

## Resources

- [Test Config Schema](https://calycode.com/schemas/testing/config.json)
- [CLI Documentation](/docs/xano.md)
- [GitHub Repository](https://github.com/calycode/xano-tools)
- [Discord Community](https://links.calycode.com/discord)
