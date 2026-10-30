---
"@calycode/cli": patch
---

Telemetry no longer keeps the CLI process alive: events are handed to a detached sink with a bounded request, telemetry can be disabled with `CALY_TELEMETRY=0` or `DO_NOT_TRACK=1`, and flush failures are swallowed.
