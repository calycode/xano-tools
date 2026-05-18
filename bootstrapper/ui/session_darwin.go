//go:build darwin

package ui

func newInstallerSession() *InstallerSession {
	// macOS: keep setup non-blocking and avoid repeated modal prompts.
	// A native persistent window can be added later via .app bundle.
	return &InstallerSession{}
}
