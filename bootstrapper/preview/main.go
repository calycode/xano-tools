// Command preview renders the installer UI against a scripted state so the
// window and the terminal layouts can be iterated on without touching the
// machine. It is a developer tool: `go run ./preview -stage running`.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
	"github.com/calycode/xano-tools/bootstrapper/install"
	"github.com/calycode/xano-tools/bootstrapper/ui"
)

func main() {
	stage := flag.String("stage", "welcome", "welcome, running, done or failed")
	lang := flag.String("lang", "en", "language tag (en, es, de, fr, hu, sr)")
	quiet := flag.Bool("quiet", false, "render the plain text backend")
	consent := flag.Bool("consent", false, "wait for the welcome panel's install/cancel choice first")
	flag.Parse()

	i18n.Set(*lang)
	logPath := install.OpenLog()
	defer install.CloseLog()

	session := ui.Start(ui.DefaultSteps(), logPath, *quiet)
	if *consent && !session.Consent() {
		session.Close()
		return
	}

	switch *stage {
	case "welcome":
		// nothing to do: Start opens on the welcome panel
	case "running":
		session.Begin(ui.StepPrereq, "")
		session.Complete(ui.StepPrereq, i18n.Tf("step.node.found", "v20.11.0"))
		session.Begin(ui.StepCLI, "")
		session.Detail(ui.StepCLI, i18n.Tf("step.cli.updating", "1.4.2"))
	case "done":
		for step := 0; step < ui.StepCount; step++ {
			session.Begin(step, "")
		}
		session.Complete(ui.StepPrereq, i18n.Tf("step.node.found", "v20.11.0"))
		session.Complete(ui.StepCLI, i18n.Tf("step.cli.installed", "1.5.0"))
		session.Complete(ui.StepVerify, i18n.Tf("step.verify.ok", "1.5.0"))
		session.Complete(ui.StepHost, i18n.T("step.host.ok"))
		session.Finish("1.5.0", "")
	case "failed":
		session.Begin(ui.StepPrereq, "")
		session.Complete(ui.StepPrereq, i18n.Tf("step.node.found", "v20.11.0"))
		session.Begin(ui.StepCLI, "")
		session.Fail(ui.StepCLI, i18n.T("fail.cli.title"),
			i18n.Tf("fail.cli.body", "npm ERR! code ETIMEDOUT\nnpm ERR! network request to https://registry.npmjs.org failed"))
	default:
		fmt.Fprintf(os.Stderr, "unknown stage %q\n", *stage)
		os.Exit(2)
	}

	session.Close()
}
