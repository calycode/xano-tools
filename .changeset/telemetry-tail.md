---
"@calycode/cli": patch
---

Telemetry no longer keeps the CLI process alive. Events are spooled to disk and drained by at most one detached flusher, which has a hard five-second deadline, removes its own lock on exit, and never blocks the command that produced the event. Telemetry can be disabled with `CALY_TELEMETRY=0` or `DO_NOT_TRACK=1`, and flush failures are swallowed.
