package ui

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
)

const (
	ansiReset  = "\x1b[0m"
	ansiBold   = "\x1b[1m"
	ansiDim    = "\x1b[2m"
	ansiAccent = "\x1b[38;5;51m"
	ansiGreen  = "\x1b[38;5;78m"
	ansiYellow = "\x1b[38;5;214m"
	ansiRed    = "\x1b[38;5;203m"
	ansiMuted  = "\x1b[38;5;245m"
)

// spinnerFrames animate the step that is currently running.
var spinnerFrames = []string{"◐", "◓", "◑", "◒"}

// terminalBackend renders the installer in a terminal.
//
// On a real terminal it redraws a single live block; when output is redirected
// or --quiet is set it degrades to append-only progress lines, so logs stay
// readable in CI.
type terminalBackend struct {
	out   io.Writer
	quiet bool
	wait  bool
	color bool
	tty   bool
	in    io.Reader

	mu      sync.Mutex
	model   Model
	seen    bool
	tick    int
	drawn   int
	stopped bool
	stop    chan struct{}
	done    chan struct{}
}

func newTerminalBackend(out io.Writer, quiet, wait bool) *terminalBackend {
	t := &terminalBackend{
		out:   out,
		quiet: quiet,
		wait:  wait,
		tty:   isTerminal(out),
		in:    os.Stdin,
	}
	t.color = t.tty && !quiet && os.Getenv("NO_COLOR") == ""
	if t.tty && !quiet {
		t.stop = make(chan struct{})
		t.done = make(chan struct{})
		go t.animate()
	}
	return t
}

func (t *terminalBackend) render(m Model) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.stopped {
		return
	}
	if !t.tty || t.quiet {
		t.appendEvents(m)
		t.model = m
		t.seen = true
		return
	}
	t.model = m
	t.seen = true
	t.paint()
}

func (t *terminalBackend) close() {
	t.mu.Lock()
	animate := t.stop != nil && !t.stopped
	t.stopped = true
	m := t.model
	t.mu.Unlock()

	if animate {
		close(t.stop)
		<-t.done
	}

	if t.wait && t.tty && !t.quiet && m.Phase != PhaseCancelled {
		fmt.Fprint(t.out, "\n  "+t.muted(i18n.T("footer.pressenter"))+"\n")
		_, _ = bufio.NewReader(t.in).ReadString('\n')
	}
	if t.tty && !t.quiet {
		fmt.Fprintln(t.out)
	}
}

// consent shows the welcome panel and waits for the user to confirm.
// Non-interactive runs proceed without asking.
func (t *terminalBackend) consent() bool {
	if !t.tty || t.quiet {
		return true
	}
	fmt.Fprint(t.out, "  "+t.bold(i18n.T("welcome.prompt")))
	_, err := bufio.NewReader(t.in).ReadString('\n')
	fmt.Fprintln(t.out)
	if err != nil {
		return false
	}
	// Start the live progress block on a clean screen instead of growing the
	// welcome panel downward.
	fmt.Fprint(t.out, "\x1b[2J\x1b[3J\x1b[H")
	t.mu.Lock()
	t.drawn = 0
	t.mu.Unlock()
	return true
}

func (t *terminalBackend) animate() {
	defer close(t.done)
	ticker := time.NewTicker(160 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-t.stop:
			return
		case <-ticker.C:
			t.mu.Lock()
			if !t.stopped {
				t.tick++
				if t.model.Phase == PhaseRunning {
					t.paint()
				}
			}
			t.mu.Unlock()
		}
	}
}

// paint redraws the live block in place.
func (t *terminalBackend) paint() {
	lines := renderBlock(t.model, t.tick, t.color)
	var b strings.Builder
	if t.drawn > 0 {
		b.WriteString(fmt.Sprintf("\x1b[%dA", t.drawn))
	}
	b.WriteString("\x1b[J")
	b.WriteString(strings.Join(lines, "\n"))
	b.WriteString("\n")
	fmt.Fprint(t.out, b.String())
	t.drawn = len(lines)
}

