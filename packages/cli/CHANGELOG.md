# @calycode/xano-cli

## 0.22.0

### Minor Changes

- 2ec2789: Use the OpenCode V2 runtime and authenticate the local server.

  The default runtime is now pinned to OpenCode `2.2.6` and installed from
  `@opencode/cli`; the floating `latest` channel also resolves to V2, while
  explicit V1 versions continue to use `opencode-ai`. The native host now probes
  the V2 `/api/info` endpoint (with `/global/health` as the V1 fallback), generates
  or accepts a server password, starts OpenCode with `OPENCODE_PASSWORD`, and
  returns the password in `starting`/`running`/`status` replies so the extension
  can use HTTP Basic Auth. `oc serve` accepts `--password` and prints the generated
  password alongside the actual URL.

### Patch Changes

- 2ec2789: fix: resolve context through one module, honour `--instance`, and avoid duplicate config reads
- 2ec2789: Remove dead code, deduplicate CLI bootstrapping, and add a type-check gate.

  - Both entry points now share `detectNativeHostLaunch` for native-host argument detection, so `caly-xano` and the bundled binary can no longer drift apart.
  - `registry add` fetches the registry index once and passes it to the component prompt instead of downloading it twice.
  - `ensureGitignore` resolves the working directory at call time instead of freezing it at import.
  - Removed the public `Caly.switchContext` (deprecated) and `Caly.loadInstanceConfig` facade methods, the unused CLI registry URL map, the unused `isEmptySchema`/`isNotEmpty` utilities, and `getStaticCorsOrigins`.
  - Added a `typecheck` script (`tsc --noEmit`) to `@calycode/cli`.

- 2ec2789: Make OpenCode server ports dynamic and discoverable from the browser extension.

  The native host now treats the requested port as a preference, scans `4096-4127`
  when it is busy, and falls back to an OS-assigned ephemeral port. Every
  native-messaging reply includes the real `port`, `url`, `requestedPort`, and
  `autoSelected` fields, and a new `status` message lets the extension recover the
  current port after reconnecting. `oc serve` uses the same fallback and prints the
  actual URL, and `keepAlive` keeps a server running across native host restarts so
  the next host can adopt it instead of starting a second server.

  Native-host cleanup also handles Windows launcher wrappers that exit after
  spawning the real server, uses command-line markers to avoid killing unrelated
  OpenCode processes, and no longer crashes when Chrome closes the native
  messaging pipe after a one-shot reply.

- 2ec2789: Route generated output through one pipeline.

  The five `generate` implementations publish files through one awaited clear ? mkdir ? write pipeline. They, plus backup export/restore, test-result writing and `serve`, resolve output destinations through one helper. Directory clearing is no longer fire-and-forget in the `generate` paths, so writes cannot race a pending clear. Backup export still writes through `core.storage`.

- 2ec2789: Give the downloadable installer a real, self-explanatory UI.

  - Windows now opens one installer window with a step checklist, live progress, a spinner, a "Why this matters" panel for the active step, and a completion panel with next steps. The old stack of MessageBox dialogs is gone.
  - The welcome step is part of that window, with an explicit Install/Cancel choice and a list of exactly what setup will change on the machine.
  - macOS draws a single live block in Terminal (checklist, progress, explanations) instead of a modal dialog per step, and keeps the next steps on screen.
  - Every run writes a setup log (`%LOCALAPPDATA%\CalyCode\logs` / `~/Library/Logs/CalyCode`) with commands, exit codes and output tails; the window links to it.
  - Added timeouts to every child process (`npm`, `winget`, `choco`, `brew`, `caly-xano`), a `caly-xano --version` verification step, and PATH refresh so a fresh install works without restarting.
  - Node.js is no longer installed through a Homebrew bootstrap step that could not answer sudo; macOS uses Homebrew only when it is already installed and otherwise points at nodejs.org.
  - Added `--quiet`, `--version`, `CALYCODE_LANG` and `CALYCODE_LOG_DIR`, plus a text fallback (with a final dialog) when the Windows window cannot open.
  - Added `go test` coverage for the message catalog, command parsing and terminal rendering, and a `go run ./preview` harness for iterating on the window.

