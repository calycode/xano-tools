---
"@calycode/cli": patch
---

Harden the native-host launcher for OpenCode V2.

The generated native-host wrapper no longer pins a floating `latest` version and
lets the CLI default apply. Windows child processes now spawn with
`windowsHide`, and a matching global OpenCode executable is preferred over the
`npx`/`.cmd` shim. Extension IDs already written into a native-host manifest are
merged into the runtime CORS allowlist, so an unpacked dev extension keeps
working after Chrome launches the host without `CALY_OC_INCLUDE_DEV_EXT`. Host
debug logging now defaults on for source/node runs and stays opt-in for packaged
binaries.
