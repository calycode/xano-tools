# @calycode/utils

## 0.4.0

### Minor Changes

- cee20fc: feat: adding graceful, simple exit handling
  feat: fixing and wrapping up backup exporting command
  fix: registry file type .xano -> .xs
  refactor: marked types, utils, core as devDeps as they are all bundled at build --> reduce deps
  refactor: minor cleanup, removal of context-switching command, registry schema links fixed

### Patch Changes

- Updated dependencies [cee20fc]
  - @calycode/types@0.4.0

## 0.3.0

### Minor Changes

- 0f463ea: feat: fixing and wrapping up backup exporting command

### Patch Changes

- Updated dependencies [0f463ea]
  - @calycode/types@0.3.0

## 0.2.4

### Patch Changes

- 1fec1a5: refactor: minor cleanup, removal of the linting command..
  fix: make backup to be stream, to allow bigger workspaces
  refactor: cleanup of fs / path imports in the cli
- Updated dependencies [1fec1a5]
  - @calycode/types@0.2.3

## 0.2.3

### Patch Changes

- af3ad93: feat: added getStartDir() method to the ConfigStorage interface. Goal is to allow platform agnosticity in the context resolution.
  fix: fixing an issue where xanoscript generation would fail due to missing context
  fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...
- Updated dependencies [af3ad93]
  - @calycode/types@0.2.2

## 0.2.2

### Patch Changes

- 0df5340: fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...
- Updated dependencies [0df5340]
  - @calycode/types@0.2.1

## 0.2.1

### Patch Changes

- 99d0ff0: fix: release of docs

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

## 0.1.1

### Patch Changes

- Updated dependencies [a604fc3]
  - @calycode/types@0.1.1
