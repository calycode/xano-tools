//go:build windows

package install

import (
	"os/exec"
	"syscall"
)

// setupSilent configures a command to run without visible windows.
// On Windows this hides the console; child output goes to discard
// (caller should capture or check exit code).
func setupSilent(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
