package ui

// InstallerSession tracks installer progress in a persistent window when available.
// On platforms without a persistent UI implementation, methods are no-ops.
type InstallerSession struct {
	updateFn func(step, total int, title, detail string)
	closeFn  func()
}

// StartInstallerSession starts a persistent installer session UI.
func StartInstallerSession() *InstallerSession {
	return newInstallerSession()
}

// Update updates progress step and text.
func (s *InstallerSession) Update(step, total int, title, detail string) {
	if s == nil || s.updateFn == nil {
		return
	}
	s.updateFn(step, total, title, detail)
}

// Close closes the installer session UI.
func (s *InstallerSession) Close() {
	if s == nil || s.closeFn == nil {
		return
	}
	s.closeFn()
}
