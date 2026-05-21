//go:build !windows && !darwin

package ui

func newInstallerSession() *InstallerSession {
	return &InstallerSession{}
}
