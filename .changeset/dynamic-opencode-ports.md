---
"@calycode/cli": patch
---

Make OpenCode server ports dynamic and discoverable from the browser extension.

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
