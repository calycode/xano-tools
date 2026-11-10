//go:build windows

package install

import (
	"strings"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
)

// InstallNode installs the Node.js LTS release via winget, falling back to
// Chocolatey when winget is unavailable or fails.
//
// It returns an empty string on success, otherwise a message that explains what
// went wrong (the log holds the full output).
func InstallNode() string {
	var problems []string

	if CommandExists("winget") {
		Logf("installing Node.js via winget")
		_, err := runCmd("winget", nodeInstallTimeout,
			"winget", "install", "-e",
			"--id", "OpenJS.NodeJS.LTS",
			"--silent",
			"--accept-package-agreements",
			"--accept-source-agreements",
		)
		if err == nil {
			RefreshPath()
			if NodeOK() {
				return ""
			}
			problems = append(problems, i18n.T("install.node.notinpath"))
		} else {
			problems = append(problems, "winget: "+err.Error())
		}
	} else {
		Logf("winget not available")
	}

	if CommandExists("choco") {
		Logf("installing Node.js via Chocolatey")
		_, err := runCmd("choco", nodeInstallTimeout, "choco", "install", "nodejs-lts", "-y", "--limit-output")
		if err == nil {
			RefreshPath()
			if NodeOK() {
				return ""
			}
			problems = append(problems, i18n.T("install.node.notinpath"))
		} else {
			problems = append(problems, "choco: "+err.Error())
		}
	} else {
		Logf("Chocolatey not available")
	}

	if len(problems) == 0 {
		return i18n.T("install.node.manual")
	}
	return strings.Join(problems, "\n\n")
}
