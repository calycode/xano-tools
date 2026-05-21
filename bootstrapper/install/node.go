package install

import (
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

const MinNodeVersion = 18

// NodeVersion holds a parsed Node.js semver major version.
type NodeVersion struct {
	Major int
	Raw   string
	Found bool
}

// CheckNode returns the installed Node.js version, or a zero value if not found.
func CheckNode() NodeVersion {
	cmd := exec.Command("node", "--version")
	out, err := cmd.Output()
	if err != nil {
		return NodeVersion{}
	}
	raw := strings.TrimSpace(string(out))
	verStr := strings.TrimPrefix(raw, "v")
	parts := strings.SplitN(verStr, ".", 2)
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return NodeVersion{Raw: raw, Found: true}
	}
	return NodeVersion{Major: major, Raw: raw, Found: true}
}

// NodeOK returns true if Node.js >= MinNodeVersion is installed.
func NodeOK() bool {
	v := CheckNode()
	return v.Found && v.Major >= MinNodeVersion
}

// CommandExists checks if a command is available in PATH.
func CommandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

// IsWindows returns true on Windows.
func IsWindows() bool {
	return runtime.GOOS == "windows"
}

// IsDarwin returns true on macOS.
func IsDarwin() bool {
	return runtime.GOOS == "darwin"
}
