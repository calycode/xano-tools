//go:build !windows && !darwin

package ui

// Stub implementations for unsupported platforms.

func ShowWelcome()                     {}
func ShowInstallingNode()              {}
func ShowInstallingCLI()               {}
func ShowConfiguringNativeHost()        {}
func ShowError(title, message string)  {}
func ShowWarning(title, message string) {}
func ShowSuccess(cliVersion string)     {}
