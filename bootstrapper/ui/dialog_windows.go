//go:build windows

package ui

import (
	"os"
	"sync"
	"syscall"
	"unsafe"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
)

var messageBoxW = syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")

const (
	mbOK            = 0x00000000
	mbIconInfo      = 0x00000040
	mbSetForeground = 0x00010000
	mbTopMost       = 0x00040000
)

// messageBoxOK is the last-resort channel: a Windows GUI binary has no console,
// so if the installer window cannot start a dialog is the only way to speak.
func messageBoxOK(title, body string) {
	t, err := syscall.UTF16PtrFromString(title)
	if err != nil {
		return
	}
	m, err := syscall.UTF16PtrFromString(body)
	if err != nil {
		return
	}
	messageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), uintptr(mbOK|mbIconInfo|mbSetForeground|mbTopMost))
}

// windowsFallback keeps setup moving when the graphical window cannot open and
// reports the outcome in one dialog at the end.
type windowsFallback struct {
	term *terminalBackend
	mu   sync.Mutex
	last Model
}

func newWindowsFallback(quiet bool) backend {
	f := &windowsFallback{term: newTerminalBackend(os.Stdout, quiet, false)}
	return backend{render: f.render, consent: f.consent, close: f.close}
}

func (f *windowsFallback) render(m Model) {
	f.mu.Lock()
	f.last = m
	f.mu.Unlock()
	f.term.render(m)
}

func (f *windowsFallback) consent() bool {
	f.mu.Lock()
	m := f.last
	f.mu.Unlock()

	messageBoxOK(m.Title, i18n.Tf("fallback.notice", m.LogPath))
	return true
}

func (f *windowsFallback) close() {
	f.term.close()

	f.mu.Lock()
	m := f.last
	f.mu.Unlock()

	if m.Headline == "" {
		return
	}
	body := m.Headline + "\n\n" + m.Subheading
	if m.DetailsTitle != "" {
		body += "\n\n" + m.DetailsTitle + "\n" + m.DetailsBody
	}
	if m.LogPath != "" {
		body += "\n\n" + i18n.Tf("footer.log", m.LogPath)
	}
	messageBoxOK(m.Title, body)
}