- 2ec2789: Harden the native-host launcher for OpenCode V2.

  The generated native-host wrapper no longer pins a floating `latest` version and
  lets the CLI default apply. Windows child processes now spawn with
  `windowsHide`, and a matching global OpenCode executable is preferred over the
  `npx`/`.cmd` shim. Extension IDs already written into a native-host manifest are
  merged into the runtime CORS allowlist, so an unpacked dev extension keeps
  working after Chrome launches the host without `CALY_OC_INCLUDE_DEV_EXT`. Host
  debug logging now defaults on for source-checkout runs and stays opt-in for
  npm-installed and packaged binaries. Native-host state files are created with
  owner-only permissions because they contain the server password and owner token.

- 2ec2789: Telemetry no longer keeps the CLI process alive. Events are spooled to disk and drained by at most one detached flusher, which has a hard five-second deadline, removes its own lock on exit, and never blocks the command that produced the event. Telemetry can be disabled with `CALY_TELEMETRY=0` or `DO_NOT_TRACK=1`, and flush failures are swallowed.

## 0.21.0

### Minor Changes

- 34e6f10: Use the OpenCode V2 runtime and authenticate the local server.

  The default runtime is now pinned to OpenCode `2.2.6` and installed from
  `@opencode/cli`; the floating `latest` channel also resolves to V2, while
  explicit V1 versions continue to use `opencode-ai`. The native host now probes
  the V2 `/api/info` endpoint (with `/global/health` as the V1 fallback), generates
  or accepts a server password, starts OpenCode with `OPENCODE_PASSWORD`, and
  returns the password in `starting`/`running`/`status` replies so the extension
  can use HTTP Basic Auth. `oc serve` accepts `--password` and prints the generated
  password alongside the actual URL.

### Patch Changes

- 34e6f10: fix: resolve context through one module, honour `--instance`, and avoid duplicate config reads
- 34e6f10: Remove dead code, deduplicate CLI bootstrapping, and add a type-check gate.

  - Both entry points now share `detectNativeHostLaunch` for native-host argument detection, so `caly-xano` and the bundled binary can no longer drift apart.
  - `registry add` fetches the registry index once and passes it to the component prompt instead of downloading it twice.
  - `ensureGitignore` resolves the working directory at call time instead of freezing it at import.
  - Removed the public `Caly.switchContext` (deprecated) and `Caly.loadInstanceConfig` facade methods, the unused CLI registry URL map, the unused `isEmptySchema`/`isNotEmpty` utilities, and `getStaticCorsOrigins`.
  - Added a `typecheck` script (`tsc --noEmit`) to `@calycode/cli`.

- 34e6f10: Make OpenCode server ports dynamic and discoverable from the browser extension.

  The native host now treats the requested port as a preference, scans `4096-4127`
  when it is busy, and falls back to an OS-assigned ephemeral port. Every
  native-messaging reply includes the real `port`, `url`, `requestedPort`, and
  `autoSelected` fields, and a new `status` message lets the extension recover the
  current port after reconnecting. `oc serve` uses the same fallback and prints the
  actual URL, and `keepAlive` keeps a server running across native host restarts so
  the next host can adopt it instead of starting a second server.

  Native-host cleanup also handles Windows launcher wrappers that exit after
  spawning the real server, uses command-line markers to avoid killing unrelated
  OpenCode processes, and no longer crashes when Chrome closes the native
  messaging pipe after a one-shot reply.

- 34e6f10: Route generated output through one pipeline.

  The five `generate` implementations publish files through one awaited clear ? mkdir ? write pipeline. They, plus backup export/restore, test-result writing and `serve`, resolve output destinations through one helper. Directory clearing is no longer fire-and-forget in the `generate` paths, so writes cannot race a pending clear. Backup export still writes through `core.storage`.

