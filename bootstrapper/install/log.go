package install

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/calycode/xano-tools/bootstrapper/i18n"
)

// Timeouts keep a stuck package manager from freezing the installer forever.
const (
	nodeInstallTimeout = 25 * time.Minute
	cliInstallTimeout  = 10 * time.Minute
	verifyTimeout      = 2 * time.Minute
	nativeHostTimeout  = 10 * time.Minute
)

var (
	logMu   sync.Mutex
	logFile *os.File
	logPath string
)

// OpenLog starts the setup log and returns its path. A missing log is not fatal:
// the installer continues and the UI simply shows no path.
func OpenLog() string {
	logMu.Lock()
	if logFile != nil {
		path := logPath
		logMu.Unlock()
		return path
	}
	dir := logDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		logMu.Unlock()
		return ""
	}
	path := filepath.Join(dir, "installer-"+time.Now().Format("20060102-150405")+".log")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		logMu.Unlock()
		return ""
	}
	logFile = f
	logPath = path
	logMu.Unlock()

	Logf("%s installer", i18n.T("app.name"))
	Logf("os: %s/%s", runtime.GOOS, runtime.GOARCH)
	Logf("lang: %s", i18n.Get().Lang())
	return path
}

// LogPath returns the active setup log path, or an empty string.
func LogPath() string {
	logMu.Lock()
	defer logMu.Unlock()
	return logPath
}

// CloseLog flushes and closes the setup log.
func CloseLog() {
	logMu.Lock()
	defer logMu.Unlock()
	if logFile != nil {
		_ = logFile.Close()
		logFile = nil
	}
}

// Logf appends one timestamped line to the setup log.
func Logf(format string, args ...any) {
	logMu.Lock()
	defer logMu.Unlock()
	if logFile == nil {
		return
	}
	fmt.Fprintf(logFile, "%s %s\n", time.Now().Format("15:04:05"), fmt.Sprintf(format, args...))
}

// runCmd executes a command with a timeout and records everything it said.
//
// The returned error already carries a user-facing message, including the
// timeout case, so callers can show it without translating anything further.
func runCmd(label string, timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := buildCommand(ctx, name, args...)
	setupSilent(cmd)

	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	Logf("$ %s %s", name, strings.Join(args, " "))
	start := time.Now()
	err := cmd.Run()
	Logf("  finished in %s (%s)", time.Since(start).Round(time.Millisecond), describeExit(err))
	logOutput := strings.TrimSpace(stdout.String())
	if logOutput != "" {
		Logf("  stdout:\n%s", indent(logOutput))
	}
	errOutput := strings.TrimSpace(stderr.String())
	if errOutput != "" {
		Logf("  stderr:\n%s", indent(errOutput))
	}

	if ctx.Err() == context.DeadlineExceeded {
		if errOutput != "" {
			return "", fmt.Errorf("%s\n\n%s", i18n.Tf("install.timeout", label), tail(errOutput, 1200))
		}
		return "", errors.New(i18n.Tf("install.timeout", label))
	}
	if err != nil {
		if errOutput != "" {
			return "", errors.New(tail(errOutput, 1200))
		}
		return "", err
	}
	return strings.TrimSpace(stdout.String()), nil
}

func describeExit(err error) string {
	if err == nil {
		return "ok"
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return fmt.Sprintf("exit code %d", exitErr.ExitCode())
	}
	return err.Error()
}

func indent(text string) string {
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = "    " + line
	}
	return strings.Join(lines, "\n")
}

// tail keeps the last max characters of a command's output. Package managers
// can be extremely verbose, and a dialog should show the part that matters.
func tail(text string, max int) string {
	text = strings.TrimSpace(text)
	if len(text) <= max {
		return text
	}
	return "..." + text[len(text)-max:]
}

func logDir() string {
	if v := strings.TrimSpace(os.Getenv("CALYCODE_LOG_DIR")); v != "" {
		return v
	}
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "darwin":
		if home != "" {
			return filepath.Join(home, "Library", "Logs", "CalyCode")
		}
	case "windows":
		if local, err := os.UserCacheDir(); err == nil && local != "" {
			return filepath.Join(local, "CalyCode", "logs")
		}
	}
	if base, err := os.UserConfigDir(); err == nil && base != "" {
		return filepath.Join(base, "CalyCode", "logs")
	}
	return filepath.Join(os.TempDir(), "CalyCode", "logs")
}
