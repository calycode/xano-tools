package install

import "testing"

func TestParseNodeVersion(t *testing.T) {
	cases := []struct {
		raw   string
		major int
		found bool
		ok    bool
	}{
		{"v20.11.0", 20, true, true},
		{"v18.0.0", 18, true, true},
		{"v16.20.2", 16, true, false},
		{"v22", 22, true, true},
		{"  v24.1.0\n", 24, true, true},
		{"", 0, false, false},
		{"garbage", 0, true, false},
	}
	for _, tc := range cases {
		got := ParseNodeVersion(tc.raw)
		if got.Found != tc.found || got.Major != tc.major || got.OK() != tc.ok {
			t.Errorf("ParseNodeVersion(%q) = %+v (ok=%v), want major=%d found=%v ok=%v",
				tc.raw, got, got.OK(), tc.major, tc.found, tc.ok)
		}
	}
}

func TestTailKeepsTheEnd(t *testing.T) {
	short := "npm ERR! one line"
	if got := tail(short, 100); got != short {
		t.Errorf("short text should be unchanged, got %q", got)
	}
	long := "aaa0123456789"
	if got := tail(long, 5); got != "...56789" {
		t.Errorf("tail = %q, want ...56789", got)
	}
}

func TestLogDirHonoursOverride(t *testing.T) {
	t.Setenv("CALYCODE_LOG_DIR", `C:\custom\logs`)
	if got := logDir(); got != `C:\custom\logs` {
		t.Errorf("logDir = %q, want the CALYCODE_LOG_DIR override", got)
	}
}
