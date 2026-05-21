package i18n

import (
	"os"
	"strings"
	"sync"
)

type Catalog struct {
	SetupTitle                   string
	SetupCompleteTitle           string
	InstallerWindowTitle         string
	WelcomeMessage               string
	InstallingNodeDarwinMessage  string
	InstallingNodeWindowsMessage string
	InstallingCLIMessage         string
	ConfiguringNativeHostMessage string
	StepCheckingTitle            string
	StepCheckingDetail           string
	StepInstallDepsTitle         string
	StepInstallDepsDetail        string
	StepInstallCLITitle          string
	StepInstallCLIDetail         string
	StepConfigureTitle           string
	StepConfigureDetail          string
	NodeRequiredTitle            string
	NodeRequiredMessageFmt       string
	NodeInstallFailedTitle       string
	NodeInstallFailedMessage     string
	InstallFailedTitle           string
	InstallFailedMessageFmt      string
	ExtSetupIncompleteTitle      string
	ExtSetupIncompleteMessageFmt string
	SuccessIntro                 string
	SuccessVersionFmt            string
	SuccessNextSteps             string
	SuccessReloadExtensionBullet string
	SuccessRunHelpBulletFmt      string
	SuccessClickOK               string
	SessionProgressFmt           string
	SessionPreparingTitle        string
	SessionPreparingDetail       string
	SessionStepLabelFmtPS        string
	SessionDoneTitle             string
	SessionDoneDetail            string
	NodeInstalledNotInPath       string
	HomebrewInstallFailed        string
	HomebrewInstalledNotInPath   string
	NodeInstallManual            string
	CalyXanoNotFound             string
	TerminalLabelDarwin          string
	TerminalLabelWindows         string
}

var (
	once    sync.Once
	current Catalog
)

func Get() Catalog {
	once.Do(func() {
		current = selectCatalog(detectLocale())
	})
	return current
}

func detectLocale() string {
	for _, key := range []string{"CALYCODE_LANG", "LC_ALL", "LANG"} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			v = strings.ToLower(v)
			if i := strings.IndexByte(v, '.'); i > 0 {
				v = v[:i]
			}
			if i := strings.IndexByte(v, '_'); i > 0 {
				v = v[:i]
			}
			if i := strings.IndexByte(v, '-'); i > 0 {
				v = v[:i]
			}
			return v
		}
	}
	return "en"
}

func selectCatalog(lang string) Catalog {
	switch lang {
	case "es":
		return esCatalog()
	case "de":
		return deCatalog()
	case "fr":
		return frCatalog()
	case "hu":
		return huCatalog()
	case "sr":
		return srCatalog()
	default:
		return enCatalog()
	}
}

