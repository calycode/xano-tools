// Package i18n holds every user-facing string the installer can show.
//
// English is the source of truth. Each other language only overrides the keys it
// has a translation for, so a missing translation falls back to English instead
// of rendering an empty label or a raw key.
package i18n

import (
	"fmt"
	"os"
	"strings"
	"sync"
)

// Catalog is one language layered on top of the English source text.
type Catalog struct {
	lang      string
	overrides map[string]string
}

var (
	mu      sync.RWMutex
	current = selectCatalog(detectLocale())
)

// Get returns the active catalog.
func Get() Catalog {
	mu.RLock()
	defer mu.RUnlock()
	return current
}

// Set switches the active language and returns the resulting catalog.
// Unknown languages fall back to English. Used by CALYCODE_LANG and by tests.
func Set(lang string) Catalog {
	mu.Lock()
	defer mu.Unlock()
	current = selectCatalog(normalize(lang))
	return current
}

// Lang returns the active language tag.
func (c Catalog) Lang() string { return c.lang }

// T returns the message for key, falling back to English and then to the key.
func (c Catalog) T(key string) string {
	if v, ok := c.overrides[key]; ok && v != "" {
		return v
	}
	if v, ok := english[key]; ok {
		return v
	}
	return key
}

// Tf returns the formatted message for key.
func (c Catalog) Tf(key string, args ...any) string {
	return fmt.Sprintf(c.T(key), args...)
}

// T is shorthand for Get().T(key).
func T(key string) string { return Get().T(key) }

// Tf is shorthand for Get().Tf(key, args...).
func Tf(key string, args ...any) string { return Get().Tf(key, args...) }

// KeyExists reports whether key is part of the English source catalog.
func KeyExists(key string) bool {
	_, ok := english[key]
	return ok
}

func selectCatalog(lang string) Catalog {
	overrides, ok := translations[lang]
	if !ok {
		return Catalog{lang: "en", overrides: nil}
	}
	return Catalog{lang: lang, overrides: overrides}
}

func detectLocale() string {
	for _, key := range []string{"CALYCODE_LANG", "LC_ALL", "LC_MESSAGES", "LANG"} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return normalize(v)
		}
	}
	return "en"
}

// normalize turns "de_DE.UTF-8" or "pt-BR" into "de" or "pt".
func normalize(locale string) string {
	v := strings.ToLower(strings.TrimSpace(locale))
	for _, sep := range []byte{'.', '@', '_', '-'} {
		if i := strings.IndexByte(v, sep); i > 0 {
			v = v[:i]
		}
	}
	return v
}