- 34e6f10: Harden the native-host launcher for OpenCode V2.

  The generated native-host wrapper no longer pins a floating `latest` version and
  lets the CLI default apply. Windows child processes now spawn with
  `windowsHide`, and a matching global OpenCode executable is preferred over the
  `npx`/`.cmd` shim. Extension IDs already written into a native-host manifest are
  merged into the runtime CORS allowlist, so an unpacked dev extension keeps
  working after Chrome launches the host without `CALY_OC_INCLUDE_DEV_EXT`. Host
  debug logging now defaults on for source-checkout runs and stays opt-in for
  npm-installed and packaged binaries. Native-host state files are created with
  owner-only permissions because they contain the server password and owner token.

- 34e6f10: Telemetry no longer keeps the CLI process alive. Events are spooled to disk and drained by at most one detached flusher, which has a hard five-second deadline, removes its own lock on exit, and never blocks the command that produced the event. Telemetry can be disabled with `CALY_TELEMETRY=0` or `DO_NOT_TRACK=1`, and flush failures are swallowed.

## 0.20.0

### Minor Changes

- 34fac1c: Add a static documentation site for the CLI.

  `pnpm build:docs:static` pre-renders the docsify markdown into complete HTML pages with an in-page search index, a theme-aware shell, sidebar, and landing page, then deploys them to cli.calycode.com. The renderer converts legacy docsify `> [!NOTE]` callouts into `{% alert %}` blocks and restores `<details>` disclosures, and the sidebar rail, section headings, external links, and scrollbars all follow the theme. On localhost the pages additionally mount an Agentation toolbar for in-context UI feedback.

- e03c632: Deepen the OpenCode subsystem, unify Xano HTTP, and harden the CLI.

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

### Patch Changes

- caf6514: chore: remove the legacy 'xano' command handling completely to avoid collisions with xano cli

## 0.19.2

### Patch Changes

- 68b26e9: fix: adjusted the native host process cleanup

## 0.19.1

### Patch Changes

- 9321db1: chore: improve native host starting behaviour for more reliable process termination
- 9321db1: chore: update go to 1.26

## 0.19.0

### Minor Changes

- c49af1f: refactor: fixed several inconsistencies with the native host implementation
- c49af1f: feat: downloadable bootstrapper for the cli for windows and mac os

### Patch Changes

- c49af1f: refactor: adjusted extension id discovery

## 0.18.5

### Patch Changes

- 15e83a0: fix: improve native host setup reliability

## 0.18.4

### Patch Changes

- 29e4a1e: chore: Improved OpenCode native host stability and setup across Chromium browsers.

  - Added safer OpenCode version control with a pinned default and optional override.
  - Improved native host setup and extension discovery behavior for Chromium-based browsers.
  - Added support for passing OpenCode version from native host message payloads.

## 0.18.3

### Patch Changes

- 27c2aeb: chore: refactor the oc launcher cli command
- 27c2aeb: chore: handle directory picking of the oc commands

## 0.18.2

### Patch Changes

- ef26cf1: chore: dep cleanup + release workflow adjustments

## 0.18.1

### Patch Changes

- dab4103: Scope OpenCode server and native-host child processes to a dedicated CalyCode workspace directory while preserving project-relative cwd for direct CLI proxy usage.

## 0.18.0

### Minor Changes

- 91d81cf: refactor: **BREAKING CHANGE** rename CLI command from `xano` to `caly-xano`; update scripts, CI, and docs to use `caly-xano`

## 0.17.0

### Minor Changes

- 190bf88: feat: include OpenCode AI agentic tooling into the CLI
- 697ba8c: feat: initial skills setup for the @calycode/cli
- 63d93ac: feat: load specialized Xano-related agents / templates from remote source to the oc config and use that, without polluting the global oc setup

### Patch Changes

- 545b85b: chore: move the registry item installation into the core
- 63d93ac: chore: styling revamp of the help commands
- 3383c84: chore: updates to testing, to have robust env support, and better documentation
- 545b85b: fix: have graceful exit when no component is selected from registry
- 190bf88: feat: add first draft of Skills for the CLI

