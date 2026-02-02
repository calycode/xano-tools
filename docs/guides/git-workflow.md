# Git Workflow for Xano Projects

This guide covers version control best practices for Xano projects using Xano Tools.

## Table of Contents

- [Overview](#overview)
- [Initial Setup](#initial-setup)
- [Repository Generation](#repository-generation)
- [Branching Strategy](#branching-strategy)
- [Daily Workflow](#daily-workflow)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

Xano Tools enables Git-based version control for your Xano backend by:

- **Exporting workspace schema** - Database structure, API definitions
- **Extracting XanoScript** - Human-readable function code
- **Generating documentation** - OpenAPI specs, API docs
- **Supporting automation** - CI/CD pipelines

## Initial Setup

### 1. Install and Initialize CLI

```bash
# Install globally
npm install -g @calycode/cli

# Initialize with your Xano instance
xano init

# Follow prompts to configure:
# - Instance name
# - Xano URL
# - Metadata API token
# - Output directory
```

### 2. Generate Initial Repository

```bash
# Generate complete repository structure
xano generate repo \
  --instance production \
  --workspace main \
  --branch live

# Initialize Git
cd your-project-directory
git init
git add .
git commit -m "Initial Xano workspace export"
```

### 3. Set Up Remote

```bash
# Add remote repository
git remote add origin https://github.com/your-org/xano-backend.git
git push -u origin main
```

## Repository Generation

### The `generate repo` Command

```bash
xano generate repo [options]
```

**Options:**

| Option               | Description                 |
| -------------------- | --------------------------- |
| `--instance <name>`  | Xano instance name          |
| `--workspace <name>` | Workspace name              |
| `--branch <name>`    | Xano branch                 |
| `--output <dir>`     | Output directory            |
| `--fetch`            | Force fresh fetch from Xano |
| `--print-output-dir` | Print output path           |

### Generated Structure

```
project/
├── schema/
│   └── workspace-schema.json    # Full workspace schema
├── xanoscript/
│   ├── functions/               # Function stacks
│   ├── apis/                    # API groups and endpoints
│   ├── tables/                  # Table definitions
│   ├── addons/                  # Addons
│   ├── tasks/                   # Scheduled tasks
│   ├── middleware/              # Middleware
│   └── triggers/                # Triggers
├── openapi/
│   └── spec.json                # OpenAPI specification
└── docs/
    └── api-docs.html            # Generated documentation
```

### XanoScript Extraction

For just XanoScript (lighter weight):

```bash
xano generate xanoscript \
  --instance production \
  --workspace main \
  --branch live
```

## Branching Strategy

### Recommended Model

```
main (production)
│
├── staging (pre-production)
│
├── develop (integration)
│   ├── feature/user-auth
│   ├── feature/api-v2
│   └── feature/payment
│
└── hotfix/critical-fix
```

### Branch Mapping

Map Git branches to Xano branches:

| Git Branch  | Xano Branch               | Purpose                |
| ----------- | ------------------------- | ---------------------- |
| `main`      | `live`                    | Production             |
| `staging`   | `staging`                 | Pre-production testing |
| `develop`   | `develop`                 | Integration            |
| `feature/*` | `dev` or feature branches | Development            |

### Creating Feature Branches

```bash
# Create Git branch
git checkout -b feature/new-api

# Work in corresponding Xano branch
# (Use Calycode Extension for branch management)

# Export changes
xano generate xanoscript --branch dev

# Commit
git add .
git commit -m "Add new API endpoints"
```

## Daily Workflow

### Morning Sync

```bash
# Pull latest changes
git pull origin develop

# Check for updates from Xano
xano generate xanoscript --branch develop

# Review changes
git status
git diff
```

### After Making Changes in Xano

```bash
# Export your changes
xano generate repo --branch develop

# Review what changed
git status
git diff

# Commit with descriptive message
git add .
git commit -m "feat: add user profile endpoint

- Added GET /users/profile endpoint
- Added update profile functionality
- Added validation for profile fields"

# Push to remote
git push origin feature/user-profile
```

### Before Merging

```bash
# Run tests
xano test run -c ./tests/config.json --branch develop --ci

# Generate fresh docs
xano generate docs

# Final export
xano generate repo --branch develop

# Commit any doc changes
git add .
git commit -m "docs: update API documentation"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/xano-sync.yml
name: Xano Sync

on:
   schedule:
      - cron: '0 */6 * * *' # Every 6 hours
   workflow_dispatch: # Manual trigger

jobs:
   sync:
      runs-on: ubuntu-latest
      steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
              node-version: '20'

         - name: Install Xano CLI
           run: npm install -g @calycode/cli

         - name: Generate Repository
           env:
              XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
           run: |
              xano generate repo \
                --instance production \
                --workspace main \
                --branch live \
                --fetch

         - name: Check for Changes
           id: changes
           run: |
              if [[ -n $(git status --porcelain) ]]; then
                echo "has_changes=true" >> $GITHUB_OUTPUT
              fi

         - name: Commit Changes
           if: steps.changes.outputs.has_changes == 'true'
           run: |
              git config user.name "GitHub Actions"
              git config user.email "actions@github.com"
              git add .
              git commit -m "sync: update from Xano production"
              git push
```

### Test on Pull Request

```yaml
# .github/workflows/test.yml
name: API Tests

on:
   pull_request:
      branches: [main, develop]

jobs:
   test:
      runs-on: ubuntu-latest
      steps:
         - uses: actions/checkout@v4

         - uses: actions/setup-node@v4
           with:
              node-version: '20'

         - name: Install Xano CLI
           run: npm install -g @calycode/cli

         - name: Run Tests
           env:
              XANO_TOKEN_STAGING: ${{ secrets.XANO_TOKEN_STAGING }}
              XANO_TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
              XANO_TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
           run: |
              xano test run \
                -c ./tests/config.json \
                --instance staging \
                --workspace main \
                --branch staging \
                --all \
                --ci
```

### Documentation Deployment

```yaml
# .github/workflows/docs.yml
name: Deploy Docs

on:
   push:
      branches: [main]

jobs:
   deploy:
      runs-on: ubuntu-latest
      steps:
         - uses: actions/checkout@v4

         - uses: actions/setup-node@v4
           with:
              node-version: '20'

         - name: Install Xano CLI
           run: npm install -g @calycode/cli

         - name: Generate Documentation
           env:
              XANO_TOKEN_PRODUCTION: ${{ secrets.XANO_TOKEN }}
           run: xano generate docs

         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
              github_token: ${{ secrets.GITHUB_TOKEN }}
              publish_dir: ./docs
```

## Best Practices

### Commit Messages

Follow conventional commits:

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- refactor: Code refactoring
- test: Tests
- sync: Xano sync

Examples:
- feat(api): add user authentication endpoints
- fix(auth): correct token expiration handling
- docs: update API documentation
- sync: update from Xano production
```

### What to Commit

**Do commit:**

- XanoScript files (`.xs`)
- Schema exports (JSON)
- OpenAPI specifications
- Documentation
- Test configurations
- CI/CD workflows

**Don't commit:**

- Secrets or API tokens
- Environment-specific configurations
- Temporary files
- Build artifacts

### .gitignore

```gitignore
# Environment
.env
.env.*

# Secrets
**/secrets/
*.secret

# Build
node_modules/
dist/

# Temporary
*.tmp
*.log

# IDE
.vscode/
.idea/
```

### Environment Variables

Store tokens securely:

```bash
# Local development (.env - not committed)
XANO_TOKEN_PRODUCTION=your-token-here
XANO_TOKEN_STAGING=your-staging-token

# CI/CD - use secrets management
# GitHub: Settings > Secrets > Actions
# GitLab: Settings > CI/CD > Variables
```

### Code Review Checklist

Before merging:

- [ ] XanoScript exported and committed
- [ ] Tests pass (`xano test run --ci`)
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Follows naming conventions
- [ ] Dependencies documented

## Troubleshooting

### Common Issues

| Issue                   | Solution                                |
| ----------------------- | --------------------------------------- |
| "Instance not found"    | Run `xano init` to configure            |
| "Authentication failed" | Check `XANO_TOKEN_*` env vars           |
| Merge conflicts in JSON | Regenerate from Xano, resolve manually  |
| Missing XanoScript      | Ensure Xano 2.0+ for XanoScript support |

### Regenerating After Conflicts

```bash
# Discard local changes
git checkout -- .

# Fresh export from Xano
xano generate repo --fetch

# Review and commit
git add .
git commit -m "sync: regenerate from Xano"
```

## Resources

- [Generate Repo Command](/docs/commands/generate-repo.md)
- [Generate XanoScript Command](/docs/commands/generate-xanoscript.md)
- [API Testing Guide](/docs/guides/testing.md)
- [Calycode Extension](https://extension.calycode.com)
- [Discord Community](https://links.calycode.com/discord)
