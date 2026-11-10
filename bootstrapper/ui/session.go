// Package ui renders installer progress for the user.
//
// The installer walks a fixed list of steps. Every backend (the Windows window,
// the macOS terminal, the headless text output) renders the same Model, so the
// story the user sees is identical no matter where it runs.
package ui

import (
	"fmt"
	"sync"
	"time"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
)

// StepState mirrors what the user sees next to a step.
type StepState string

const (
	StatePending   StepState = "pending"
	StateActive    StepState = "active"
	StateDone      StepState = "done"
	StateAttention StepState = "attention"
	StateFailed    StepState = "failed"
)

// Phase is the overall state of the installer.
type Phase string

const (
	PhaseWelcome   Phase = "welcome"
	PhaseRunning   Phase = "running"
	PhaseFinished  Phase = "finished"
	PhaseFailed    Phase = "failed"
	PhaseCancelled Phase = "cancelled"
)

// Step indexes, in display order.
const (
	StepPrereq = iota
	StepCLI
	StepVerify
	StepHost
	StepCount
)

// Step is one row of the installer checklist.
type Step struct {
	Title  string    `json:"title"`
	Detail string    `json:"detail"`
	State  StepState `json:"state"`
	why    string
}

// Labels are the button and hint strings the UI needs, in the active language.
type Labels struct {
	Close    string `json:"close"`
	OpenLog  string `json:"openLog"`
	CopyLog  string `json:"copyLog"`
	Copied   string `json:"copied"`
	Install  string `json:"install"`
	Cancel   string `json:"cancel"`
	KeepOpen string `json:"keepOpen"`
}

// Model is the complete installer state as rendered by a backend.
type Model struct {
	Title         string `json:"title"`
	App           string `json:"app"`
	Tagline       string `json:"tagline"`
	Headline      string `json:"headline"`
	Subheading    string `json:"subheading"`
	Steps         []Step `json:"steps"`
	Phase         Phase  `json:"phase"`
	Current       int    `json:"current"`
	Done          int    `json:"done"`
	Total         int    `json:"total"`
	Percent       int    `json:"percent"`
	Elapsed       string `json:"elapsed"`
	FooterMeta    string `json:"footerMeta"`
	FooterElapsed string `json:"footerElapsed"`
	LogPath       string `json:"logPath"`
	LogNotice     string `json:"logNotice"`
	VersionLabel  string `json:"versionLabel"`
	DetailsTitle  string `json:"detailsTitle"`
	DetailsBody   string `json:"detailsBody"`
	Warning       string `json:"warning"`
	Version       string `json:"version"`
	Labels        Labels `json:"labels"`
}

// backend is the platform rendering strategy behind a Session.
type backend struct {
	render  func(Model)
	consent func() bool
	close   func()
}

// active reports whether the backend was populated.
func (b backend) active() bool { return b.render != nil }

// Session tracks progress and pushes every change to the active backend.
type Session struct {
	mu      sync.Mutex
	drawMu  sync.Mutex
	model   Model
	started time.Time
	be      backend
	closed  bool
	stopHB  chan struct{}
}

// DefaultSteps returns the install narrative with the active language applied.
func DefaultSteps() []Step {
	return []Step{
		{Title: i18n.T("step.prereq.title"), Detail: i18n.T("step.prereq.detail"), why: i18n.T("step.prereq.why"), State: StatePending},
		{Title: i18n.T("step.cli.title"), Detail: i18n.T("step.cli.detail"), why: i18n.T("step.cli.why"), State: StatePending},
		{Title: i18n.T("step.verify.title"), Detail: i18n.T("step.verify.detail"), why: i18n.T("step.verify.why"), State: StatePending},
		{Title: i18n.T("step.host.title"), Detail: i18n.T("step.host.detail"), why: i18n.T("step.host.why"), State: StatePending},
	}
}

