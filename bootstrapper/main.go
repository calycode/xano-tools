// Command calycode-installer sets up the CalyCode CLI and the browser
// extension connection for a Xano workspace.
//
// It is designed to be double-clicked: no terminal is required on Windows, and
// on macOS the bundled Terminal window carries the whole flow. Every step is
// explained in the UI, and everything that happens is written to a setup log.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
	"github.com/calycode/xano-tools/bootstrapper/install"
	"github.com/calycode/xano-tools/bootstrapper/ui"
)

// version is replaced at build time (-ldflags "-X main.version=...").
var version = "dev"

func main() {
	os.Exit(run(os.Args[1:]))
}

func run(args []string) int {
	flags := flag.NewFlagSet("calycode-installer", flag.ContinueOnError)
	flags.SetOutput(os.Stdout)
	quiet := flags.Bool("quiet", false, "print plain progress to stdout instead of opening the installer window")
	showVersion := flags.Bool("version", false, "print the installer version and exit")
	flags.Usage = func() {
		fmt.Fprintf(flags.Output(), "%s installer %s\n\nUsage: calycode-installer [options]\n\n", i18n.T("app.name"), version)
		flags.PrintDefaults()
	}
	if err := flags.Parse(args); err != nil {
		if err == flag.ErrHelp {
			return 0
		}
		return 2
	}
	if *showVersion {
		fmt.Println(version)
		return 0
	}

	logPath := install.OpenLog()
	defer install.CloseLog()

	session := ui.Start(ui.DefaultSteps(), logPath, *quiet)
	if !session.Consent() {
		install.Logf("setup cancelled by the user")
		session.Close()
		return 0
	}

	cliVersion, warning, failed := setup(session)
	if failed != nil {
		install.Logf("setup failed at: %s", failed.title)
		session.Fail(failed.step, failed.title, failed.details)
		session.Close()
		return 1
	}

	install.Logf("setup finished: %s", cliVersion)
	session.Finish(cliVersion, warning)
	session.Close()
	return 0
}

// failure carries the message shown when setup cannot continue.
type failure struct {
	step    int
	title   string
	details string
}

// setup walks the four install steps in order. It returns the CLI version, a
// non-fatal warning (browser integration), and any failure that stopped setup.
func setup(session *ui.Session) (string, string, *failure) {
	// Step 1: Node.js 18+ is the only hard prerequisite.
	session.Begin(ui.StepPrereq, "")
	node := install.CheckNode()
	if node.OK() {
		session.Complete(ui.StepPrereq, i18n.Tf("step.node.found", node.Raw))
	} else {
		session.Detail(ui.StepPrereq, i18n.T("step.node.missing"))
		if details := install.InstallNode(); details != "" {
			return "", "", &failure{ui.StepPrereq, i18n.T("fail.node.title"), i18n.Tf("fail.node.body", details)}
		}
		install.RefreshPath()
		installed := install.CheckNode()
		raw := installed.Raw
		if raw == "" {
			raw = "Node.js"
		}
		session.Complete(ui.StepPrereq, i18n.Tf("step.node.installed", raw))
	}
	if _, ok := install.CheckNpm(); !ok {
		return "", "", &failure{ui.StepPrereq, i18n.T("fail.npm.title"), i18n.T("fail.npm.body")}
	}

	// Step 2: install or update the CLI itself.
	session.Begin(ui.StepCLI, "")
	if previous, ok := install.CheckCLI(); ok && previous != "" {
		session.Detail(ui.StepCLI, i18n.Tf("step.cli.updating", previous))
	}
	cliVersion, details := install.InstallCLI("latest")
	if details != "" {
		return "", "", &failure{ui.StepCLI, i18n.T("fail.cli.title"), i18n.Tf("fail.cli.body", details)}
	}
	session.Complete(ui.StepCLI, i18n.Tf("step.cli.installed", cliVersion))

	// Step 3: prove the command actually runs before declaring success.
	session.Begin(ui.StepVerify, "")
	verified, details := install.VerifyCLI()
	if details != "" {
		return "", "", &failure{ui.StepVerify, i18n.T("fail.verify.title"), i18n.Tf("fail.verify.body", details)}
	}
	if verified != "" {
		cliVersion = verified
	}
	session.Complete(ui.StepVerify, i18n.Tf("step.verify.ok", cliVersion))

	// Step 4: connect the browser extension. Failing here leaves a working CLI,
	// so it is a warning rather than a dead end.
	session.Begin(ui.StepHost, "")
	if details := install.InitNativeHost(); details != "" {
		install.Logf("browser integration failed: %s", details)
		session.Attention(ui.StepHost, i18n.T("step.host.attention"))
		return cliVersion, i18n.T("step.host.attention"), nil
	}
	session.Complete(ui.StepHost, i18n.T("step.host.ok"))
	return cliVersion, "", nil
}
