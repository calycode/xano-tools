# @calycode/types

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

## 0.1.2

### Patch Changes

- f232d42: docs: updated command related docs
  feat: extending test configuration to support custom asserts
  fix: added default 'test' datasource and the current context as branch headers
  fix: fixed initial setup default asserts setup
  fix: fixes in references of asserts context
  fix: moved from the URL constructor as it was removing the Xano's api:apiGroupCanonicalName part of the paths, thus breaking any testing option
  maintenance: added proper type declarations to the tests

## 0.1.1

### Patch Changes

- a604fc3: feat: extract test command to the core, to allow test running based on simple config json
