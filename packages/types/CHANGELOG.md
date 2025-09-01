# @calycode/types

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
