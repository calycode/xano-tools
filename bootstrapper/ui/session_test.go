package ui

import (
	"strings"
	"testing"
	"time"
)

func TestFormatElapsed(t *testing.T) {
	cases := map[time.Duration]string{
		0:                              "00:00",
		9 * time.Second:                "00:09",
		61 * time.Second:               "01:01",
		10*time.Minute + 5*time.Second: "10:05",
	}
	for in, want := range cases {
		if got := formatElapsed(in); got != want {
			t.Errorf("formatElapsed(%s) = %q, want %q", in, got, want)
		}
	}
}

func TestWrapRespectsWidth(t *testing.T) {
	text := "Node.js runs the CalyCode CLI and every tool it launches. If it is missing, setup installs the current LTS release for you."
	for _, line := range wrap(text, 40) {
		if len([]rune(line)) > 40 {
			t.Errorf("line %q is wider than 40 runes", line)
		}
	}
	if got := wrap("   ", 40); got != nil {
		t.Errorf("blank text should produce no lines, got %v", got)
	}
}

func TestWrappedParagraphsKeepsBlankLines(t *testing.T) {
	lines := wrappedParagraphs("first\n\nsecond", 60)
	joined := strings.Join(lines, "|")
	if !strings.Contains(joined, "first||second") {
		t.Errorf("expected paragraph break to survive, got %q", joined)
	}
}

func TestRenderBlockShowsEveryStep(t *testing.T) {
	m := Model{
		App:        "CalyCode",
		Tagline:    "toolkit",
		Headline:   "Setting up",
		Subheading: "keep this window open",
		Phase:      PhaseRunning,
		Steps: []Step{
			{Title: "Check your system", Detail: "Node.js v20 detected", State: StateDone},
			{Title: "Install the CLI", Detail: "Downloading", State: StateActive},
			{Title: "Verify", State: StatePending},
		},
		Percent:       33,
		FooterMeta:    "Step 2 of 3",
		FooterElapsed: "00:12 elapsed",
		DetailsTitle:  "Why this matters",
		DetailsBody:   "Because it does.",
		LogPath:       "/tmp/installer.log",
		Labels:        Labels{KeepOpen: "please wait"},
	}
	out := strings.Join(renderBlock(m, 0, false), "\n")
	for _, want := range []string{"Check your system", "Install the CLI", "Verify", "33%", "00:12 elapsed", "why", "installer.log"} {
		if !strings.Contains(strings.ToLower(out), strings.ToLower(want)) {
			t.Errorf("rendered block is missing %q:\n%s", want, out)
		}
	}
	for _, escape := range []string{"\x1b["} {
		if strings.Contains(out, escape) {
			t.Errorf("plain rendering should not contain ANSI escapes:\n%s", out)
		}
	}
}