func enCatalog() Catalog {
	return Catalog{
		SetupTitle:                   "@calycode/cli Setup",
		SetupCompleteTitle:           "@calycode/cli Setup - Complete",
		InstallerWindowTitle:         "@calycode/cli Installer",
		WelcomeMessage:               "This flow will install the @calycode/cli and configure browser extension integration.\n\nThe process takes 1-2 minutes.\n\nClick OK to continue.",
		InstallingNodeDarwinMessage:  "Node.js 18+ is required but not found.\n\nInstalling Node.js now via Homebrew...\nThis may take a few minutes.\n\nClick OK to proceed.",
		InstallingNodeWindowsMessage: "Node.js 18+ is required but not found.\n\nInstalling Node.js now via Winget...\nThis may take a few minutes.",
		InstallingCLIMessage:         "Installing @calycode/cli...\nThis may take a moment.",
		ConfiguringNativeHostMessage: "Configuring browser extension connection...",
		StepCheckingTitle:            "Checking prerequisites",
		StepCheckingDetail:           "Checking Node.js 18+...",
		StepInstallDepsTitle:         "Installing dependencies",
		StepInstallDepsDetail:        "Node.js not found. Installing Node.js 18+...",
		StepInstallCLITitle:          "Installing @calycode/cli",
		StepInstallCLIDetail:         "Installing @calycode/cli globally...",
		StepConfigureTitle:           "Configuring browser integration",
		StepConfigureDetail:          "Setting up native messaging host...",
		NodeRequiredTitle:            "Node.js Required",
		NodeRequiredMessageFmt:       "Node.js 18+ is required but could not be installed automatically.\n\n%s\n\nPlease install it manually from https://nodejs.org\nThen run this installer again.",
		NodeInstallFailedTitle:       "Node.js Installation Failed",
		NodeInstallFailedMessage:     "Node.js was installed but is not available in PATH.\n\nPlease restart your computer and run this installer again.",
		InstallFailedTitle:           "Installation Failed",
		InstallFailedMessageFmt:      "Could not install @calycode/cli.\n\n%s\n\nCheck your internet connection and try again.\nOr install manually: npm install -g @calycode/cli",
		ExtSetupIncompleteTitle:      "Extension Integration Setup Incomplete",
		ExtSetupIncompleteMessageFmt: "@calycode/cli is installed but the browser extension integration could not be configured.\n\n%s\n\nRun this command in terminal to finish setup:\n    caly-xano opencode init\n\nThen reload your browser.",
		SuccessIntro:                 "@calycode/cli has been installed successfully!\n\n",
		SuccessVersionFmt:            "Version: %s\n\n",
		SuccessNextSteps:             "Next steps:\n",
		SuccessReloadExtensionBullet: "  - Reload your browser\n",
		SuccessRunHelpBulletFmt:      "  - Open %s and run: caly-xano --help\n",
		SuccessClickOK:               "\nClick OK to finish.",
		SessionProgressFmt:           "[@calycode/cli Installer] Step %d/%d - %s: %s",
		SessionPreparingTitle:        "Preparing...",
		SessionPreparingDetail:       "Starting installer",
		SessionStepLabelFmtPS:        "Step {0} of {1}",
		SessionDoneTitle:             "Done",
		SessionDoneDetail:            "Finalizing...",
		NodeInstalledNotInPath:       "Node.js was installed but is not available in PATH. Restart Terminal and try again.",
		HomebrewInstallFailed:        "Failed to install Homebrew. Install it manually from https://brew.sh",
		HomebrewInstalledNotInPath:   "Homebrew was installed but is not available in PATH. Restart Terminal and try again.",
		NodeInstallManual:            "Could not install Node.js. Install it manually from https://nodejs.org",
		CalyXanoNotFound:             "caly-xano command not found",
		TerminalLabelDarwin:          "Terminal",
		TerminalLabelWindows:         "a terminal",
	}
}

