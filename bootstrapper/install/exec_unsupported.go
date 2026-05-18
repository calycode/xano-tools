//go:build !windows && !darwin

package install

import "os/exec"

func setupSilent(cmd *exec.Cmd) {}
