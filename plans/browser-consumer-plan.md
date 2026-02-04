# Browser Consumer Package Plan

## Overview
Create a new package `@calycode/browser-consumer` that provides a browser-compatible implementation of the `ConfigStorage` interface using IndexedDB for storage. This package will serve as a wrapper around `@calycode/core` and demonstrate how to use the core library in a browser environment, specifically for Chrome extensions.

## Goals
- Implement all `ConfigStorage` methods using IndexedDB
- Maintain compatibility with the core library API
- Provide a reference implementation for browser-based consumers
- Ensure the package works in Chrome extension context

## Package Structure
```
packages/browser-consumer/
├── src/
│   ├── index.ts                 # Main exports
│   ├── browser-config-storage.ts # ConfigStorage implementation
│   └── indexeddb-utils.ts       # IndexedDB helper functions
├── package.json
├── tsconfig.json
├── README.md
└── jest.config.js
```

## Implementation Phases

### Phase 1: Package Setup
1. Create `packages/browser-consumer/` directory
2. Initialize `package.json` with proper dependencies (idb for IndexedDB, core as workspace dep)
3. Set up `tsconfig.json` following monorepo conventions
4. Configure build scripts and Jest for testing
5. Add package to `pnpm-workspace.yaml` and `turbo.json`

**Verification:** Package builds successfully with `pnpm build`

### Phase 2: IndexedDB Infrastructure ✅
1. Create `indexeddb-utils.ts` with database initialization
2. Define object stores for:
   - `global-config` (single entry)
   - `instances` (keyed by instance name)
   - `tokens` (keyed by instance name)
   - `files` (keyed by file path for file operations)
3. Implement basic CRUD operations for each store
4. Add error handling and migration support

**Verification:** IndexedDB operations work in browser environment

### Phase 3: Core ConfigStorage Methods ✅
Implement the following methods adapting filesystem logic to IndexedDB:

1. `ensureDirs()` - No-op or ensure DB exists
2. `loadGlobalConfig()` - Retrieve from `global-config` store
3. `saveGlobalConfig()` - Store in `global-config` store
4. `loadInstanceConfig(instance)` - Retrieve specific instance from `instances` store
5. `saveInstanceConfig(projectRoot, config)` - Store instance config (use instance name as key)
6. `loadToken(instance)` - Retrieve token from `tokens` store
7. `saveToken(instance, token)` - Store token in `tokens` store

**Verification:** Basic config operations work correctly

### Phase 4: Advanced Config Methods ✅
1. `loadMergedConfig(startDir, configFiles)` - Adapt directory walking to instance/workspace/branch config merging
   - Since no directories, treat `startDir` as instance identifier
   - Merge configs based on provided config files array
2. `getStartDir()` - Return empty string or browser-appropriate value

**Verification:** Config merging logic works without filesystem dependencies

### Phase 5: File System Operations ✅
Adapt file operations to IndexedDB:

1. `mkdir(path, options)` - No-op or track virtual directories
2. `readdir(path)` - List files under virtual path prefix
3. `writeFile(path, data)` - Store file content in `files` store
4. `readFile(path)` - Retrieve file content from `files` store
5. `exists(path)` - Check if file exists in `files` store
6. `streamToFile(path, stream)` - Convert stream to Uint8Array and store

**Verification:** File CRUD operations work via IndexedDB

### Phase 6: Tar Operations ✅
1. Replace Node.js `tar` module with browser-compatible tar library (e.g., `js-untar`)
2. Implement `tarExtract(tarGzBuffer)` to extract and store files in IndexedDB
3. Handle compression/decompression in browser environment

**Verification:** Tar extraction works and files are stored correctly

### Phase 7: Integration and Testing ✅
1. Create main export in `index.ts` exporting `browserConfigStorage: ConfigStorage`
2. Add comprehensive tests for all methods (tests added, require browser environment for IndexedDB)
3. Test integration with `@calycode/core` (interface compatible)
4. Add example usage documentation

**Verification:** Package passes all tests and integrates with core

### Phase 8: Chrome Extension Considerations ✅
1. Ensure IndexedDB operations work in extension background/content scripts
2. Add manifest.json compatibility notes
3. Test in extension environment if possible

**Verification:** Basic functionality works in extension context

## Dependencies
- `@calycode/core`: workspace:*
- `@repo/types`: workspace:*
- `idb`: For IndexedDB wrapper
- `js-untar`: For tar extraction
- `jest`: For testing

## Build and Publish
- Build with TurboRepo
- Not published to npm (internal example package)
- Include in monorepo CI/CD

## Risk Mitigation
- IndexedDB has storage limits - document limitations
- Browser compatibility - target modern browsers
- Error handling for storage quota exceeded
- Fallback strategies for failed operations

## Success Criteria
- All `ConfigStorage` methods implemented
- Package builds and tests pass
- Can instantiate `Caly` with `browserConfigStorage`
- Works in Chrome extension environment
- Provides clear example for browser usage