func esCatalog() Catalog {
	return Catalog{
		SetupTitle:                   "Configuracion de @calycode/cli",
		SetupCompleteTitle:           "Configuracion de @calycode/cli - Completa",
		InstallerWindowTitle:         "Instalador de @calycode/cli",
		WelcomeMessage:               "Este flujo instalara @calycode/cli y configurara la integracion de la extension del navegador.\n\nEl proceso tarda 1-2 minutos.\n\nHaz clic en OK para continuar.",
		InstallingNodeDarwinMessage:  "Se requiere Node.js 18+ pero no se encontro.\n\nInstalando Node.js con Homebrew...\nEsto puede tardar unos minutos.\n\nHaz clic en OK para continuar.",
		InstallingNodeWindowsMessage: "Se requiere Node.js 18+ pero no se encontro.\n\nInstalando Node.js con Winget...\nEsto puede tardar unos minutos.",
		InstallingCLIMessage:         "Instalando @calycode/cli...\nEsto puede tardar un momento.",
		ConfiguringNativeHostMessage: "Configurando la conexion de la extension del navegador...",
		StepCheckingTitle:            "Verificando requisitos",
		StepCheckingDetail:           "Verificando Node.js 18+...",
		StepInstallDepsTitle:         "Instalando dependencias",
		StepInstallDepsDetail:        "Node.js no encontrado. Instalando Node.js 18+...",
		StepInstallCLITitle:          "Instalando @calycode/cli",
		StepInstallCLIDetail:         "Instalando @calycode/cli globalmente...",
		StepConfigureTitle:           "Configurando integracion del navegador",
		StepConfigureDetail:          "Configurando native messaging host...",
		NodeRequiredTitle:            "Node.js requerido",
		NodeRequiredMessageFmt:       "Node.js 18+ es obligatorio, pero no se pudo instalar automaticamente.\n\n%s\n\nInstalalo manualmente desde https://nodejs.org\nLuego ejecuta este instalador otra vez.",
		NodeInstallFailedTitle:       "Fallo la instalacion de Node.js",
		NodeInstallFailedMessage:     "Node.js se instalo, pero no esta disponible en PATH.\n\nReinicia tu computadora y ejecuta este instalador otra vez.",
		InstallFailedTitle:           "Instalacion fallida",
		InstallFailedMessageFmt:      "No se pudo instalar @calycode/cli.\n\n%s\n\nRevisa tu conexion a internet e intentalo de nuevo.\nO instala manualmente: npm install -g @calycode/cli",
		ExtSetupIncompleteTitle:      "Configuracion de integracion de extension incompleta",
		ExtSetupIncompleteMessageFmt: "@calycode/cli esta instalado, pero no se pudo configurar la integracion de la extension del navegador.\n\n%s\n\nEjecuta este comando en terminal para terminar la configuracion:\n    caly-xano opencode init\n\nLuego recarga tu navegador.",
		SuccessIntro:                 "@calycode/cli se instalo correctamente.\n\n",
		SuccessVersionFmt:            "Version: %s\n\n",
		SuccessNextSteps:             "Siguientes pasos:\n",
		SuccessReloadExtensionBullet: "  - Recarga tu navegador\n",
		SuccessRunHelpBulletFmt:      "  - Abre %s y ejecuta: caly-xano --help\n",
		SuccessClickOK:               "\nHaz clic en OK para finalizar.",
		SessionProgressFmt:           "[Instalador @calycode/cli] Paso %d/%d - %s: %s",
		SessionPreparingTitle:        "Preparando...",
		SessionPreparingDetail:       "Iniciando instalador",
		SessionStepLabelFmtPS:        "Paso {0} de {1}",
		SessionDoneTitle:             "Listo",
		SessionDoneDetail:            "Finalizando...",
		NodeInstalledNotInPath:       "Node.js se instalo, pero no esta disponible en PATH. Reinicia Terminal e intentalo otra vez.",
		HomebrewInstallFailed:        "No se pudo instalar Homebrew. Instalalo manualmente desde https://brew.sh",
		HomebrewInstalledNotInPath:   "Homebrew se instalo, pero no esta disponible en PATH. Reinicia Terminal e intentalo otra vez.",
		NodeInstallManual:            "No se pudo instalar Node.js. Instalalo manualmente desde https://nodejs.org",
		CalyXanoNotFound:             "no se encontro el comando caly-xano",
		TerminalLabelDarwin:          "Terminal",
		TerminalLabelWindows:         "una terminal",
	}
}

