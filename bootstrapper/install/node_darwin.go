//go:build darwin

package install

import "github.com/calycode/xano-tools/bootstrapper/i18n"

// InstallNode installs Node.js with Homebrew when Homebrew is already present.
//
// We deliberately do not install Homebrew here: its installer needs an
// interactive administrator password, which a background setup step cannot
// answer. A clear "install Node.js from nodejs.org" message beats a silent hang.
func InstallNode() string {
	if !CommandExists("brew") {
		Logf("Homebrew not found; not attempting an unattended Homebrew install")
		return i18n.T("install.node.manual")
	}

	Logf("installing Node.js via Homebrew")
	if _, err := runCmd("brew", nodeInstallTimeout, "brew", "install", "node"); err != nil {
		return err.Error()
	}

	RefreshPath()
	if !NodeOK() {
		return i18n.T("install.node.notinpath")
	}
	return ""
}