// appendEvents writes one line per visible change for non-interactive output.
func (t *terminalBackend) appendEvents(m Model) {
	prev := t.model
	if !t.seen {
		fmt.Fprintf(t.out, "%s installer: %s\n", m.App, m.Headline)
		return
	}
	for i, step := range m.Steps {
		if i < len(prev.Steps) {
			old := prev.Steps[i]
			if old.State == step.State && old.Detail == step.Detail {
				continue
			}
		}
		line := fmt.Sprintf("[%d/%d] %s", i+1, len(m.Steps), step.Title)
		if step.Detail != "" {
			line += ": " + step.Detail
		}
		if marker := plainMarker(step.State); marker != "" {
			line += " [" + marker + "]"
		}
		fmt.Fprintln(t.out, line)
	}
	if prev.Phase != m.Phase {
		switch m.Phase {
		case PhaseFinished:
			fmt.Fprintf(t.out, "%s", m.Subheading)
			if m.Version != "" {
				fmt.Fprintf(t.out, " (%s)", m.Version)
			}
			fmt.Fprintln(t.out)
			for _, key := range []string{"done.next.reload", "done.next.help", "done.next.init"} {
				fmt.Fprintf(t.out, "  - %s\n", i18n.T(key))
			}
			if m.Warning != "" {
				fmt.Fprintf(t.out, "  ! %s\n", i18n.T("done.attention.body"))
			}
			t.printLogPath(m)
		case PhaseFailed:
			fmt.Fprintf(t.out, "%s: %s\n", m.DetailsTitle, strings.ReplaceAll(m.DetailsBody, "\n", " "))
			t.printLogPath(m)
		case PhaseCancelled:
			fmt.Fprintln(t.out, m.Subheading)
		}
	}
}

func (t *terminalBackend) printLogPath(m Model) {
	if m.LogPath != "" {
		fmt.Fprintln(t.out, i18n.Tf("footer.log", m.LogPath))
	}
}

func plainMarker(state StepState) string {
	switch state {
	case StateActive:
		return "..."
	case StateDone:
		return "ok"
	case StateAttention:
		return "!"
	case StateFailed:
		return "failed"
	}
	return ""
}

// renderBlock builds the full live terminal panel.
func renderBlock(m Model, tick int, color bool) []string {
	width := terminalWidth()
	p := painter{color: color}

	out := []string{""}
	out = append(out, "  "+p.bold(p.accent("◆ "+m.App))+"  "+p.muted(m.Tagline))
	out = append(out, "  "+p.muted(strings.Repeat("─", width-4)))
	out = append(out, "")
	out = append(out, "  "+p.bold(m.Headline))
	if m.Subheading != "" {
		for _, line := range wrap(m.Subheading, width-4) {
			out = append(out, "  "+p.muted(line))
		}
	}
	out = append(out, "")

	if m.Phase == PhaseWelcome {
		if m.DetailsTitle != "" {
			out = append(out, "  "+p.bold(p.accent(m.DetailsTitle)))
		}
		for _, line := range wrappedParagraphs(m.DetailsBody, width-6) {
			out = append(out, "  "+line)
		}
		return append(out, "")
	}

	total := len(m.Steps)
	for i, step := range m.Steps {
		out = append(out, stepBlock(i, total, step, tick, width, p)...)
	}

	out = append(out, "")

	if m.DetailsTitle != "" {
		out = append(out, "  "+p.bold(p.accent(m.DetailsTitle)))
	}
	for _, line := range wrappedParagraphs(m.DetailsBody, width-6) {
		out = append(out, "  "+line)
	}
	if m.Warning != "" {
		out = append(out, "")
		out = append(out, "  "+p.yellow("! "+m.Warning))
	}

	out = append(out, "")
	out = append(out, progressLine(m, width, p))
	out = append(out, "")
	if m.LogPath != "" {
		for _, line := range wrap(i18n.Tf("footer.log", m.LogPath), width-4) {
			out = append(out, "  "+p.muted(line))
		}
	}
	if m.Phase == PhaseRunning {
		out = append(out, "  "+p.muted(m.Labels.KeepOpen))
	}
	return out
}

