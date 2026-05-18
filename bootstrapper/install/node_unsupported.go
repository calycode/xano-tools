//go:build !windows && !darwin

package install

// InstallNode is a no-op on unsupported platforms.
func InstallNode() string {
	return "Unsupported platform. Please install Node.js 18+ manually from https://nodejs.org"
}