// Start opens the installer UI on the welcome panel.
//
// quiet forces plain text output, which is what CI and non-interactive shells
// want. logPath is shown to the user so they can find it for support.
func Start(steps []Step, logPath string, quiet bool) *Session {
	logNotice := ""
	if logPath != "" {
		logNotice = i18n.Tf("footer.log", logPath)
	}
	s := &Session{
		be: newBackend(quiet),
		model: Model{
			Title:     i18n.T("window.title"),
			App:       i18n.T("app.name"),
			Tagline:   i18n.T("app.tagline"),
			Steps:     steps,
			Phase:     PhaseWelcome,
			Current:   StepPrereq,
			Total:     len(steps),
			LogPath:   logPath,
			LogNotice: logNotice,
			Labels:    labels(),
		},
	}
	s.model.Headline = i18n.T("welcome.title")
	s.model.Subheading = i18n.T("welcome.body")
	s.model.DetailsTitle = i18n.T("welcome.heading")
	s.model.DetailsBody = "• " + i18n.T("welcome.bullet.node") + "\n" +
		"• " + i18n.T("welcome.bullet.cli") + "\n" +
		"• " + i18n.T("welcome.bullet.host") + "\n\n" +
		i18n.T("welcome.note") + "\n\n" +
		i18n.T("welcome.outcome")
	s.draw()
	return s
}

// Consent shows the welcome panel and blocks until the user starts setup.
// It returns false when the user cancels.
func (s *Session) Consent() bool {
	s.draw()
	if s.be.consent == nil || s.be.consent() {
		return true
	}
	s.Cancel()
	return false
}

// Begin marks a step as the one currently running.
func (s *Session) Begin(step int, detail string) {
	s.update(func(m *Model) {
		if step < 0 || step >= len(m.Steps) {
			return
		}
		if m.Phase == PhaseWelcome {
			m.Phase = PhaseRunning
			m.Headline = i18n.T("installer.headline")
			m.Subheading = i18n.T("installer.subheading")
			s.started = time.Now()
			s.startHeartbeat()
		}
		m.Current = step
		m.Steps[step].State = StateActive
		if detail != "" {
			m.Steps[step].Detail = detail
		}
		m.DetailsTitle = i18n.T("details.why")
		m.DetailsBody = m.Steps[step].why
	})
}

// Detail updates the text of the running step without changing its state.
func (s *Session) Detail(step int, detail string) {
	s.update(func(m *Model) {
		if step < 0 || step >= len(m.Steps) || detail == "" {
			return
		}
		m.Steps[step].Detail = detail
	})
}

// Complete marks a step as successfully finished.
func (s *Session) Complete(step int, detail string) {
	s.update(func(m *Model) {
		if step < 0 || step >= len(m.Steps) {
			return
		}
		m.Steps[step].State = StateDone
		if detail != "" {
			m.Steps[step].Detail = detail
		}
	})
}

// Attention marks a step as finished but needing the user's help later.
func (s *Session) Attention(step int, detail string) {
	s.update(func(m *Model) {
		if step < 0 || step >= len(m.Steps) {
			return
		}
		m.Steps[step].State = StateAttention
		if detail != "" {
			m.Steps[step].Detail = detail
		}
	})
}

// Fail stops the installer and shows the reason. It leaves the UI open so the
// user can read the message and find the log.
func (s *Session) Fail(step int, title, message string) {
	s.update(func(m *Model) {
		if step >= 0 && step < len(m.Steps) {
			m.Steps[step].State = StateFailed
			m.Steps[step].Detail = i18n.T("status.stopped")
			m.Current = step
		}
		m.Phase = PhaseFailed
		m.Headline = i18n.T("installer.failheadline")
		m.Subheading = i18n.T("fail.tryagain")
		m.DetailsTitle = title
		m.DetailsBody = message
	})
}

