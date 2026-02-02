# Xano Development Patterns & Best Practices

This guide covers common patterns, best practices, and recommended tools for building complex Xano applications.

## Table of Contents

- [Overview](#overview)
- [Development Environment](#development-environment)
- [Logging & Monitoring](#logging--monitoring)
- [Team Collaboration](#team-collaboration)
- [Architecture Patterns](#architecture-patterns)
- [Registry vs Snippets](#registry-vs-snippets)
- [External Resources](#external-resources)
- [Community Tools](#community-tools)

## Overview

Building production-grade Xano applications requires:

- **Proper tooling** - Development, logging, and monitoring
- **Team workflows** - Branching, code review, and collaboration
- **Architecture patterns** - Organizing complex business logic
- **Component reuse** - Leveraging registries and shared code

This guide provides recommendations and points to comprehensive resources.

## Development Environment

### Recommended Setup

| Tool | Purpose | Link |
|------|---------|------|
| **Xano VS Code Extension** | XanoScript development | [Xano Docs](https://docs.xano.com/xanoscript/vs-code) |
| **Xano Tools CLI** | Automation & version control | [CLI Docs](/docs/xano.md) |
| **Calycode Extension** | Team branching & collaboration | [extension.calycode.com](https://extension.calycode.com) |

### Initial Setup

```bash
# Install Xano Tools CLI
npm install -g @calycode/cli

# Initialize for your Xano instance
xano init
# Follow the interactive prompts

# Verify setup
xano context show
```

### Version Control Workflow

```bash
# Generate repository with XanoScript
xano generate repo \
  --instance production \
  --workspace main \
  --branch live

# Initialize Git
git init
git add .
git commit -m "Initial Xano workspace export"
```

## Logging & Monitoring

### Production Logging with Axiom

For production-grade logging, we recommend **[Axiom](https://axiom.co)**:

- **Real-time log streaming** - See logs as they happen
- **Structured data** - Query and filter log data
- **Alerts** - Get notified of errors
- **Cost-effective** - Generous free tier

#### Integration Pattern

1. **Create an Axiom account** at [axiom.co](https://axiom.co)
2. **Create a dataset** for your Xano logs
3. **Get your API token** from Axiom settings
4. **Create a logging function** in Xano:

```
// Pseudocode for logging function
function log_to_axiom(level, message, data) {
  // POST to Axiom ingest endpoint
  // https://api.axiom.co/v1/datasets/YOUR_DATASET/ingest
  // Include: timestamp, level, message, data
}
```

5. **Call from your functions:**

```
// In your Xano functions
call: log_to_axiom("info", "User logged in", { user_id: $user.id })
```

#### What to Log

- **Authentication events** - Login, logout, token refresh
- **Error conditions** - Failed operations, exceptions
- **Performance data** - Slow queries, API response times
- **Business events** - Orders, payments, critical actions

### Built-in Xano Logging

For development, use Xano's built-in request history:

1. Navigate to your API group
2. Click "Request History"
3. View recent requests and responses

## Team Collaboration

### Branching with Calycode Extension

For team development, use the **[Calycode Browser Extension](https://extension.calycode.com)**:

- **Visual branch management** - Easy branch switching
- **Environment isolation** - Test without affecting production
- **Team coordination** - See who's working where

#### Recommended Branching Strategy

```
main (production)
├── staging (pre-production testing)
├── develop (integration branch)
│   ├── feature/user-auth
│   ├── feature/payment-integration
│   └── feature/api-v2
└── hotfix/critical-bug
```

#### Workflow

1. **Create feature branch** from develop
2. **Develop and test** in isolation
3. **Merge to develop** for integration testing
4. **Promote to staging** for final testing
5. **Deploy to main** (production)

### Code Review Process

1. **Export XanoScript** before merging:
   ```bash
   xano generate xanoscript --branch feature/new-feature
   ```

2. **Review in Git** - Use standard PR workflows

3. **Run tests** before deployment:
   ```bash
   xano test run -c ./tests/config.json --branch develop --ci
   ```

## Architecture Patterns

### Layered Architecture

Organize your Xano workspace into layers:

```
Functions/
├── api/           # API handlers (thin layer)
│   ├── users/
│   └── orders/
├── business/      # Business logic
│   ├── auth/
│   ├── checkout/
│   └── notifications/
├── data/          # Data access layer
│   ├── user-repository/
│   └── order-repository/
└── utils/         # Shared utilities
    ├── validation/
    └── formatting/
```

### Service-Oriented Design

Create focused, reusable services:

```json
// Registry component: services/payment
{
  "name": "services/payment",
  "type": "registry:function",
  "description": "Payment processing service",
  "registryDependencies": [
    "utils/stripe-client",
    "utils/logging"
  ]
}
```

### Error Handling Pattern

Standardize error handling across your application:

```
// Error response structure
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "details": { "field": "email" }
}
```

Create a shared error handler function and use it consistently.

## Registry vs Snippets

### When to Use Standard Xano Snippets

- Simple, single-purpose code blocks
- Quick prototyping
- Code that won't be shared

### When to Use Registry Components

| Use Case | Why Registry? |
|----------|---------------|
| **Multi-file components** | Snippets are single files |
| **Dependencies** | Registry handles dependency resolution |
| **Team sharing** | Host and version registries |
| **Version control** | Track changes in Git |
| **Complex business logic** | Better organization |
| **CI/CD integration** | Programmatic deployment |

### Migrating from Snippets to Registry

1. **Export your snippet** to XanoScript
2. **Create a registry item** with the definition
3. **Add dependencies** if needed
4. **Test installation** to a development branch
5. **Share with team** via registry URL

## External Resources

### Comprehensive Xano Training

For in-depth Xano education and advanced patterns:

> **StateChange.ai**  
> https://statechange.ai
> 
> Comprehensive Xano training courses covering:
> - Advanced function patterns
> - Authentication strategies
> - Performance optimization
> - Real-world project tutorials

### Community Development Tools

> **XDM - Xano Development Manager**  
> https://github.com/gmaison/xdm
> 
> Community-built tooling for Xano development workflows.

### Official Xano Documentation

- **Xano Docs:** https://docs.xano.com
- **XanoScript Reference:** https://docs.xano.com/xanoscript/vs-code#usage
- **Xano Community:** https://community.xano.com

## Community Tools

### Xano Tools Ecosystem

| Tool | Purpose | Link |
|------|---------|------|
| **@calycode/cli** | CLI for automation | [GitHub](https://github.com/calycode/xano-tools) |
| **Calycode Extension** | Browser extension for branching | [extension.calycode.com](https://extension.calycode.com) |
| **XDM** | Development manager | [GitHub](https://github.com/gmaison/xdm) |

### Contributing

Found a useful pattern? Share it with the community:

1. **Create a registry** with your components
2. **Document thoroughly** with examples
3. **Share on Discord** - [links.calycode.com/discord](https://links.calycode.com/discord)

## Quick Reference

### Common Commands

```bash
# Initialize CLI
xano init

# Generate repository
xano generate repo

# Extract XanoScript
xano generate xanoscript

# Create registry
xano registry scaffold --output ./my-registry

# Serve registry locally
xano serve registry --path ./my-registry

# Install components
xano registry add component-name --registry <url>

# Run tests
xano test run -c ./config.json --ci

# Generate documentation
xano generate docs
```

### Environment Variables

```bash
# Instance tokens
XANO_TOKEN_PRODUCTION=your-metadata-api-token
XANO_TOKEN_STAGING=your-staging-token

# Test configuration
XANO_TEST_EMAIL=test@example.com
XANO_TEST_PASSWORD=your-test-password
```

## Next Steps

- **[Scaffolding Guide](/docs/guides/scaffolding.md)** - Create new components
- **[Registry Authoring](/docs/guides/registry-authoring.md)** - Build registries
- **[API Testing Guide](/docs/guides/testing.md)** - Test your APIs
- **[Git Workflow Guide](/docs/guides/git-workflow.md)** - Version control best practices

## Resources

- **Xano Docs:** https://docs.xano.com
- **StateChange.ai:** https://statechange.ai
- **XDM:** https://github.com/gmaison/xdm
- **Axiom Logging:** https://axiom.co
- **Calycode Extension:** https://extension.calycode.com
- **Discord Community:** https://links.calycode.com/discord
