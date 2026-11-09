//go:build !windows && !darwin

package ui

import "os"

// newBackend is the plain-text fallback for platforms without a dedicated UI.
func newBackend(quiet bool) backend {
	t := newTerminalBackend(os.Stdout, true, false)
	return backend{render: t.render, consent: t.consent, close: t.close}
}