func deCatalog() Catalog {
	return Catalog{
		SetupTitle:                   "@calycode/cli Einrichtung",
		SetupCompleteTitle:           "@calycode/cli Einrichtung - Abgeschlossen",
		InstallerWindowTitle:         "@calycode/cli Installer",
		WelcomeMessage:               "Dieser Ablauf installiert @calycode/cli und richtet die Browser-Erweiterungsintegration ein.\n\nDer Vorgang dauert 1-2 Minuten.\n\nKlicke auf OK, um fortzufahren.",
		InstallingNodeDarwinMessage:  "Node.js 18+ ist erforderlich, wurde aber nicht gefunden.\n\nNode.js wird jetzt ueber Homebrew installiert...\nDies kann einige Minuten dauern.\n\nKlicke auf OK, um fortzufahren.",
		InstallingNodeWindowsMessage: "Node.js 18+ ist erforderlich, wurde aber nicht gefunden.\n\nNode.js wird jetzt ueber Winget installiert...\nDies kann einige Minuten dauern.",
		InstallingCLIMessage:         "@calycode/cli wird installiert...\nDas kann einen Moment dauern.",
		ConfiguringNativeHostMessage: "Browser-Erweiterungsverbindung wird konfiguriert...",
		StepCheckingTitle:            "Voraussetzungen werden geprueft",
		StepCheckingDetail:           "Node.js 18+ wird geprueft...",
		StepInstallDepsTitle:         "Abhaengigkeiten werden installiert",
		StepInstallDepsDetail:        "Node.js nicht gefunden. Node.js 18+ wird installiert...",
		StepInstallCLITitle:          "@calycode/cli wird installiert",
		StepInstallCLIDetail:         "@calycode/cli wird global installiert...",
		StepConfigureTitle:           "Browser-Integration wird konfiguriert",
		StepConfigureDetail:          "Native Messaging Host wird eingerichtet...",
		NodeRequiredTitle:            "Node.js erforderlich",
		NodeRequiredMessageFmt:       "Node.js 18+ ist erforderlich, konnte aber nicht automatisch installiert werden.\n\n%s\n\nBitte installiere es manuell von https://nodejs.org\nStarte danach diesen Installer erneut.",
		NodeInstallFailedTitle:       "Node.js Installation fehlgeschlagen",
		NodeInstallFailedMessage:     "Node.js wurde installiert, ist aber im PATH nicht verfuegbar.\n\nBitte starte deinen Computer neu und fuehre diesen Installer erneut aus.",
		InstallFailedTitle:           "Installation fehlgeschlagen",
		InstallFailedMessageFmt:      "@calycode/cli konnte nicht installiert werden.\n\n%s\n\nPruefe deine Internetverbindung und versuche es erneut.\nOder manuell installieren: npm install -g @calycode/cli",
		ExtSetupIncompleteTitle:      "Einrichtung der Erweiterungsintegration unvollstaendig",
		ExtSetupIncompleteMessageFmt: "@calycode/cli ist installiert, aber die Browser-Erweiterungsintegration konnte nicht konfiguriert werden.\n\n%s\n\nFuehre diesen Befehl im Terminal aus, um die Einrichtung abzuschliessen:\n    caly-xano opencode init\n\nLade danach deinen Browser neu.",
		SuccessIntro:                 "@calycode/cli wurde erfolgreich installiert!\n\n",
		SuccessVersionFmt:            "Version: %s\n\n",
		SuccessNextSteps:             "Naechste Schritte:\n",
		SuccessReloadExtensionBullet: "  - Browser neu laden\n",
		SuccessRunHelpBulletFmt:      "  - %s oeffnen und ausfuehren: caly-xano --help\n",
		SuccessClickOK:               "\nKlicke auf OK, um zu beenden.",
		SessionProgressFmt:           "[@calycode/cli Installer] Schritt %d/%d - %s: %s",
		SessionPreparingTitle:        "Wird vorbereitet...",
		SessionPreparingDetail:       "Installer wird gestartet",
		SessionStepLabelFmtPS:        "Schritt {0} von {1}",
		SessionDoneTitle:             "Fertig",
		SessionDoneDetail:            "Wird abgeschlossen...",
		NodeInstalledNotInPath:       "Node.js wurde installiert, ist aber im PATH nicht verfuegbar. Starte das Terminal neu und versuche es erneut.",
		HomebrewInstallFailed:        "Homebrew konnte nicht installiert werden. Bitte installiere es manuell von https://brew.sh",
		HomebrewInstalledNotInPath:   "Homebrew wurde installiert, ist aber im PATH nicht verfuegbar. Starte das Terminal neu und versuche es erneut.",
		NodeInstallManual:            "Node.js konnte nicht installiert werden. Bitte installiere es manuell von https://nodejs.org",
		CalyXanoNotFound:             "Befehl caly-xano nicht gefunden",
		TerminalLabelDarwin:          "Terminal",
		TerminalLabelWindows:         "ein Terminal",
	}
}

