//go:build windows

package install

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

// setupSilent hides the console window of child processes: the installer is a
// GUI binary and a flashing black window looks like a malfunction.
func setupSilent(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
}

// buildCommand runs .cmd/.bat shims (npm, caly-xano) through cmd.exe, because
// CreateProcess cannot execute batch files directly.
func buildCommand(ctx context.Context, name string, args ...string) *exec.Cmd {
	if path, err := exec.LookPath(name); err == nil {
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".cmd" || ext == ".bat" {
			return exec.CommandContext(ctx, "cmd", append([]string{"/d", "/c", name}, args...)...)
		}
		return exec.CommandContext(ctx, path, args...)
	}
	return exec.CommandContext(ctx, name, args...)
}

// RefreshPath picks up installs that happened during setup (Node.js, npm's
// global bin directory) so the user does not have to restart anything.
func RefreshPath() {
	var candidates []string
	if dir := os.Getenv("ProgramFiles"); dir != "" {
		candidates = append(candidates, filepath.Join(dir, "nodejs"))
	}
	if dir := os.Getenv("APPDATA"); dir != "" {
		candidates = append(candidates, filepath.Join(dir, "npm"))
	}
	if dir := os.Getenv("LOCALAPPDATA"); dir != "" {
		candidates = append(candidates, filepath.Join(dir, "Programs", "nodejs"))
	}

	current := os.Getenv("PATH")
	lower := strings.ToLower(current)
	var added []string
	for _, dir := range candidates {
		if _, err := os.Stat(dir); err != nil {
			continue
		}
		if strings.Contains(lower, strings.ToLower(dir)) {
			continue
		}
		added = append(added, dir)
	}
	if len(added) == 0 {
		return
	}
	_ = os.Setenv("PATH", strings.Join(added, ";")+";"+current)
	Logf("PATH extended with: %s", strings.Join(added, "; "))
}
