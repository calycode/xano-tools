# @calycode/caly-core

## 0.4.1

### Patch Changes

- Updated dependencies [99d0ff0]
  - @calycode/utils@0.2.1

## 0.4.0

### Minor Changes

- 0342c6f: docs: integrated docsify.js to auto-generate documentation site from command signatures.
  feat: added GCP uploader actions to the release to automatically update the docs on new release from the command signature
  feat: added more descriptive and styled mardkown as docs that are generated from command signatures
  refactor: rebrand actually, renamed the core package from caly-core to core and the command from caly-xano to simply xano

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

## 0.1.2

### Patch Changes

- f232d42: docs: updated command related docs
  feat: extending test configuration to support custom asserts
  fix: added default 'test' datasource and the current context as branch headers
  fix: fixed initial setup default asserts setup
  fix: fixes in references of asserts context
  fix: moved from the URL constructor as it was removing the Xano's api:apiGroupCanonicalName part of the paths, thus breaking any testing option
  maintenance: added proper type declarations to the tests
- Updated dependencies [f232d42]
  - @calycode/types@0.1.2
  - @calycode/utils@0.1.2

## 0.1.1

### Patch Changes

- a604fc3: feat: extract test command to the core, to allow test running based on simple config json
- Updated dependencies [a604fc3]
  - @calycode/types@0.1.1
  - @calycode/utils@0.1.1
