# @calycode/caly-xano-cli

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
