//go:build !windows && !darwin

package install

import "github.com/calycode/xano-tools/bootstrapper/i18n"

// InstallNode is not automated on unsupported platforms.
func InstallNode() string {
	return i18n.T("install.node.manual")
}
