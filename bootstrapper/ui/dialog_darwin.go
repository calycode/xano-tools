//go:build darwin

package ui

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const autoCloseTerminalEnv = "CALYCODE_INSTALLER_AUTO_CLOSE_TERMINAL"

func osascript(script string) {
	cmd := exec.Command("osascript", "-e", script)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run()
}

func osascriptDetached(script string) {
	cmd := exec.Command("osascript", "-e", script)
	_ = cmd.Start()
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
		msg.SetupTitle,
		msg.WelcomeMessage,
		`"OK"`,
		"OK",
		"note",
	)
}

// ShowInstallingNode displays progress: installing Node.js.
func ShowInstallingNode() {
	displayDialog(
		msg.SetupTitle,
		msg.InstallingNodeDarwinMessage,
		`"OK"`,
		"OK",
		"note",
	)
}

// ShowInstallingCLI displays progress: installing CLI.
func ShowInstallingCLI() {
	displayDialog(
		msg.SetupTitle,
		msg.InstallingCLIMessage,
		`"OK"`,
		"OK",
		"note",
	)
}

// ShowConfiguringNativeHost displays progress: configuring browser extension.
func ShowConfiguringNativeHost() {
	displayDialog(
		msg.SetupTitle,
		msg.ConfiguringNativeHostMessage,
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
	success := msg.SuccessIntro
	if cliVersion != "" {
		success += fmt.Sprintf(msg.SuccessVersionFmt, cliVersion)
	}
	success += msg.SuccessNextSteps
	success += msg.SuccessReloadExtensionBullet
	success += fmt.Sprintf(msg.SuccessRunHelpBulletFmt, msg.TerminalLabelDarwin)
	success += msg.SuccessClickOK

	displayDialog(
		msg.SetupCompleteTitle,
		success,
		`"OK"`,
		"OK",
		"note",
	)

	if os.Getenv(autoCloseTerminalEnv) == "1" {
		osascriptDetached(`delay 0.4
tell application "Terminal"
	if (count of windows) > 0 then
		try
			close front window
		end try
	end if
end tell`)
	}
}