## 0.16.0

### Minor Changes

- 3db8259: fix: **BREAKING CHANGE** fixing a breaking change in the Xano Metadata API for the workspace/{workspace_id}/export-schema endpoint causing the repo and internal docs generator commands to fail

## 0.15.0

### Minor Changes

- db93d85: chore: by default do not generate table schemas into the OAS spec, but allow that via flag

### Patch Changes

- d9da43b: chore: extract the tags from the paths to the global to comply better with OAS
  chore: set maxLength to strings on the error codes (owasp:api4:2019-string-limit)
  chore: set type to strings (owasp:api4:2019-string-restricted)

## 0.14.0

### Minor Changes

- 6260409: fix: fixes for test runner, improved test-config-schema, including warning count in the test summary output.

### Patch Changes

- 7fc75d2: chore: cleanup registry schema, unify casing, adjust schema for future

## 0.13.2

### Patch Changes

- 37886c4: fix: issue with init command in non-interactive environment

## 0.13.1

### Patch Changes

- 2b149ca: fix: issue with init command in non-interactive environment

## 0.13.0

### Minor Changes

- e16f667: feat: processing js and json testconfig files as well to allow advanced asserts

### Patch Changes

- be43c27: fix: minor fixes for the internal documentation generation

## 0.12.1

### Patch Changes

- da63b16: chore: help command styling for easy skimming

## 0.12.0

### Minor Changes

- c6e6c56: > BREAKING changes

  > Commands have been completely renamed and restructured.

  refactor: breaking changes in commands naming
  refactor: reorganised command registration
  chore: updated documentation generation to match new command naming
  chore: removed unused exports
  fix: fixed package.json reference in commander config to present correct version code

## 0.11.0

### Minor Changes

- 6aa0425: chore: adjusted install order to improve installability,
  chore: refactors for registry,
  feat: added skipped components output
  feat: registry improvements - added support for full-set of metadata api enabled entities,

## 0.10.1

### Patch Changes

- 307aafe: chore: refactor of codegeneration command, allow variadic argument to passthrough all additional args for both orval and openapi-tools-generator

## 0.10.0

### Minor Changes

- 2d31bbf: feat: initial version of orval client code generation

### Patch Changes

- 2d31bbf: chore: added sidebar collapsing on the documentation sites.

## 0.9.0

### Minor Changes

- 1cd2eba: feat: new command `generate-internal-docs` that creates a directory of docsfiy powered browseable documentation for your workspace rendered from markdown on client (Docsify)
  chore: update docs to include the new command

### Patch Changes

