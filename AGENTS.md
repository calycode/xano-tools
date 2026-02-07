# Repository Overview

## Project Description
This project provides a suite of tools to improve developer experience with Xano, focusing on clarity, transparency, automation, and robust version control for Xano backend developments. The main goal is to minimize reliance on AI by offering reliable CLI-based workflows for code generation, documentation, testing, and registry management. The tools allow teams to automate backups, generate OpenAPI specifications, create fully browsable repositories from Xano metadata, scaffold and serve reusable component registries, and run automated tests—all integrated with Git workflows and CI/CD.

**Key technologies used:**
- Node.js (>=18)
- TypeScript
- PNPM workspaces
- TurboRepo for monorepo builds
- Jest for testing
- Esbuild/Rollup for bundling
- Commander.js for the CLI
- js-yaml for YAML processing

## Architecture Overview
- **Monorepo Layout:** Managed by PNPM and TurboRepo with logical separation by package:
    - `@calycode/cli`: The main CLI.
    - `@calycode/core`: Business and program logic for processing Xano data and interfacing with metadata APIs.
    - `@calycode/types`: Shared type definitions.
    - `@calycode/utils`: Shared utilities.
- **CLI Entry Point:** The CLI (`xano`) registers commands for setup, codegen, OAS gen, tests, registry, backup, etc. Each command routes into core business logic via composed packages.
- **Extensible Registry System:** For sharing and consuming standardized Xano components (functions, tables, queries, etc.).
- **Configurable Storage and Context Management:** Multi-user, multi-environment ready.
- **Automated CI/CD Ready:** Designed to run in GitHub Actions or local workflows.

**Data Flow & Interactions:**
- User issues a CLI command (`xano ...`)
- CLI parses config/context, invokes logic in `@calycode/core`
- Utilities help fetch, transform, and validate data
- Output is written to file system, appropriate directories, or remote registries
- CI/CD scripts automate build and publish steps

