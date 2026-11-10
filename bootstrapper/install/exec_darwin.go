//go:build darwin

package install

import (
	"context"
	"os"
	"os/exec"
	"strings"
)

// buildCommand is a plain exec on macOS; Homebrew and npm are real executables.
func buildCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	return exec.CommandContext(ctx, name, args...)
}

// setupSilent is a no-op: output is captured by runCmd and mirrored to the log.
// The Terminal window the user launched is expected to stay quiet and tidy.
func setupSilent(cmd *exec.Cmd) {}

// RefreshPath adds Homebrew's two prefixes, so a Node.js installed through brew
// is visible without restarting Terminal.
func RefreshPath() {
	current := os.Getenv("PATH")
	for _, dir := range []string{"/opt/homebrew/bin", "/usr/local/bin"} {
		if _, err := os.Stat(dir); err != nil {
			continue
		}
		if strings.Contains(current, dir) {
			continue
		}
		current = dir + ":" + current
		Logf("PATH extended with: %s", dir)
	}
	_ = os.Setenv("PATH", current)
}