- 0da67cb: chore: remove tailwind cdn from docs [#131](https://github.com/calycode/xano-tools/issues/131)
- 1cd2eba: fix: fixing multiple issues with the generated markdown of the workspace, that was causing broken links

## 0.8.0

### Minor Changes

- 63e04b2: feat: include mcp_server, addon, agent, middleware in the workspace xs export
- a949bf7: chore: add query VERBS into xanoscript generation, to avoid overrides
  chore: cleanup of repo directory structure generation, added notes to the function
  feat: integrating xanoscript into repo-generation

## 0.7.7

### Patch Changes

- bc0d509: fix: fixing default registry item .xs function to match new syntax
- bc0d509: fix: several fixes for the registry related command, updated scaffolded registry directory structure, fixed url processing from env, fixed multiple issues with adding items to the remote Xano instance
- bc0d509: chore: added test-config.schema, now it's easier to actually know what a test config should look like
- bc0d509: chore: updated the output of the registry-add command for better readibility and to expose the errors that Xano returns --> thus allowing actually remote linting of .xs files as well

## 0.7.6

### Patch Changes

- 574beeb: chore: updating and expanding on the documentation of each command
- 574beeb: feat: including xanoscript in the main repository generation (tables, functions, apis)

## 0.7.5

### Patch Changes

- 08e491c: fix: fixing xanoscript generation command, by including the `include_xanoscript` in the metadata api request
- 08e491c: chore: set the initial value on the backup wizard to false to prevent accidential backup execution
- 08e491c: fix: fixing some aspects of the test runner that were causing failing jobs, wrong dynamic data population and header setting

## 0.7.4

### Patch Changes

- 12bd8cf: fix: fixing issues with backup restoration
  chore: added warning to the backup restoration command.

## 0.7.3

### Patch Changes

- 2925959: chore: adjusting publishConfig to be public

## 0.7.2

### Patch Changes

- a10185b: chore: added context7 config, fixed doc generation script, added copy docs button

## 0.7.1

### Patch Changes

- 0c864d9: chore: added remote cache with turborepo to the workflows
  chore: setting up unit-testing structure
  chore: unified docs styling to match the rest of the websites... (still needs some work on accessibility)
  chore: updated docs, added discord link, cleaned up wrong naming conventions
  fix: fixing an issue where the json repo generation resulted in duplicate 'api group folders'
  refactor: cleaned up a remainder console.log, changed imports to use the barrel exports from the cli/utils

## 0.7.0

### Minor Changes

- 40a0daa: feat: Posthog integration and basic telemetry collection

## 0.6.1

### Patch Changes

- 86c39a6: feat: improvements to the documentation generation, added changelog links, full-text search, pagination plugin, terminaly plugin, flexible callouts plugin, dark mode support and mermaid support plugins
  refactor: rearranged the repo to be more like a proper turbo powered monorepo. Build times are much faster as before...
  refactor: adjustments to the github workflows to match turborepo (without remote cache)

## 0.6.0

### Minor Changes

- cee20fc: feat: adding graceful, simple exit handling
  feat: fixing and wrapping up backup exporting command
  fix: registry file type .xano -> .xs
  refactor: marked types, utils, core as devDeps as they are all bundled at build --> reduce deps
  refactor: minor cleanup, removal of context-switching command, registry schema links fixed

## 0.5.0

### Minor Changes

- 0f463ea: feat: fixing and wrapping up backup exporting command

### Patch Changes

- Updated dependencies [0f463ea]
  - @calycode/types@0.3.0
  - @calycode/utils@0.3.0
  - @calycode/core@0.5.0

## 0.4.4

### Patch Changes

- 1fec1a5: refactor: minor cleanup, removal of the linting command..
  fix: make backup to be stream, to allow bigger workspaces
  refactor: cleanup of fs / path imports in the cli
- Updated dependencies [1fec1a5]
  - @calycode/types@0.2.3
  - @calycode/utils@0.2.4
  - @calycode/core@0.4.4

## 0.4.3

### Patch Changes

- af3ad93: feat: added getStartDir() method to the ConfigStorage interface. Goal is to allow platform agnosticity in the context resolution.
  fix: fixing an issue where xanoscript generation would fail due to missing context
  fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...
- Updated dependencies [af3ad93]
  - @calycode/types@0.2.2
  - @calycode/utils@0.2.3
  - @calycode/core@0.4.3

## 0.4.2

### Patch Changes

- 0df5340: fix: fixing package.json for package publishing, not building packages in the github action resulted with non-existent dist directory...
- Updated dependencies [0df5340]
  - @calycode/types@0.2.1
  - @calycode/utils@0.2.2
  - @calycode/core@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [99d0ff0]
  - @calycode/utils@0.2.1
  - @calycode/core@0.4.1

## 0.4.0

### Minor Changes

- 0342c6f: docs: integrated docsify.js to auto-generate documentation site from command signatures.
  feat: added GCP uploader actions to the release to automatically update the docs on new release from the command signature
  feat: added more descriptive and styled mardkown as docs that are generated from command signatures
  refactor: rebrand actually, renamed the core package from caly-core to core and the command from caly-xano to simply xano

### Patch Changes

- Updated dependencies [0342c6f]
  - @calycode/core@0.4.0

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

### Patch Changes

- Updated dependencies [d89534c]
  - @calycode/caly-core@0.3.0

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
