---
"@calycode/types": patch
"@calycode/utils": patch
"@calycode/core": patch
"@calycode/cli": patch
---

feat: added getStartDir() method to the ConfigStorage interface. Goal is to allow platform agnosticity in the context resolution.
fix: fixing an issue where xanoscript generation would fail due to missing context
fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...