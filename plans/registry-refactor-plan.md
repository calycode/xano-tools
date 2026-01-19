# Registry Refactor Plan: Moving from CLI to Core

## Overview
This plan outlines the redesign and refactoring of the registry functionality to move it from the CLI package to the core package. The primary goal is to enable reuse in a Chrome extension environment while maintaining backward compatibility. Focus is on adding registry items (not scaffolding, which remains CLI-only).

## Current State Summary
- Registry logic is in `packages/cli/src/commands/registry/` and `packages/cli/src/utils/feature-focused/registry/`.
- Supports filesystem-based registries with external file hosting.
- CLI commands: `registry add` and `registry scaffold`.
- No registry features in core yet.

## Proposed Redesign: Hybrid Content/File Support
- **Hybrid Approach**: Registry items can specify either `files` (array of paths for external files) or `content` (inline string for embedded files).
- Benefits: Backward compatibility with existing registries, self-contained for small components, ideal for Chrome extension.
- Schema Change: Add optional `content` field to registry item files.

## Refactor Plan: Moving Registry to Core

### Phase 1: Setup and Preparation
- [ ] Create `packages/core/src/features/registry/` directory structure.
- [ ] Update `packages/core/src/index.ts` to export new registry functions.
- [ ] Review and update registry types in `@repo/types` to support `content` field.

### Phase 2: Move Core-Agnostic Functions to Core
- [ ] Move `fetchRegistry`, `getRegistryIndex`, `getRegistryItem`, `fetchRegistryFileContent` from CLI utils to `packages/core/src/features/registry/api/`.
- [ ] Move `sortFilesByType`, `getApiGroupByName` to `packages/core/src/features/registry/general/`.
- [ ] Adapt functions for platform agnosticism (remove Node fs, make HTTP fetching generic).
- [ ] Modify `fetchRegistryFileContent` to prioritize `content` over file paths.

### Phase 3: Refactor CLI to Use Core
- [ ] Update `packages/cli/src/commands/registry/implementation/registry.ts` to import from `@calycode/core` instead of local utils.
- [ ] Remove or deprecate `packages/cli/src/utils/feature-focused/registry/` (except scaffold).
- [ ] Keep `scaffoldRegistry` in CLI utils for filesystem operations.
- [ ] Adjust `addToXano` and `installComponentToXano` to handle hybrid content/file logic via core.

### Phase 4: Update Schemas and Documentation
- [ ] Modify registry JSON schemas in `schemas/registry/` to include optional `content` field.
- [ ] Update CLI command docs in `docs/commands` and README to reflect changes.
- [ ] Add JSDoc comments to new core functions.

### Phase 5: Testing and Validation
- [ ] Add unit tests for core registry functions in `packages/core/src/features/registry/`.
- [ ] Run full test suite (`pnpm test`) and lint (`pnpm lint`).
- [ ] Validate in Chrome extension context (mock environment if needed).
- [ ] Test backward compatibility with existing registries.

### Phase 6: Cleanup and Release
- [ ] Remove deprecated CLI utils after verification.
- [ ] Update package dependencies if needed.
- [ ] Create changelog entry for the refactor.

## Risk Assessment
- Low risk: Logic is modular, minimal breaking changes with hybrid approach.
- Potential issues: Chrome extension fetch limitations (use polyfills if needed).
- Fallback: Revert to CLI-only if core integration fails.

## Questions Answered
- Hybrid approach selected for flexibility.
- Scaffolding stays in CLI only.
- No specific Chrome extension constraints mentioned yet.
- No registry URL/versioning changes needed initially.