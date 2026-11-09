---
"@calycode/cli": patch
"@calycode/core": minor
---

Remove dead code, deduplicate CLI bootstrapping, and add a type-check gate.

- Both entry points now share `detectNativeHostLaunch` for native-host argument detection, so `caly-xano` and the bundled binary can no longer drift apart.
- `registry add` fetches the registry index once and passes it to the component prompt instead of downloading it twice.
- `ensureGitignore` resolves the working directory at call time instead of freezing it at import.
- Removed the public `Caly.switchContext` (deprecated) and `Caly.loadInstanceConfig` facade methods, the unused CLI registry URL map, the unused `isEmptySchema`/`isNotEmpty` utilities, and `getStaticCorsOrigins`.
- Added a `typecheck` script (`tsc --noEmit`) to `@calycode/cli`.
