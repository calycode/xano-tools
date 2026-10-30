# CLI performance: rewrite evaluation

**Status:** decision — do not rewrite the CLI in Go or Rust now.
**Date:** 2026-10-30
**Scope:** `@calycode/cli` and the `@calycode/core` work it drives.

## Question

Would rewriting the CLI (or the "underlying system") in Go or Rust produce a meaningfully faster CLI? If not, where should performance work go instead?

## Method

All timings are medians of 30 runs on Windows 11, Node 26.7.0, Rust 1.96.1, Go 1.26.3.
Minimal Rust and Go programs printed the same version string as `caly-xano --version`. Node baselines were measured with `node -e 1`. The CLI was measured both as the published SEA binary (`caly-xano.exe`) and as `node dist/index.cjs`.

The command-tail case used `oc native-host status` — a real action command that touches only local files — and compared wall-clock time against the CLI's own `preAction`/`postAction` timer. The offline case rewrote the PostHog host in a copy of the bundle to `http://127.0.0.1:9` (connection refused).

No Xano credentials were available, so end-to-end network commands were read statically rather than timed.

## Results

### Startup: version printed

| Binary                 | Median  | Delta vs Rust |
| ---------------------- | ------: | ------------: |
| Rust hello             | 10.3 ms |             — |
| Go hello               | 21.3 ms |      +11.0 ms |
| `node -e 1`            | 46.3 ms |      +36.0 ms |
| `caly-xano.exe` (SEA)  | 75.0 ms |      +64.7 ms |
| `node dist/index.cjs`  | 89.9 ms |      +79.6 ms |
| `index.cjs --help`     | 91.4 ms |      +81.1 ms |

The CLI's own JavaScript — module graph, Commander registration, help formatting, PostHog construction — costs roughly **30 ms** on top of bare Node. The 461 KB minified bundle is not the problem; tree shaking already applies.

**So a perfect native rewrite is worth ~65 ms per invocation, and only on the trivial paths.** On Linux and macOS the Node startup penalty is smaller, so the real gap narrows further.

### Command tail: where the wall clock actually goes

Running `oc native-host status`:

| Condition                    | CLI-reported action | Wall clock | Unattributed tail |
| ---------------------------- | ------------------: | ---------: | ----------------: |
| PostHog reachable            |              140 ms |     409 ms |         **269 ms** |
| PostHog unreachable (refused)|              170 ms |   9,660 ms |       **9,490 ms** |

Isolated on the PostHog client alone:

| Measurement                                          |     Time |
| ---------------------------------------------------- | -------: |
| `captureImmediate()` returns (schedules work)        |     1 ms |
| `shutdown()` with the endpoint reachable             |   173 ms |
| `import + capture + shutdown`, process not awaited   | 250–272 ms |
| `shutdown()` with the endpoint refused               |  9,044 ms, then rejection |

`packages/cli/src/program.ts:56-65` calls `captureImmediate()` and `shutdown()` from `postAction` without `await` or `.catch()`. The promise is not awaited, but the HTTP socket keeps the event loop alive, so the process still waits for the flush. When the endpoint is unreachable, the CLI stalls for ~9.5 s after the command has visibly finished; an uncaught shutdown rejection is also possible depending on how the bundler surfaces it.

The CLI's own completion line (`⏱️ Command "…" completed in 0.14s`) measures only the action, so both the tail and the offline stall are invisible in the product's own telemetry.

### Real commands: request orchestration dominates

`generate repo` (`packages/core/src/implementations/build-xanoscript-repo.ts`) performs:

- 16 sequential entity fetches (`SUPPORTED_ENTITIES`), each awaited in order (`:113`);
- 1 sequential API-group listing (`:150`);
- 1 sequential fetch per API group (`:161`).

That is **at least 17 serial round-trips** before writing files, with `per_page: 500` and no pagination — larger workspaces silently truncate. At a modest 100 ms RTT the loop has a **≥1.7 s floor**. At 300 ms WAN latency it is ~5 s of pure waiting.