func stepBlock(index, total int, step Step, tick int, width int, p painter) []string {
	glyph, titlePaint := stepGlyph(step.State, tick, p)
	head := fmt.Sprintf("  %s %d/%d  %s", glyph, index+1, total, titlePaint(step.Title))
	lines := []string{head}

	if step.Detail == "" || step.State == StatePending {
		return lines
	}
	linePaint := p.muted
	if step.State == StateFailed {
		linePaint = p.red
	}
	for _, line := range wrap(step.Detail, width-12) {
		lines = append(lines, "         "+linePaint(line))
	}
	return lines
}

func stepGlyph(state StepState, tick int, p painter) (glyph string, title func(string) string) {
	switch state {
	case StateActive:
		frame := spinnerFrames[tick%len(spinnerFrames)]
		return p.accent(frame), p.bold
	case StateDone:
		return p.green("✔"), p.normal
	case StateAttention:
		return p.yellow("!"), p.normal
	case StateFailed:
		return p.red("✖"), p.bold
	default:
		return p.muted("○"), p.muted
	}
}

func progressLine(m Model, width int, p painter) string {
	cells := width - 34
	if cells < 12 {
		cells = 12
	}
	if cells > 40 {
		cells = 40
	}
	filled := m.Percent * cells / 100
	if filled > cells {
		filled = cells
	}
	bar := strings.Repeat("█", filled) + strings.Repeat("░", cells-filled)
	if m.Phase == PhaseFinished {
		bar = p.green(bar)
	} else if m.Phase == PhaseFailed {
		bar = p.red(bar)
	} else {
		bar = p.accent(bar)
	}
	return fmt.Sprintf("  %s  %s  %s", bar, p.bold(fmt.Sprintf("%3d%%", m.Percent)), p.muted(m.FooterElapsed))
}

func wrappedParagraphs(text string, width int) []string {
	if strings.TrimSpace(text) == "" {
		return nil
	}
	var out []string
	for _, paragraph := range strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n") {
		if strings.TrimSpace(paragraph) == "" {
			out = append(out, "")
			continue
		}
		if strings.HasPrefix(paragraph, "• ") {
			for i, line := range wrap(paragraph, width-2) {
				if i > 0 {
					line = "  " + line
				}
				out = append(out, line)
			}
			continue
		}
		out = append(out, wrap(paragraph, width)...)
	}
	return out
}

type painter struct{ color bool }

func (p painter) wrap(code, text string) string {
	if !p.color {
		return text
	}
	return code + text + ansiReset
}

func (p painter) bold(s string) string   { return p.wrap(ansiBold, s) }
func (p painter) muted(s string) string  { return p.wrap(ansiMuted, s) }
func (p painter) accent(s string) string { return p.wrap(ansiAccent, s) }
func (p painter) green(s string) string  { return p.wrap(ansiGreen, s) }
func (p painter) yellow(s string) string { return p.wrap(ansiYellow, s) }
func (p painter) red(s string) string    { return p.wrap(ansiRed, s) }
func (p painter) normal(s string) string { return s }

func (t *terminalBackend) bold(s string) string  { return painter{color: t.color}.bold(s) }
func (t *terminalBackend) muted(s string) string { return painter{color: t.color}.muted(s) }

func isTerminal(w io.Writer) bool {
	f, ok := w.(*os.File)
	if !ok {
		return false
	}
	stat, err := f.Stat()
	if err != nil {
		return false
	}
	return stat.Mode()&os.ModeCharDevice != 0
}

func terminalWidth() int {
	if v, err := strconv.Atoi(os.Getenv("COLUMNS")); err == nil && v >= 50 {
		return min(v, 100)
	}
	return 78
}

// wrap breaks text into lines of at most width runes, preferring spaces.
func wrap(text string, width int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	if width < 20 {
		width = 20
	}
	words := strings.Fields(text)
	var lines []string
	line := words[0]
	for _, word := range words[1:] {
		if len([]rune(line))+1+len([]rune(word)) <= width {
			line += " " + word
			continue
		}
		lines = append(lines, line)
		line = word
	}
	return append(lines, line)
}
