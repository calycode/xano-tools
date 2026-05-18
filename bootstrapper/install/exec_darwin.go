//go:build darwin

package install

import "os/exec"

// setupSilent on macOS keeps child process output connected to the terminal.
// The binary itself opens Terminal when double-clicked — this is standard macOS CLI UX.
// osascript dialogs provide the primary progress feedback.
func setupSilent(cmd *exec.Cmd) {
	// no-op: Terminal output is the expected macOS experience
}
