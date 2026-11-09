//go:build windows

package ui

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/calycode/xano-tools/bootstrapper/install"
)

// newBackend picks the richest UI the machine can render. If the window cannot
// start, setup continues with plain text progress so it never becomes a dead end.
func newBackend(quiet bool) backend {
	if quiet {
		t := newTerminalBackend(os.Stdout, true, false)
		return backend{render: t.render, consent: t.consent, close: t.close}
	}
	v, err := newWindowsViewer()
	if err != nil {
		return newWindowsFallback(false)
	}
	return backend{render: v.render, consent: v.consent, close: v.close}
}

// windowsViewer drives a PowerShell/WinForms window through a status file.
//
// The Go process stays the single source of truth: it writes the model as JSON,
// the window only paints it and writes back the user's consent.
type windowsViewer struct {
	dir          string
	statusPath   string
	scriptPath   string
	decisionPath string
	readyPath    string

	mu       sync.Mutex
	last     Model
	logFile  *os.File
	cmd      *exec.Cmd
	exited   chan struct{}
	fallback backend
	closed   bool
}

func newWindowsViewer() (*windowsViewer, error) {
	dir, err := os.MkdirTemp("", "calycode-installer-*")
	if err != nil {
		return nil, err
	}
	v := &windowsViewer{
		dir:          dir,
		statusPath:   filepath.Join(dir, "status.json"),
		scriptPath:   filepath.Join(dir, "viewer.ps1"),
		decisionPath: filepath.Join(dir, "decision.txt"),
		readyPath:    filepath.Join(dir, "ready.txt"),
	}
	// PowerShell 5.1 reads a script without a BOM using the ANSI code page, which
	// would mangle the box-drawing glyphs in the script.
	if err := os.WriteFile(v.scriptPath, []byte("\ufeff"+viewerScript), 0o600); err != nil {
		_ = os.RemoveAll(dir)
		return nil, err
	}
	return v, nil
}

func (v *windowsViewer) render(m Model) {
	v.mu.Lock()
	if v.closed {
		v.mu.Unlock()
		return
	}
	fallback := v.fallback
	launched := v.cmd != nil
	v.last = m
	v.mu.Unlock()

	if fallback.active() {
		fallback.render(m)
		return
	}

	v.writeStatus(m)
	if !launched {
		v.launch()
	}
}

func (v *windowsViewer) launch() {
	logPath := filepath.Join(v.dir, "viewer.log")
	logFile, _ := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)

	cmd := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-STA",
		"-ExecutionPolicy", "Bypass",
		"-File", v.scriptPath,
		"-StatusPath", v.statusPath,
	)
	// Note: do not pass -WindowStyle Hidden. Windows applies that show-state to
	// the first window the process creates, which is our form, so it would open
	// invisible. SysProcAttr.HideWindow hides the console without that side effect.
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if logFile != nil {
		cmd.Stdout = logFile
		cmd.Stderr = logFile
	}
	started := time.Now()
	if err := cmd.Start(); err != nil {
		if logFile != nil {
			_ = logFile.Close()
		}
		install.Logf("viewer: could not start PowerShell: %v", err)
		v.enableFallback()
		return
	}
	install.Logf("viewer: PowerShell started (pid %d)", cmd.Process.Pid)

	exited := make(chan struct{})
	go func() {
		_ = cmd.Wait()
		close(exited)
	}()

	v.mu.Lock()
	v.cmd = cmd
	v.exited = exited
	v.logFile = logFile
	v.mu.Unlock()

	// Give the window a moment to come up. If it never does (blocked execution
	// policy, missing PowerShell), fall back instead of installing invisibly.
	if waitForFile(v.readyPath, 20*time.Second) {
		install.Logf("viewer: window ready after %s", time.Since(started).Round(time.Millisecond))
		return
	}
	install.Logf("viewer: window did not appear within 20s; continuing with text output")
	if cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
	<-exited
	v.enableFallback()
}

func (v *windowsViewer) enableFallback() {
	f := newWindowsFallback(false)
	v.mu.Lock()
	v.fallback = f
	last := v.last
	v.mu.Unlock()
	f.render(last)
}

// consent waits for the user to press Install in the window.
func (v *windowsViewer) consent() bool {
	v.mu.Lock()
	fallback := v.fallback
	exited := v.exited
	v.mu.Unlock()

	if fallback.active() {
		return fallback.consent()
	}

	deadline := time.Now().Add(30 * time.Minute)
	for time.Now().Before(deadline) {
		if raw, err := os.ReadFile(v.decisionPath); err == nil {
			return strings.TrimSpace(string(raw)) == "install"
		}
		if exited != nil {
			select {
			case <-exited:
				return false
			default:
			}
		}
		time.Sleep(120 * time.Millisecond)
	}
	return false
}

// close waits for the user to dismiss the window so the final state stays
// readable, then removes the temporary work directory.
func (v *windowsViewer) close() {
	v.mu.Lock()
	if v.closed {
		v.mu.Unlock()
		return
	}
	v.closed = true
	fallback := v.fallback
	cmd := v.cmd
	exited := v.exited
	logFile := v.logFile
	v.mu.Unlock()

	if fallback.active() {
		fallback.close()
		v.cleanup()
		return
	}

	if cmd != nil && exited != nil {
		select {
		case <-exited:
		case <-time.After(30 * time.Minute):
			if cmd.Process != nil {
				_ = cmd.Process.Kill()
			}
			<-exited
		}
	}
	if logFile != nil {
		_ = logFile.Close()
	}
	v.cleanup()
}

func (v *windowsViewer) cleanup() {
	_ = os.RemoveAll(v.dir)
}

func (v *windowsViewer) writeStatus(m Model) {
	payload, err := json.Marshal(m)
	if err != nil {
		return
	}
	tmp := v.statusPath + ".tmp"
	if err := os.WriteFile(tmp, payload, 0o600); err != nil {
		return
	}
	_ = os.Rename(tmp, v.statusPath)
}

func waitForFile(path string, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(path); err == nil {
			return true
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}