## Directory Structure
- **./packages**: Main monorepo packages (cli, core, types, utils)
- **./docs**: Documentation, including CLI command references
- **./schemas**: JSON schemas for registries and related features
- **.github/**: GitHub workflows for CI/CD and publishing
- **scripts/**: Build, clean, and documentation generation scripts
- **test-config.json, turbo.json, pnpm-workspace.yaml**: Config files for monorepo tooling
- **Entry Points:**
   - CLI: `packages/cli/src/index.ts` and `dist/index.cjs`
   - Core logic: `packages/core/src/index.ts`

## Development Workflow
- **Install/Setup**: `pnpm install` to install everything. (Requires pnpm)
- **Build**: `pnpm build` (runs TurboRepo, builds all packages)
- **Run CLI**: `pnpm xano <command>` or if globally linked, `xano <command>`
- **Testing**: `pnpm test` (runs tests across all packages)
- **Linting/Formatting**: Eslint/Prettier with default configs, e.g. `pnpm lint`, some packages have their own config and scripts
- **CI/CD**: See `.github/workflows`. Ready for automated release, docs update, and registry actions

---

## Build, Lint, and Test Commands

### Build Commands
- **Full build**: `pnpm build` - Builds all packages using TurboRepo
- **Clean build**: `pnpm clean && pnpm build` - Clean and rebuild everything
- **Documentation build**: `pnpm build:docs` - Build docs and CLI reference

### Test Commands
- **All tests**: `pnpm test` - Run all tests across packages
- **Watch mode**: `pnpm test:watch` - Run tests in watch mode
- **Coverage**: `pnpm test:coverage` - Run tests with coverage reporting
- **Single test file**: `pnpm test <path-to-test-file>` - Run specific test file
- **Test pattern**: `pnpm test -- --testNamePattern="pattern"` - Run tests matching pattern
- **Single package tests**: `cd packages/<package> && pnpm test` - Run tests for specific package

### Lint Commands
- **Lint all**: `pnpm lint` - Run ESLint across all packages
- **Lint single package**: `cd packages/<package> && pnpm lint` - Lint specific package
- **Auto-fix**: `pnpm lint --fix` - Auto-fix linting issues where possible

### Type Check Commands
- **Type check all**: `turbo run build` - TypeScript compilation checks types
- **Type check single package**: `cd packages/<package> && pnpm build` - Check types for package

## Code Style Guidelines

### Language and Environment
- **TypeScript**: Strict mode disabled (`strict: false`) but with recommended rules
- **Target**: ES2020 modules
- **Module resolution**: Bundler mode
- **Node.js**: >= 18.0.0 required

### Imports and Dependencies
- **Import order**: Group by builtin → external → internal (enforced by ESLint)
- **Import extensions**: Never use extensions for `.ts`/`.tsx` files (ESLint enforced)
- **Workspace imports**: Use `@repo/types`, `@repo/utils` for internal packages
- **No unresolved imports**: All imports must resolve (ESLint error)

### Naming Conventions
- **Variables/Functions**: camelCase
- **Classes/Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case for directories, camelCase for files
- **API Groups**: Normalized using kebab-case with special characters removed

### Code Formatting
- **No Prettier config**: Use default Prettier formatting
- **Line endings**: LF (Unix)
- **Indentation**: 3 spaces (default Prettier)
- **Quotes**: Single quotes preferred (default Prettier)
- **Semicolons**: Required (default Prettier)

### TypeScript Specific
- **Explicit types**: Prefer explicit typing over `any`
- **Avoid `any`**: Warn level ESLint rule for `@typescript-eslint/no-explicit-any`
- **Unused variables**: Warn level ESLint rule
- **Interface vs Type**: Use interfaces for object shapes, types for unions/aliases
- **Generic constraints**: Use extends for generic constraints
- **Optional properties**: Use `?:` for optional properties

### Error Handling
- **Try/catch blocks**: Use for async operations
- **Error messages**: Provide clear, actionable error messages
- **Graceful exits**: Use `withErrorHandler` utility for CLI commands
- **Process signals**: Handle SIGINT/SIGTERM for clean shutdowns
- **Logging**: Use `@clack/prompts` for user-facing messages

### Documentation
- **JSDoc comments**: Required for public APIs and complex functions
- **Example usage**: Include in JSDoc for CLI methods
- **Parameter descriptions**: Document all parameters with types
- **Return types**: Document return values and their structure
- **TODO comments**: Use `// [ ] TODO:` format for future work

### File Organization
- **Barrel exports**: Use `index.ts` files for clean imports
- **Feature grouping**: Group related functionality in feature directories
- **Separation of concerns**: CLI, core logic, types, and utilities in separate packages
- **Implementation files**: Keep business logic separate from CLI interfaces

### Testing
- **Test framework**: Jest with ts-jest transformer
- **Test files**: `.test.ts` extension (currently no test files exist)
- **Test configuration**: JSON-based config files for API testing
- **Test environment**: Node.js environment
- **Coverage**: Use `jest-html-reporter` for HTML coverage reports

### Security
- **Secrets handling**: Never commit API keys or tokens
- **Environment variables**: Use `XANO_*` prefix for test environment variables
- **Token storage**: Secure storage implementation required
- **Input validation**: Validate all user inputs and API responses

### Performance
- **Bundle optimization**: Use esbuild for fast builds
- **Tree shaking**: Enabled through Rollup configuration
- **Lazy loading**: Consider for large features
- **Memory management**: Clean up event listeners and resources

### Git and Version Control
- **Commit messages**: Follow conventional commit format
- **Branching**: Feature branches for development
- **PR reviews**: Required for all changes
- **CI/CD**: Automated testing and building on PRs
- **Versioning**: Changesets for semantic versioning

## IDE and Editor Configuration

### VS Code Extensions (Recommended)
- TypeScript and JavaScript Language Features
- ESLint
- Prettier - Code formatter
- PNPM workspace support

### Cursor Rules
No specific Cursor rules found in `.cursor/` or `.cursorrules`.

### Copilot Instructions
No Copilot instructions found in `.github/copilot-instructions.md`.

---

- See also `docs/README.md` and `docs/commands` for command reference.
- Key configuration in `.changeset/`, `schemas/registry/`, and package-level config files.
