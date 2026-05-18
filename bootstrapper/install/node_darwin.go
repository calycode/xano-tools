//go:build darwin

package install

import (
	"bytes"
	"os"
	"os/exec"
)

// InstallNode attempts to install Node.js via Homebrew.
// Returns stderr output on failure.
func InstallNode() (errOut string) {
	// If Homebrew is not installed, install it first
	if !CommandExists("brew") {
		if out := installHomebrew(); out != "" {
			return out
		}
	}

	var stderr bytes.Buffer
	cmd := exec.Command("brew", "install", "node")
	setupSilent(cmd)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if stderr.Len() > 0 {
			return stderr.String()
		}
		return err.Error()
	}

	if !NodeOK() {
		return "Node.js was installed but is not available in PATH. Restart Terminal and try again."
	}
	return ""
}

func installHomebrew() string {
	var stderr bytes.Buffer
	cmd := exec.Command("/bin/bash", "-c",
		`"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`,
	)
	setupSilent(cmd)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if stderr.Len() > 0 {
			return stderr.String()
		}
		return "Failed to install Homebrew. Install it manually from https://brew.sh"
	}

	// Add Homebrew to PATH for Apple Silicon
	if _, err := os.Stat("/opt/homebrew/bin/brew"); err == nil {
		os.Setenv("PATH", "/opt/homebrew/bin:"+os.Getenv("PATH"))
	}
	if _, err := os.Stat("/usr/local/bin/brew"); err == nil {
		os.Setenv("PATH", "/usr/local/bin:"+os.Getenv("PATH"))
	}

	if !CommandExists("brew") {
		return "Homebrew was installed but is not available in PATH. Restart Terminal and try again."
	}
	return ""
}
