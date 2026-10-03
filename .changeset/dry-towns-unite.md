---
"@calycode/cli": minor
"@calycode/core": patch
---

Deepen the OpenCode subsystem, unify Xano HTTP, and harden the CLI.

The OpenCode command is split into two deep modules — `native-host` (messaging
protocol, runtime, origins) and distribution (version/install/spawn/launch,
artifact install) — with tests at the seams, and the Windows launcher now
resolves `.exe`/`.cmd` shims correctly and repairs `opencode-ai`'s npm-blocked
postinstall instead of shipping a placeholder binary. Core Xano calls route
through a single `metaApiFetch` adapter, context resolution and registry
file-type ordering are unified, and duplicated helpers (dead registry client,
`clearDirectory`, `getSpawnOptions`, boolean-env parsing, schema loading) are
collapsed.

The CLI is also more predictable and easier to use: prompt cancellation and
non-TTY runs are handled, errors no longer print stack traces, `generate repo`
fetches by default, `serve` uses a built-in static server and guards a missing
registry, help shows required vs optional arguments and gains short flags,
`codegen` gets an interactive generator picker, and help/serve banners use a
width-capped note box.
