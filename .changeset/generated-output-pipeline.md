---
"@calycode/cli": patch
---

Route generated output through one pipeline.

The five `generate` implementations publish files through one awaited clear ? mkdir ? write pipeline. They, plus backup export/restore, test-result writing and `serve`, resolve output destinations through one helper. Directory clearing is no longer fire-and-forget in the `generate` paths, so writes cannot race a pending clear. Backup export still writes through `core.storage`.
