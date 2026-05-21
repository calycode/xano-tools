package install

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

// InstallCLI installs @calycode/cli globally via npm.
// Returns the installed version string on success, empty string on failure.
// On failure, stderr is captured for diagnostic dialogs.
func InstallCLI(version string) (output string, errOut string) {
	if version == "" {
		version = "latest"
	}
	pkg := fmt.Sprintf("@calycode/cli@%s", version)

	var stderr bytes.Buffer
	cmd := exec.Command("npm", "install", "-g", pkg)
	setupSilent(cmd)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", stderr.String()
	}

	// Verify installation
	verCmd := exec.Command("caly-xano", "--version")
	setupSilent(verCmd)
	out, err := verCmd.Output()
	if err != nil {
		return "", ""
	}
	return strings.TrimSpace(string(out)), ""
}

// InitNativeHost runs `caly-xano opencode init` to configure the Chrome native messaging host.
// Returns stderr on failure.
func InitNativeHost() (errOut string) {
	if !CommandExists("caly-xano") {
		return msg.CalyXanoNotFound
	}

	var stderr bytes.Buffer
	cmd := exec.Command("caly-xano", "opencode", "init")
	setupSilent(cmd)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if stderr.Len() > 0 {
			return stderr.String()
		}
		return err.Error()
	}
	return ""
}
