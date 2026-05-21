//go:build darwin

package ui

import "fmt"

func newInstallerSession() *InstallerSession {
	// macOS: use a persistent terminal step indicator (single session output)
	// to avoid repeated modal prompts. A fully native .app-style installer
	// window can be added later if needed.
	return &InstallerSession{
		updateFn: func(step, total int, title, detail string) {
			if total < 1 {
				total = 1
			}
			if step < 0 {
				step = 0
			}
			if step > total {
				step = total
			}
			fmt.Printf("\r"+msg.SessionProgressFmt, step, total, title, detail)
		},
		closeFn: func() {
			fmt.Print("\n")
		},
	}
}