The OAS path and the testing path use the same shape: resolve context, fetch, transform, write, per item.

No compiler makes 17 sequential network waits faster. Bounded concurrency does.

## What a rewrite would cost

- Re-implement ~7,850 LOC of CLI (Commander-style parsing, `@clack/prompts` interactions, help formatting, static server, tar handling, OpenCode distribution and native-host framing) plus ~5,400 LOC of Core (Xano metadata client, OAS generation, XanoScript processing, registry install, backups).
- Re-implement or fork `@calycode/core`, which is also consumed by `@calycode/browser-consumer` — a browser `ConfigStorage` adapter pins Core to TypeScript unless that package is dropped.
- Rebuild distribution: esbuild → SEA/ncc is already in place; a native binary means a new release matrix and a second implementation of the native-host protocol.
- Keep two implementations in sync while the schema-heavy Xano surface keeps moving.

The measured upside is 65 ms. The cost is a second backend and a second test suite.

## What to do instead

Ordered by measured leverage.

### Phase 0 — instrument the CLI honestly

- Measure wall clock, not just action time. Emit the full process duration, or at least stop reporting an action timer that hides the tail.
- Add a repeatable benchmark script (`scripts/bench-cli.mjs`) for `--version`, `--help`, one local command, and one mocked-network command, so these numbers do not have to be re-derived by hand.

### Phase 1 — bound the telemetry tail (one module)

Target: < 20 ms added to exit, online or offline.

- One telemetry module with a fire-and-forget `record(event)` interface.
- Detach the client (`unref()` sockets, bounded flush, no await on the exit path); never let analytics decide when the prompt returns.
- Catch shutdown rejection; add an explicit opt-out (the `init` notice mentions collection but exposes no switch).
- Expected: 270 ms removed from every action command; 9.5 s offline stall removed.

### Phase 2 — parallelise the artifact fan-out

Target: `generate repo` wall time dominated by one RTT wave, not N.

- Bounded concurrency (3–4) for entity fetches and per-API-group fetches.
- Real pagination instead of `per_page: 500`.
- Per-entity failure policy (fail fast vs partial artifact) made explicit.
- Expected: seconds → sub-second on the fetch phase for typical workspaces.

### Phase 3 — stop resolving context twice

- Route commands through one context resolution and pass the resolved value down; Core should not re-read configs the CLI already resolved.
- Fix `--instance`: `getCurrentContextConfig` currently ignores `context.instance` (`packages/core/src/implementations/get-current-context.ts:73`).
- Expected: removes 5 redundant config reads per run and one class of precedence bugs.

### Phase 4 — revisit, do not rewrite

Only start a native rewrite if one of these becomes true:

- p95 startup exceeds ~250 ms for scripted/agent use, or the CLI runs thousands of times per day in a loop;
- Core no longer needs to run in the browser, so a single-language backend is acceptable;
- Node SEA stops being a viable single-file distribution;
- profiling shows CPU-bound work (not request orchestration) above ~100 ms per command.

Until then, a rewrite front-loads cost and re-implements the same I/O waits.

## Reproduce

```powershell
# startup medians
$f = 'packages/cli/dist/index.cjs'
1..30 | ForEach-Object {
  (Measure-Command { node $f --version *> $null }).TotalMilliseconds
} | Sort-Object | Select-Object -Index 15

# telemetry tail (offline simulation)
(Get-Content $f -Raw).Replace('https://eu.i.posthog.com', 'http://127.0.0.1:9') |
  Set-Content "$env:TEMP/index-offline.cjs"
Measure-Command { node "$env:TEMP/index-offline.cjs" oc native-host status }
```

Note: the offline simulation depends on the literal host string staying present in the bundle. If it moves, point the harness at the telemetry module instead.

## Decision

**No rewrite.** The CLI is ~90 ms on a trivial command and that is not the cost users feel. Fix the ~270 ms telemetry tail and the 17 sequential round-trips in TypeScript first; both are smaller, testable, and address the numbers users actually wait on.
