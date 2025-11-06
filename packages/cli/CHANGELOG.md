# @calycode/xano-cli

## 0.9.0

### Minor Changes

- 1cd2eba: feat: new command `generate-internal-docs` that creates a directory of docsfiy powered browseable documentation for your workspace rendered from markdown on client (Docsify)
  chore: update docs to include the new command

### Patch Changes

- 0da67cb: chore: remove tailwind cdn from docs [#131](https://github.com/calycode/xano-tools/issues/131)
- 1cd2eba: fix: fixing multiple issues with the generated markdown of the workspace, that was causing broken links

## 0.8.0

### Minor Changes

- 63e04b2: feat: include mcp_server, addon, agent, middleware in the workspace xs export
- a949bf7: chore: add query VERBS into xanoscript generation, to avoid overrides
  chore: cleanup of repo directory structure generation, added notes to the function
  feat: integrating xanoscript into repo-generation

## 0.7.7

### Patch Changes

- bc0d509: fix: fixing default registry item .xs function to match new syntax
- bc0d509: fix: several fixes for the registry related command, updated scaffolded registry directory structure, fixed url processing from env, fixed multiple issues with adding items to the remote Xano instance
- bc0d509: chore: added test-config.schema, now it's easier to actually know what a test config should look like
- bc0d509: chore: updated the output of the registry-add command for better readibility and to expose the errors that Xano returns --> thus allowing actually remote linting of .xs files as well

## 0.7.6

### Patch Changes

- 574beeb: chore: updating and expanding on the documentation of each command
- 574beeb: feat: including xanoscript in the main repository generation (tables, functions, apis)

## 0.7.5

### Patch Changes

- 08e491c: fix: fixing xanoscript generation command, by including the `include_xanoscript` in the metadata api request
- 08e491c: chore: set the initial value on the backup wizard to false to prevent accidential backup execution
- 08e491c: fix: fixing some aspects of the test runner that were causing failing jobs, wrong dynamic data population and header setting

## 0.7.4

### Patch Changes

- 12bd8cf: fix: fixing issues with backup restoration
  chore: added warning to the backup restoration command.

## 0.7.3

### Patch Changes

- 2925959: chore: adjusting publishConfig to be public

## 0.7.2

### Patch Changes

- a10185b: chore: added context7 config, fixed doc generation script, added copy docs button

## 0.7.1

### Patch Changes

- 0c864d9: chore: added remote cache with turborepo to the workflows
  chore: setting up unit-testing structure
  chore: unified docs styling to match the rest of the websites... (still needs some work on accessibility)
  chore: updated docs, added discord link, cleaned up wrong naming conventions
  fix: fixing an issue where the json repo generation resulted in duplicate 'api group folders'
  refactor: cleaned up a remainder console.log, changed imports to use the barrel exports from the cli/utils

## 0.7.0

### Minor Changes

- 40a0daa: feat: Posthog integration and basic telemetry collection

## 0.6.1

### Patch Changes

- 86c39a6: feat: improvements to the documentation generation, added changelog links, full-text search, pagination plugin, terminaly plugin, flexible callouts plugin, dark mode support and mermaid support plugins
  refactor: rearranged the repo to be more like a proper turbo powered monorepo. Build times are much faster as before...
  refactor: adjustments to the github workflows to match turborepo (without remote cache)

## 0.6.0

### Minor Changes

- cee20fc: feat: adding graceful, simple exit handling
  feat: fixing and wrapping up backup exporting command
  fix: registry file type .xano -> .xs
  refactor: marked types, utils, core as devDeps as they are all bundled at build --> reduce deps
  refactor: minor cleanup, removal of context-switching command, registry schema links fixed

## 0.5.0

### Minor Changes

- 0f463ea: feat: fixing and wrapping up backup exporting command

### Patch Changes

- Updated dependencies [0f463ea]
  - @calycode/types@0.3.0
  - @calycode/utils@0.3.0
  - @calycode/core@0.5.0

## 0.4.4

### Patch Changes

- 1fec1a5: refactor: minor cleanup, removal of the linting command..
  fix: make backup to be stream, to allow bigger workspaces
  refactor: cleanup of fs / path imports in the cli
- Updated dependencies [1fec1a5]
  - @calycode/types@0.2.3
  - @calycode/utils@0.2.4
  - @calycode/core@0.4.4

## 0.4.3

### Patch Changes

- af3ad93: feat: added getStartDir() method to the ConfigStorage interface. Goal is to allow platform agnosticity in the context resolution.
  fix: fixing an issue where xanoscript generation would fail due to missing context
  fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...
- Updated dependencies [af3ad93]
  - @calycode/types@0.2.2
  - @calycode/utils@0.2.3
  - @calycode/core@0.4.3

## 0.4.2

### Patch Changes

- 0df5340: fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...
- Updated dependencies [0df5340]
  - @calycode/types@0.2.1
  - @calycode/utils@0.2.2
  - @calycode/core@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [99d0ff0]
  - @calycode/utils@0.2.1
  - @calycode/core@0.4.1

## 0.4.0

### Minor Changes

- 0342c6f: docs: integrated docsify.js to auto-generate documentation site from command signatures.
  feat: added GCP uploader actions to the release to automatically update the docs on new release from the command signature
  feat: added more descriptive and styled mardkown as docs that are generated from command signatures
  refactor: rebrand actually, renamed the core package from caly-core to core and the command from caly-xano to simply xano

### Patch Changes

- Updated dependencies [0342c6f]
  - @calycode/core@0.4.0

## 0.3.0

### Minor Changes

- d89534c: feat: added '@' as a project root indicator to the setup --> allowing now to execute any generative command and still output into the right hierarchy
  feat: added project root resolver method
  feat: moved the codegen outside of the oas directory
  feat: revamped context selection to be smart based on current user directory, this includes a 'missing context prompts' from users. e.g. on root directory someone wants to generate OpenAPI specs, but we don't have the workspace / branch info -> this triggers clack/prompts.
  fix: current context finding core method was trying to resolve workspaces from merged config, which only stores modifyable items (e.g. linting and testing rules)
  fix: fixed an issue in loadMergedConfig() method returning paths instead of found item names
  fix: various context management related fixes
  refactor: extracted config resolution method that was reused on all commands

### Patch Changes

- Updated dependencies [d89534c]
  - @calycode/caly-core@0.3.0

## 0.2.0

### Minor Changes

- efa321b: feat: added path and directory input to setup
  feat: at setup scaffold the whole directory instance > workspaces > branches with individual config files
  feat: config walker and merger method to generate the context based on current directory of the terminal
  feat: guardrail filesystem by default creating new directory
  fix: adjusted the dynamic paths in setup process
  fix: registry-scaffolding now doesn't require instance config
  fix: renamed repo -> src when generating workspace schema
  ===
- efa321b: feat: adding local config for smoother context resolution
  feat: adjusted default instance configuration

### Patch Changes

- 1320be6: fix: fixed test feature issues with runtime value persistence
  maintenance: added author and licence to the package.json
  ===
- Updated dependencies [efa321b]
- Updated dependencies [efa321b]
- Updated dependencies [1320be6]
  - @calycode/types@0.2.0
  - @calycode/utils@0.2.0
  - @calycode/caly-core@0.2.0

## 0.1.3

### Patch Changes

- Updated dependencies [f232d42]
  - @calycode/types@0.1.2
  - @calycode/utils@0.1.2
  - @calycode/caly-core@0.1.2

## 0.1.2

### Patch Changes

- 3850789: fix: for generate-code command to properly return the output path for CI/CD
  maintenance: added changesets github action for release automation
  refactor: adjustments to the registry command
- a604fc3: feat: extract test command to the core, to allow test running based on simple config json
- Updated dependencies [a604fc3]
  - @calycode/types@0.1.1
  - @calycode/caly-core@0.1.1
  - @calycode/utils@0.1.1
