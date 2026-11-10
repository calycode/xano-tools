package i18n

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// A translation that names a key which does not exist in English is dead weight
// and almost always a typo.
func TestTranslationsOnlyOverrideKnownKeys(t *testing.T) {
	for lang, overrides := range translations {
		for key := range overrides {
			if !KeyExists(key) {
				t.Errorf("%s overrides unknown key %q", lang, key)
			}
		}
	}
}

// A translation that drops a format verb would render "%!s(MISSING)" to users.
func TestTranslationsKeepFormatVerbs(t *testing.T) {
	verb := regexp.MustCompile(`%[a-zA-Z]`)
	for lang, overrides := range translations {
		for key, value := range overrides {
			want := len(verb.FindAllString(english[key], -1))
			got := len(verb.FindAllString(value, -1))
			if want != got {
				t.Errorf("%s/%s: English has %d format verbs, translation has %d (%q)", lang, key, want, got, value)
			}
		}
	}
}

func TestEveryLanguageFillsEveryKey(t *testing.T) {
	for lang, overrides := range translations {
		for key := range english {
			if strings.TrimSpace(overrides[key]) == "" {
				t.Errorf("%s is missing a translation for %q", lang, key)
			}
		}
	}
}

// Every key referenced from Go source must exist, so a typo surfaces in `go test`
// instead of as a raw key in the installer window.
func TestSourceKeysExist(t *testing.T) {
	call := regexp.MustCompile(`\bT(?:f)?\("([a-z0-9]+(?:\.[a-z0-9]+)+)"`)
	root := filepath.Join("..", "..")

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			switch d.Name() {
			case "node_modules", "dist", ".git", "vendor":
				return filepath.SkipDir
			}
			return nil
		}
		if filepath.Ext(path) != ".go" || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, match := range call.FindAllStringSubmatch(string(src), -1) {
			if !KeyExists(match[1]) {
				t.Errorf("%s references unknown message key %q", path, match[1])
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("scanning source for message keys: %v", err)
	}
}

func TestFallbackToEnglish(t *testing.T) {
	partial := Catalog{lang: "xx", overrides: map[string]string{"app.name": "Test"}}
	if got := partial.T("app.name"); got != "Test" {
		t.Errorf("override not used: %q", got)
	}
	if got := partial.T("app.tagline"); got != english["app.tagline"] {
		t.Errorf("expected English fallback, got %q", got)
	}
	if got := partial.T("no.such.key"); got != "no.such.key" {
		t.Errorf("expected key echo, got %q", got)
	}
}

func TestNormalize(t *testing.T) {
	cases := map[string]string{
		"de_DE.UTF-8": "de",
		"pt-BR":       "pt",
		"FR":          "fr",
		"sr@latin":    "sr",
		"":            "",
	}
	for in, want := range cases {
		if got := normalize(in); got != want {
			t.Errorf("normalize(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSetSelectsSupportedLanguages(t *testing.T) {
	defer Set("en")
	if got := Set("hu"); got.Lang() != "hu" || got.T("app.name") == "app.name" {
		t.Errorf("expected Hungarian catalog, got %q", got.Lang())
	}
	if got := Set("klingon"); got.Lang() != "en" {
		t.Errorf("expected English fallback for unknown language, got %q", got.Lang())
	}
}
