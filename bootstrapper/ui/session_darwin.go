//go:build darwin

package ui

import "os"

// newBackend renders the installer in the Terminal window that macOS opens when
// the downloaded binary is double-clicked. It is a single live block, not a
// stack of modal dialogs, and it asks for Enter at the end so the next steps
// stay on screen.
func newBackend(quiet bool) backend {
	t := newTerminalBackend(os.Stdout, quiet, !quiet)
	return backend{render: t.render, consent: t.consent, close: t.close}
}
