---
"@calycode/cli": minor
---

Use the OpenCode V2 runtime and authenticate the local server.

The default runtime is now pinned to OpenCode `2.2.6` and installed from
`@opencode/cli`; the floating `latest` channel also resolves to V2, while
explicit V1 versions continue to use `opencode-ai`. The native host now probes
the V2 `/api/info` endpoint (with `/global/health` as the V1 fallback), generates
or accepts a server password, starts OpenCode with `OPENCODE_PASSWORD`, and
returns the password in `starting`/`running`/`status` replies so the extension
can use HTTP Basic Auth. `oc serve` accepts `--password` and prints the generated
password alongside the actual URL.
