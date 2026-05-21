package install

import "github.com/calycode/xano-tools/bootstrapper/i18n"

var msg = i18n.Get()

func SetMessages(c i18n.Catalog) {
	msg = c
}
