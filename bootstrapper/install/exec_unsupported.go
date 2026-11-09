//go:build !windows && !darwin

package install

import (
	"context"
	"os/exec"
)

func buildCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	return exec.CommandContext(ctx, name, args...)
}

func setupSilent(cmd *exec.Cmd) {}

// RefreshPath is a no-op outside the platforms the installer targets.
func RefreshPath() {}
