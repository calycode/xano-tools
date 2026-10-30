---
"@calycode/cli": patch
---

Route generated output through a single artifact pipeline.

The five `generate` implementations, backup export/restore, test-result writing and `serve` now resolve output destinations through one helper and publish files through one awaited clear → mkdir → write pipeline. Directory clearing is no longer fire-and-forget, so writes cannot race a pending clear.
