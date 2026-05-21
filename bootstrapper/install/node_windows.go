//go:build windows

package install

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
)

// InstallNode attempts to install Node.js LTS via winget (primary) or Chocolatey (fallback).
// Returns stderr output on failure.
func InstallNode() (errOut string) {
	// Primary: winget
	if CommandExists("winget") {
		var stderr bytes.Buffer
		cmd := exec.Command("winget",
			"install", "-e",
			"--id", "OpenJS.NodeJS.LTS",
			"--silent",
			"--accept-package-agreements",
			"--accept-source-agreements",
		)
		setupSilent(cmd)
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			// winget failed, fall through to Chocolatey
		} else {
			refreshPathWindows()
			if NodeOK() {
				return ""
			}
		}
	}

	// Fallback: Chocolatey
	if CommandExists("choco") {
		var stderr bytes.Buffer
		cmd := exec.Command("choco", "install", "nodejs-lts", "-y", "--limit-output")
		setupSilent(cmd)
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			if stderr.Len() > 0 {
				return stderr.String()
			}
			return err.Error()
		}

		refreshenv := filepath.Join(os.Getenv("ChocolateyInstall"), "bin", "refreshenv.cmd")
		if _, err := os.Stat(refreshenv); err == nil {
			exec.Command("cmd", "/c", refreshenv).Run()
		}
		refreshPathWindows()
		if NodeOK() {
			return ""
		}
	}

	return msg.NodeInstallManual
}

func refreshPathWindows() {
	commonPaths := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "nodejs"),
		filepath.Join(os.Getenv("APPDATA"), "npm"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "nodejs"),
	}
	for _, p := range commonPaths {
		if _, err := os.Stat(p); err == nil {
			os.Setenv("PATH", p+";"+os.Getenv("PATH"))
		}
	}
}
