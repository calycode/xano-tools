//go:build windows

package ui

import (
	"syscall"
	"unsafe"
)

var (
	user32             = syscall.NewLazyDLL("user32.dll")
	messageBoxW        = user32.NewProc("MessageBoxW")
)

const (
	MB_OK               = 0x00000000
	MB_OKCANCEL         = 0x00000001
	MB_ICONINFORMATION  = 0x00000040
	MB_ICONWARNING      = 0x00000030
	MB_ICONERROR        = 0x00000010
	MB_ICONQUESTION     = 0x00000020
	MB_SETFOREGROUND    = 0x00010000
	MB_TOPMOST          = 0x00040000

	IDOK     = 1
	IDCANCEL = 2
)

func messageBox(title, message string, flags uintptr) int {
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(message)
	ret, _, _ := messageBoxW.Call(
		0,
		uintptr(unsafe.Pointer(m)),
		uintptr(unsafe.Pointer(t)),
		flags,
	)
	return int(ret)
}

// ShowWelcome displays the welcome/setup-start dialog.
func ShowWelcome() {
	messageBox(
		"CalyCode Setup",
		"This will install the CalyCode CLI and configure your browser extension.\n\nThe process takes 1-2 minutes.\n\nClick OK to continue.",
		MB_OK|MB_ICONINFORMATION|MB_SETFOREGROUND|MB_TOPMOST,
	)
}

// ShowInstallingNode displays progress: installing Node.js.
func ShowInstallingNode() {
	messageBox(
		"CalyCode Setup",
		"Node.js 18+ is required but not found.\n\nInstalling Node.js now via Winget...\nThis may take a few minutes.",
		MB_OK|MB_ICONINFORMATION|MB_SETFOREGROUND|MB_TOPMOST,
	)
}

// ShowInstallingCLI displays progress: installing CLI.
func ShowInstallingCLI() {
	messageBox(
		"CalyCode Setup",
		"Installing CalyCode CLI...\nThis may take a moment.",
		MB_OK|MB_ICONINFORMATION|MB_SETFOREGROUND|MB_TOPMOST,
	)
}

// ShowConfiguringNativeHost displays progress: configuring browser extension.
func ShowConfiguringNativeHost() {
	messageBox(
		"CalyCode Setup",
		"Configuring browser extension connection...",
		MB_OK|MB_ICONINFORMATION|MB_SETFOREGROUND|MB_TOPMOST,
	)
}

// ShowError displays a fatal error dialog.
func ShowError(title, message string) {
	messageBox(
		title,
		message,
		MB_OK|MB_ICONERROR|MB_SETFOREGROUND|MB_TOPMOST,
	)
}

// ShowWarning displays a warning dialog (non-fatal).
func ShowWarning(title, message string) {
	messageBox(
		title,
		message,
		MB_OK|MB_ICONWARNING|MB_SETFOREGROUND|MB_TOPMOST,
	)
}

// ShowSuccess displays the completion dialog with next steps.
func ShowSuccess(cliVersion string) {
	msg := "CalyCode CLI has been installed successfully!\n\n"
	if cliVersion != "" {
		msg += "Version: " + cliVersion + "\n\n"
	}
	msg += "Next steps:\n"
	msg += "  - Reload your Chrome extension\n"
	msg += "  - Open a terminal and run: caly-xano --help\n\n"
	msg += "Click OK to finish."
	messageBox(
		"CalyCode Setup - Complete",
		msg,
		MB_OK|MB_ICONINFORMATION|MB_SETFOREGROUND|MB_TOPMOST,
	)
}