func frCatalog() Catalog {
	return Catalog{
		SetupTitle:                   "Configuration de @calycode/cli",
		SetupCompleteTitle:           "Configuration de @calycode/cli - Terminee",
		InstallerWindowTitle:         "Installeur @calycode/cli",
		WelcomeMessage:               "Ce flux va installer @calycode/cli et configurer l'integration de l'extension navigateur.\n\nLe processus prend 1 a 2 minutes.\n\nCliquez sur OK pour continuer.",
		InstallingNodeDarwinMessage:  "Node.js 18+ est requis mais introuvable.\n\nInstallation de Node.js via Homebrew...\nCela peut prendre quelques minutes.\n\nCliquez sur OK pour continuer.",
		InstallingNodeWindowsMessage: "Node.js 18+ est requis mais introuvable.\n\nInstallation de Node.js via Winget...\nCela peut prendre quelques minutes.",
		InstallingCLIMessage:         "Installation de @calycode/cli...\nCela peut prendre un instant.",
		ConfiguringNativeHostMessage: "Configuration de la connexion de l'extension navigateur...",
		StepCheckingTitle:            "Verification des prerequis",
		StepCheckingDetail:           "Verification de Node.js 18+...",
		StepInstallDepsTitle:         "Installation des dependances",
		StepInstallDepsDetail:        "Node.js introuvable. Installation de Node.js 18+...",
		StepInstallCLITitle:          "Installation de @calycode/cli",
		StepInstallCLIDetail:         "Installation globale de @calycode/cli...",
		StepConfigureTitle:           "Configuration de l'integration navigateur",
		StepConfigureDetail:          "Configuration du native messaging host...",
		NodeRequiredTitle:            "Node.js requis",
		NodeRequiredMessageFmt:       "Node.js 18+ est requis mais n'a pas pu etre installe automatiquement.\n\n%s\n\nVeuillez l'installer manuellement depuis https://nodejs.org\nPuis relancez cet installeur.",
		NodeInstallFailedTitle:       "Echec de l'installation de Node.js",
		NodeInstallFailedMessage:     "Node.js a ete installe mais n'est pas disponible dans PATH.\n\nVeuillez redemarrer votre ordinateur puis relancer cet installeur.",
		InstallFailedTitle:           "Echec de l'installation",
		InstallFailedMessageFmt:      "Impossible d'installer @calycode/cli.\n\n%s\n\nVerifiez votre connexion internet et reessayez.\nOu installez manuellement: npm install -g @calycode/cli",
		ExtSetupIncompleteTitle:      "Configuration de l'integration de l'extension incomplete",
		ExtSetupIncompleteMessageFmt: "@calycode/cli est installe mais l'integration de l'extension navigateur n'a pas pu etre configuree.\n\n%s\n\nExecutez cette commande dans le terminal pour terminer la configuration:\n    caly-xano opencode init\n\nPuis rechargez votre navigateur.",
		SuccessIntro:                 "@calycode/cli a ete installe avec succes !\n\n",
		SuccessVersionFmt:            "Version: %s\n\n",
		SuccessNextSteps:             "Etapes suivantes :\n",
		SuccessReloadExtensionBullet: "  - Rechargez votre navigateur\n",
		SuccessRunHelpBulletFmt:      "  - Ouvrez %s et executez : caly-xano --help\n",
		SuccessClickOK:               "\nCliquez sur OK pour terminer.",
		SessionProgressFmt:           "[Installeur @calycode/cli] Etape %d/%d - %s : %s",
		SessionPreparingTitle:        "Preparation...",
		SessionPreparingDetail:       "Demarrage de l'installeur",
		SessionStepLabelFmtPS:        "Etape {0} sur {1}",
		SessionDoneTitle:             "Termine",
		SessionDoneDetail:            "Finalisation...",
		NodeInstalledNotInPath:       "Node.js a ete installe mais n'est pas disponible dans PATH. Redemarrez le Terminal puis reessayez.",
		HomebrewInstallFailed:        "Echec de l'installation de Homebrew. Installez-le manuellement depuis https://brew.sh",
		HomebrewInstalledNotInPath:   "Homebrew a ete installe mais n'est pas disponible dans PATH. Redemarrez le Terminal puis reessayez.",
		NodeInstallManual:            "Impossible d'installer Node.js. Installez-le manuellement depuis https://nodejs.org",
		CalyXanoNotFound:             "commande caly-xano introuvable",
		TerminalLabelDarwin:          "Terminal",
		TerminalLabelWindows:         "un terminal",
	}
}

