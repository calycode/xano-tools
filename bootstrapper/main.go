package main

import (
	"fmt"
	"os"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
	"github.com/calycode/xano-tools/bootstrapper/install"
	"github.com/calycode/xano-tools/bootstrapper/ui"
)

func main() {
	t := i18n.Get()
	install.SetMessages(t)
	ui.SetMessages(t)

	ui.ShowWelcome()
	session := ui.StartInstallerSession()

	fail := func(title, message string) {
		session.Close()
		ui.ShowError(title, message)
		os.Exit(1)
	}

	// --- STEP 1: Ensure Node.js >= 18 ---
	session.Update(1, 3, t.StepCheckingTitle, t.StepCheckingDetail)
	if !install.NodeOK() {
		session.Update(1, 3, t.StepInstallDepsTitle, t.StepInstallDepsDetail)
		if errOut := install.InstallNode(); errOut != "" {
			fail(
				t.NodeRequiredTitle,
				fmt.Sprintf(t.NodeRequiredMessageFmt, errOut),
			)
		}
		if !install.NodeOK() {
			fail(
				t.NodeInstallFailedTitle,
				t.NodeInstallFailedMessage,
			)
		}
	}

	// --- STEP 2: Install @calycode/cli ---
	session.Update(2, 3, t.StepInstallCLITitle, t.StepInstallCLIDetail)
	cliVersion, errOut := install.InstallCLI("latest")
	if errOut != "" {
		fail(
			t.InstallFailedTitle,
			fmt.Sprintf(t.InstallFailedMessageFmt, errOut),
		)
	}

	// --- STEP 3: Configure native messaging host ---
	session.Update(3, 3, t.StepConfigureTitle, t.StepConfigureDetail)
	if errOut := install.InitNativeHost(); errOut != "" {
		session.Close()
		ui.ShowWarning(
			t.ExtSetupIncompleteTitle,
			fmt.Sprintf(t.ExtSetupIncompleteMessageFmt, errOut),
		)
	}

	// --- DONE ---
	session.Close()
	ui.ShowSuccess(cliVersion)
}
