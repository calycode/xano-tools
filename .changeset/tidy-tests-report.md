---
"@calycode/cli": patch
"@calycode/core": patch
---

`test run` now prints assertion and request error details under the summary table, so a failed run explains itself without opening the results JSON. Explicit test headers also win over the runner's default `X-Data-Source`/`X-Branch` headers, which lets a suite target a real data source.
