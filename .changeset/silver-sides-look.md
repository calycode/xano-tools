---
'@calycode/types': patch
'@calycode/utils': patch
'@calycode/caly-core': patch
---

docs: updated command related docs
feat: extending test configuration to support custom asserts
fix: added default 'test' datasource and the current context as branch headers
fix: fixed initial setup default asserts setup
fix: fixes in references of asserts context
fix: moved from the URL constructor as it was removing the Xano's api:apiGroupCanonicalName part of the paths, thus breaking any testing option
maintenance: added proper type declarations to the tests
