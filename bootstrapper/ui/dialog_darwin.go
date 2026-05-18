//go:build darwin

package ui

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func osascript(script string) {
	cmd := exec.Command("osascript", "-e", script)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run()
}

func escapeAppleScript(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "\"", "\\\"")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}

func displayDialog(title, message string, buttons string, defaultButton string, icon string) {
	script := fmt.Sprintf(
		`display dialog "%s" with title "%s" buttons {%s} default button "%s" with icon %s`,
		escapeAppleScript(message),
		escapeAppleScript(title),
		buttons,
		defaultButton,
		icon,
	)
	osascript(script)
}

// ShowWelcome displays the welcome dialog on macOS.
func ShowWelcome() {
	displayDialog(
		"CalyCode Setup",
		"This will install the CalyCode CLI and configure your browser extension.\n\nThe process takes 1-2 minutes.\n\nClick OK to continue.",
		`"OK", "Cancel"`,
		"OK",
		"note",
	)
}

// ShowInstallingNode displays progress: installing Node.js.
func ShowInstallingNode() {
	displayDialog(
		"CalyCode Setup",
		"Node.js 18+ is required but not found.\n\nInstalling Node.js now via Homebrew...\nThis may take a few minutes.\n\nClick OK to proceed.",
		`"OK"`,
		"OK",
		"note",
	)
}

// ShowInstallingCLI displays progress: installing CLI.
func ShowInstallingCLI() {
	displayDialog(
		"CalyCode Setup",
		"Installing CalyCode CLI...\nThis may take a moment.",
		`"OK"`,
		"OK",
		"note",
	)
}

// ShowConfiguringNativeHost displays progress: configuring browser extension.
func ShowConfiguringNativeHost() {
	displayDialog(
		"CalyCode Setup",
		"Configuring browser extension connection...",
		`"OK"`,
		"OK",
		"note",
	)
}

// ShowError displays a fatal error dialog.
func ShowError(title, message string) {
	displayDialog(
		title,
		message,
		`"OK"`,
		"OK",
		"stop",
	)
}

// ShowWarning displays a warning dialog (non-fatal).
func ShowWarning(title, message string) {
	displayDialog(
		title,
		message,
		`"OK"`,
		"OK",
		"caution",
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
	msg += "  - Open Terminal and run: caly-xano --help\n"
	msg += "\nClick OK to finish."

	displayDialog(
		"CalyCode Setup - Complete",
		msg,
		`"OK"`,
		"OK",
		"note",
	)
}