func huCatalog() Catalog {
	return Catalog{
		SetupTitle:                   "@calycode/cli beallitas",
		SetupCompleteTitle:           "@calycode/cli beallitas - Kesz",
		InstallerWindowTitle:         "@calycode/cli telepito",
		WelcomeMessage:               "Ez a folyamat telepiti a @calycode/cli-t, es beallitja a bongeszo kiegeszito integraciojat.\n\nA folyamat 1-2 percet vesz igenybe.\n\nKattints az OK gombra a folytatashoz.",
		InstallingNodeDarwinMessage:  "Node.js 18+ szukseges, de nem talalhato.\n\nNode.js telepitese Homebrew-vel...\nEz nehany percet igenybe vehet.\n\nKattints az OK gombra a folytatashoz.",
		InstallingNodeWindowsMessage: "Node.js 18+ szukseges, de nem talalhato.\n\nNode.js telepitese Winget-tel...\nEz nehany percet igenybe vehet.",
		InstallingCLIMessage:         "@calycode/cli telepitese...\nEz eltarthat egy rovid ideig.",
		ConfiguringNativeHostMessage: "Bongeszo kiegeszito kapcsolat beallitasa...",
		StepCheckingTitle:            "Elofeltetelek ellenorzese",
		StepCheckingDetail:           "Node.js 18+ ellenorzese...",
		StepInstallDepsTitle:         "Fuggosegek telepitese",
		StepInstallDepsDetail:        "Node.js nem talalhato. Node.js 18+ telepitese...",
		StepInstallCLITitle:          "@calycode/cli telepitese",
		StepInstallCLIDetail:         "@calycode/cli globalis telepitese...",
		StepConfigureTitle:           "Bongeszo integracio beallitasa",
		StepConfigureDetail:          "Native messaging host beallitasa...",
		NodeRequiredTitle:            "Node.js szukseges",
		NodeRequiredMessageFmt:       "Node.js 18+ szukseges, de automatikusan nem sikerult telepiteni.\n\n%s\n\nKerlek telepitsd kezzel innen: https://nodejs.org\nEzutan futtasd ujra ezt a telepitot.",
		NodeInstallFailedTitle:       "Node.js telepitese sikertelen",
		NodeInstallFailedMessage:     "A Node.js telepitve lett, de PATH-ban nem erheto el.\n\nInditsd ujra a gepet, majd futtasd ujra ezt a telepitot.",
		InstallFailedTitle:           "Telepites sikertelen",
		InstallFailedMessageFmt:      "Nem sikerult telepiteni a @calycode/cli-t.\n\n%s\n\nEllenorizd az internetkapcsolatot, majd probald ujra.\nVagy telepitsd kezzel: npm install -g @calycode/cli",
		ExtSetupIncompleteTitle:      "Kiegeszito integracio beallitasa nem teljes",
		ExtSetupIncompleteMessageFmt: "A @calycode/cli telepitve van, de a bongeszo kiegeszito integraciojat nem sikerult beallitani.\n\n%s\n\nA beallitas befejezesehez futtasd ezt a parancsot terminalban:\n    caly-xano opencode init\n\nEzutan toltsd ujra a bongeszot.",
		SuccessIntro:                 "A @calycode/cli sikeresen telepitve lett!\n\n",
		SuccessVersionFmt:            "Verzio: %s\n\n",
		SuccessNextSteps:             "Kovetkezo lepesek:\n",
		SuccessReloadExtensionBullet: "  - Toltsd ujra a bongeszot\n",
		SuccessRunHelpBulletFmt:      "  - Nyisd meg: %s, es futtasd: caly-xano --help\n",
		SuccessClickOK:               "\nKattints az OK gombra a befejezeshez.",
		SessionProgressFmt:           "[@calycode/cli telepito] Lepes %d/%d - %s: %s",
		SessionPreparingTitle:        "Elokeszites...",
		SessionPreparingDetail:       "Telepito inditasa",
		SessionStepLabelFmtPS:        "{0}. lepes / {1}",
		SessionDoneTitle:             "Kesz",
		SessionDoneDetail:            "Befejezes...",
		NodeInstalledNotInPath:       "A Node.js telepitve lett, de PATH-ban nem erheto el. Inditsd ujra a Terminalt, majd probald ujra.",
		HomebrewInstallFailed:        "A Homebrew telepitese sikertelen. Telepitsd kezzel innen: https://brew.sh",
		HomebrewInstalledNotInPath:   "A Homebrew telepitve lett, de PATH-ban nem erheto el. Inditsd ujra a Terminalt, majd probald ujra.",
		NodeInstallManual:            "Nem sikerult telepiteni a Node.js-t. Telepitsd kezzel innen: https://nodejs.org",
		CalyXanoNotFound:             "caly-xano parancs nem talalhato",
		TerminalLabelDarwin:          "Terminal",
		TerminalLabelWindows:         "egy terminal",
	}
}