// Finish shows the completion panel with the next steps the user should take.
func (s *Session) Finish(version, warning string) {
	s.update(func(m *Model) {
		for i := range m.Steps {
			if m.Steps[i].State == StatePending || m.Steps[i].State == StateActive {
				m.Steps[i].State = StateDone
			}
		}
		m.Phase = PhaseFinished
		m.Headline = i18n.T("installer.doneheadline")
		m.Subheading = i18n.T("installer.donesubheading")
		m.Version = version
		if version != "" {
			m.VersionLabel = i18n.Tf("done.version", version)
		}
		m.Warning = warning
		m.DetailsTitle = i18n.T("done.next")
		m.DetailsBody = "→ " + i18n.T("done.next.reload") + "\n" +
			"→ " + i18n.T("done.next.help") + "\n" +
			"→ " + i18n.T("done.next.init")
		if warning != "" {
			m.DetailsBody = i18n.T("done.attention.body") + "\n\n" + m.DetailsBody
		}
	})
}

// Cancel closes the UI for an aborted run.
func (s *Session) Cancel() {
	s.update(func(m *Model) {
		m.Phase = PhaseCancelled
		m.Headline = i18n.T("installer.cancelheadline")
		m.Subheading = i18n.T("installer.cancelsubheading")
		m.DetailsTitle = ""
		m.DetailsBody = ""
	})
}

// Close releases the UI. On Windows this waits for the user to close the window
// so the final state stays readable.
func (s *Session) Close() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	s.closed = true
	stopHB := s.stopHB
	closeFn := s.be.close
	s.mu.Unlock()

	if stopHB != nil {
		select {
		case <-stopHB:
		default:
			close(stopHB)
		}
	}
	if closeFn != nil {
		closeFn()
	}
}

func (s *Session) update(fn func(*Model)) {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	fn(&s.model)
	s.mu.Unlock()
	s.draw()
}

func (s *Session) draw() {
	if s.be.render == nil {
		return
	}
	s.drawMu.Lock()
	defer s.drawMu.Unlock()
	s.be.render(s.snapshot())
}

// startHeartbeat refreshes the elapsed clock once a second while setup runs.
// Called with s.mu held.
func (s *Session) startHeartbeat() {
	if s.stopHB != nil {
		return
	}
	s.stopHB = make(chan struct{})
	stop := s.stopHB
	go func() {
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				s.mu.Lock()
				running := !s.closed && s.model.Phase == PhaseRunning
				s.mu.Unlock()
				if running {
					s.draw()
				}
			}
		}
	}()
}

// snapshot returns a copy of the model with the derived fields recomputed.
func (s *Session) snapshot() Model {
	s.mu.Lock()
	defer s.mu.Unlock()

	m := s.model
	m.Steps = make([]Step, len(s.model.Steps))
	copy(m.Steps, s.model.Steps)
	m.Total = len(m.Steps)

	completed := 0
	for _, step := range m.Steps {
		switch step.State {
		case StateDone, StateAttention, StateFailed:
			completed++
		}
	}
	m.Done = completed

	switch m.Phase {
	case PhaseFinished:
		m.Percent = 100
	default:
		m.Percent = completed * 100 / max(m.Total, 1)
		if m.Percent < 3 && m.Phase == PhaseRunning {
			m.Percent = 3
		}
	}

	elapsed := time.Since(s.started)
	if s.started.IsZero() || elapsed < 0 {
		elapsed = 0
	}
	m.Elapsed = formatElapsed(elapsed)
	m.FooterElapsed = fmt.Sprintf(i18n.T("footer.elapsed"), m.Elapsed)
	m.FooterMeta = fmt.Sprintf(i18n.T("footer.step"), min(m.Current+1, max(m.Total, 1)), max(m.Total, 1))
	if m.Phase == PhaseFinished {
		m.FooterMeta = fmt.Sprintf(i18n.T("footer.step"), m.Total, m.Total)
	}
	return m
}

func labels() Labels {
	return Labels{
		Close:    i18n.T("footer.close"),
		OpenLog:  i18n.T("footer.openlog"),
		CopyLog:  i18n.T("footer.copylog"),
		Copied:   i18n.T("footer.copied"),
		Install:  i18n.T("welcome.start"),
		Cancel:   i18n.T("welcome.cancel"),
		KeepOpen: i18n.T("footer.keepopen"),
	}
}

func formatElapsed(d time.Duration) string {
	total := int(d.Seconds())
	if total < 0 {
		total = 0
	}
	return fmt.Sprintf("%02d:%02d", total/60, total%60)
}
