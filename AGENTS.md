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

- See also `docs/README.md` and `docs/commands` for command reference.
- Key configuration in `.changeset/`, `schemas/registry/`, and package-level config files.
