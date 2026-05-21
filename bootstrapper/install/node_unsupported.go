//go:build !windows && !darwin

package install

// InstallNode is a no-op on unsupported platforms.
func InstallNode() string {
	return msg.NodeInstallManual
}
