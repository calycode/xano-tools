package main

import (
	"os"

	"github.com/calycode/xano-tools/bootstrapper/install"
	"github.com/calycode/xano-tools/bootstrapper/ui"
)

func main() {
	ui.ShowWelcome()
	session := ui.StartInstallerSession()

	fail := func(title, message string) {
		session.Close()
		ui.ShowError(title, message)
		os.Exit(1)
	}

	// --- STEP 1: Ensure Node.js >= 18 ---
	session.Update(1, 3, "Checking prerequisites", "Checking Node.js 18+...")
	if !install.NodeOK() {
		session.Update(1, 3, "Installing dependencies", "Node.js not found. Installing Node.js 18+...")
		if errOut := install.InstallNode(); errOut != "" {
			fail(
				"Node.js Required",
				"Node.js 18+ is required but could not be installed automatically.\n\n"+
					errOut+"\n\n"+
					"Please install it manually from https://nodejs.org\n"+
					"Then run this installer again.",
			)
		}
		if !install.NodeOK() {
			fail(
				"Node.js Installation Failed",
				"Node.js was installed but is not available in PATH.\n\n"+
					"Please restart your computer and run this installer again.",
			)
		}
	}

	// --- STEP 2: Install @calycode/cli ---
	session.Update(2, 3, "Installing CalyCode CLI", "Installing @calycode/cli globally...")
	cliVersion, errOut := install.InstallCLI("latest")
	if errOut != "" {
		fail(
			"Installation Failed",
			"Could not install @calycode/cli.\n\n"+
				errOut+"\n\n"+
				"Check your internet connection and try again.\n"+
				"Or install manually: npm install -g @calycode/cli",
		)
	}

	// --- STEP 3: Configure native messaging host ---
	session.Update(3, 3, "Configuring browser integration", "Setting up native messaging host...")
	if errOut := install.InitNativeHost(); errOut != "" {
		session.Close()
		ui.ShowWarning(
			"Extension Setup Incomplete",
			"CLI is installed but the browser extension native host could not be configured.\n\n"+
				errOut+"\n\n"+
				"Run this command in terminal to complete setup:\n"+
				"    caly-xano opencode init\n\n"+
				"Then reload your Chrome extension.",
		)
	}

	// --- DONE ---
	session.Close()
	ui.ShowSuccess(cliVersion)
}
