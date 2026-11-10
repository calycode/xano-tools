package install

import (
	"context"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

// MinNodeVersion is the oldest Node.js release the CLI supports.
const MinNodeVersion = 18

// NodeVersion holds a parsed Node.js version.
type NodeVersion struct {
	Major int
	Raw   string
	Found bool
}

// ParseNodeVersion reads the output of `node --version` ("v20.11.0").
func ParseNodeVersion(raw string) NodeVersion {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return NodeVersion{}
	}
	verStr := strings.TrimPrefix(raw, "v")
	parts := strings.SplitN(verStr, ".", 2)
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return NodeVersion{Raw: raw, Found: true}
	}
	return NodeVersion{Major: major, Raw: raw, Found: true}
}

// OK reports whether this Node.js is new enough for the CLI.
func (v NodeVersion) OK() bool { return v.Found && v.Major >= MinNodeVersion }

// CheckNode returns the installed Node.js version, or a zero value when absent.
func CheckNode() NodeVersion {
	out, err := quickOutput("node", "--version")
	if err != nil {
		return NodeVersion{}
	}
	return ParseNodeVersion(out)
}

// NodeOK reports whether a supported Node.js is installed.
func NodeOK() bool { return CheckNode().OK() }

// CheckNpm returns the npm version when npm is usable.
func CheckNpm() (string, bool) {
	out, err := quickOutput("npm", "--version")
	if err != nil {
		return "", false
	}
	return out, true
}

// CheckCLI returns the installed caly-xano version.
func CheckCLI() (string, bool) {
	out, err := quickOutput("caly-xano", "--version")
	if err != nil {
		return "", false
	}
	return strings.TrimSpace(out), out != ""
}

// CommandExists reports whether a command is available in PATH.
func CommandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// IsWindows reports whether the installer runs on Windows.
func IsWindows() bool { return runtime.GOOS == "windows" }

// IsDarwin reports whether the installer runs on macOS.
func IsDarwin() bool { return runtime.GOOS == "darwin" }

// quickOutput runs a short informational command (version probes) without
// touching the setup log: these run often and their output is already surfaced
// in the UI.
func quickOutput(name string, args ...string) (string, error) {
	cmd := buildCommand(context.Background(), name, args...)
	setupSilent(cmd)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}
