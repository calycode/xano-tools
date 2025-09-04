---
"@calycode/caly-core": minor
"@calycode/caly-xano-cli": minor
---

feat: added '@' as a project root indicator to the setup --> allowing now to execute any generative command and still output into the right hierarchy
feat: added project root resolver method
feat: moved the codegen outside of the oas directory
feat: revamped context selection to be smart based on current user directory, this includes a 'missing context prompts' from users. e.g. on root directory someone wants to generate OpenAPI specs, but we don't have the workspace / branch info -> this triggers clack/prompts.
fix: current context finding core method was trying to resolve workspaces from merged config, which only stores modifyable items (e.g. linting and testing rules)
fix: fixed an issue in loadMergedConfig() method returning paths instead of found item names
fix: various context management related fixes
refactor: extracted config resolution method that was reused on all commands