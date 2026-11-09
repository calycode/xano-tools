package install

import "github.com/calycode/xano-tools/bootstrapper/i18n"

// InstallCLI installs @calycode/cli globally with npm.
//
// It returns the version reported by the fresh binary. On failure it returns a
// message ready to show to the user; the setup log keeps the full npm output.
func InstallCLI(version string) (installed string, errDetail string) {
	if version == "" {
		version = "latest"
	}
	pkg := "@calycode/cli@" + version

	if _, ok := CheckNpm(); !ok {
		return "", i18n.T("install.npm.missing")
	}

	RefreshPath()
	if _, err := runCmd("npm install", cliInstallTimeout, "npm", "install", "-g", pkg); err != nil {
		return "", err.Error()
	}
	RefreshPath()

	installed, ok := CheckCLI()
	if !ok {
		return "", i18n.T("install.cli.notfound")
	}
	return installed, ""
}

// VerifyCLI confirms the installed command runs and reports a version.
func VerifyCLI() (string, string) {
	RefreshPath()
	version, ok := CheckCLI()
	if !ok {
		return "", i18n.T("install.cli.notfound")
	}
	if version == "" {
		return "", i18n.T("install.cli.noversion")
	}
	Logf("verified caly-xano %s", version)
	return version, ""
}

// InitNativeHost registers the browser extension's native messaging host and
// installs the OpenCode agent templates and skills.
func InitNativeHost() string {
	if !CommandExists("caly-xano") {
		RefreshPath()
	}
	if !CommandExists("caly-xano") {
		return i18n.T("install.cli.notfound")
	}

	if _, err := runCmd("caly-xano oc init", nativeHostTimeout, "caly-xano", "oc", "init"); err != nil {
		return err.Error()
	}
	return ""
}
