---
"@calycode/cli": patch
---

Give the downloadable installer a real, self-explanatory UI.

- Windows now opens one installer window with a step checklist, live progress, a spinner, a "Why this matters" panel for the active step, and a completion panel with next steps. The old stack of MessageBox dialogs is gone.
- The welcome step is part of that window, with an explicit Install/Cancel choice and a list of exactly what setup will change on the machine.
- macOS draws a single live block in Terminal (checklist, progress, explanations) instead of a modal dialog per step, and keeps the next steps on screen.
- Every run writes a setup log (`%LOCALAPPDATA%\CalyCode\logs` / `~/Library/Logs/CalyCode`) with commands, exit codes and output tails; the window links to it.
- Added timeouts to every child process (`npm`, `winget`, `choco`, `brew`, `caly-xano`), a `caly-xano --version` verification step, and PATH refresh so a fresh install works without restarting.
- Node.js is no longer installed through a Homebrew bootstrap step that could not answer sudo; macOS uses Homebrew only when it is already installed and otherwise points at nodejs.org.
- Added `--quiet`, `--version`, `CALYCODE_LANG` and `CALYCODE_LOG_DIR`, plus a text fallback (with a final dialog) when the Windows window cannot open.
- Added `go test` coverage for the message catalog, command parsing and terminal rendering, and a `go run ./preview` harness for iterating on the window.