func srCatalog() Catalog {
	return Catalog{
		SetupTitle:                   "@calycode/cli podesavanje",
		SetupCompleteTitle:           "@calycode/cli podesavanje - Zavrseno",
		InstallerWindowTitle:         "@calycode/cli instalater",
		WelcomeMessage:               "Ovaj tok ce instalirati @calycode/cli i podesiti integraciju ekstenzije pregledaca.\n\nProces traje 1-2 minuta.\n\nKliknite OK za nastavak.",
		InstallingNodeDarwinMessage:  "Node.js 18+ je obavezan, ali nije pronadjen.\n\nInstalacija Node.js preko Homebrew...\nOvo moze potrajati nekoliko minuta.\n\nKliknite OK za nastavak.",
		InstallingNodeWindowsMessage: "Node.js 18+ je obavezan, ali nije pronadjen.\n\nInstalacija Node.js preko Winget...\nOvo moze potrajati nekoliko minuta.",
		InstallingCLIMessage:         "Instalacija @calycode/cli...\nOvo moze potrajati trenutak.",
		ConfiguringNativeHostMessage: "Podesavanje veze sa ekstenzijom pregledaca...",
		StepCheckingTitle:            "Provera preduslova",
		StepCheckingDetail:           "Provera Node.js 18+...",
		StepInstallDepsTitle:         "Instalacija zavisnosti",
		StepInstallDepsDetail:        "Node.js nije pronadjen. Instalacija Node.js 18+...",
		StepInstallCLITitle:          "Instalacija @calycode/cli",
		StepInstallCLIDetail:         "Globalna instalacija @calycode/cli...",
		StepConfigureTitle:           "Podesavanje integracije pregledaca",
		StepConfigureDetail:          "Podesavanje native messaging host-a...",
		NodeRequiredTitle:            "Node.js je obavezan",
		NodeRequiredMessageFmt:       "Node.js 18+ je obavezan, ali nije mogao automatski da se instalira.\n\n%s\n\nInstalirajte ga rucno sa https://nodejs.org\nZatim ponovo pokrenite ovaj instalater.",
		NodeInstallFailedTitle:       "Instalacija Node.js nije uspela",
		NodeInstallFailedMessage:     "Node.js je instaliran, ali nije dostupan u PATH-u.\n\nRestartujte racunar i ponovo pokrenite ovaj instalater.",
		InstallFailedTitle:           "Instalacija nije uspela",
		InstallFailedMessageFmt:      "Nije moguce instalirati @calycode/cli.\n\n%s\n\nProverite internet vezu i pokusajte ponovo.\nIli instalirajte rucno: npm install -g @calycode/cli",
		ExtSetupIncompleteTitle:      "Podesavanje integracije ekstenzije nije kompletno",
		ExtSetupIncompleteMessageFmt: "@calycode/cli je instaliran, ali integracija ekstenzije pregledaca nije mogla da se podesi.\n\n%s\n\nPokrenite ovu komandu u terminalu da zavrsite podesavanje:\n    caly-xano opencode init\n\nZatim osvezite pregledac.",
		SuccessIntro:                 "@calycode/cli je uspesno instaliran!\n\n",
		SuccessVersionFmt:            "Verzija: %s\n\n",
		SuccessNextSteps:             "Sledeci koraci:\n",
		SuccessReloadExtensionBullet: "  - Osvezite pregledac\n",
		SuccessRunHelpBulletFmt:      "  - Otvorite %s i pokrenite: caly-xano --help\n",
		SuccessClickOK:               "\nKliknite OK za kraj.",
		SessionProgressFmt:           "[@calycode/cli instalater] Korak %d/%d - %s: %s",
		SessionPreparingTitle:        "Priprema...",
		SessionPreparingDetail:       "Pokretanje instalatera",
		SessionStepLabelFmtPS:        "Korak {0} od {1}",
		SessionDoneTitle:             "Gotovo",
		SessionDoneDetail:            "Zavrsavanje...",
		NodeInstalledNotInPath:       "Node.js je instaliran, ali nije dostupan u PATH-u. Restartujte Terminal i pokusajte ponovo.",
		HomebrewInstallFailed:        "Instalacija Homebrew nije uspela. Instalirajte ga rucno sa https://brew.sh",
		HomebrewInstalledNotInPath:   "Homebrew je instaliran, ali nije dostupan u PATH-u. Restartujte Terminal i pokusajte ponovo.",
		NodeInstallManual:            "Nije moguce instalirati Node.js. Instalirajte ga rucno sa https://nodejs.org",
		CalyXanoNotFound:             "komanda caly-xano nije pronadjena",
		TerminalLabelDarwin:          "Terminal",
		TerminalLabelWindows:         "terminal",
	}
}
