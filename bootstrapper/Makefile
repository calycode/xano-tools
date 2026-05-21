# CalyCode Bootstrapper Build
# Produces standalone installers for Windows (exe) and macOS (macho binary).
#
# Prerequisites: Go 1.21+
#
# Usage:
#   make all          Build all targets
#   make windows      Build Windows .exe (from any OS)
#   make darwin-amd64 Build macOS Intel binary
#   make darwin-arm64 Build macOS Apple Silicon binary
#   make clean        Remove build artifacts

OUT_DIR    := dist
BINARY     := calycode-installer
MODULE     := github.com/calycode/xano-tools/bootstrapper

.PHONY: all windows darwin-amd64 darwin-arm64 clean

all: windows darwin-amd64 darwin-arm64

windows:
	@echo "Building Windows x64..."
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build \
		-ldflags "-s -w -H=windowsgui" \
		-o $(OUT_DIR)/$(BINARY)-windows-x64.exe \
		$(MODULE)

darwin-amd64:
	@echo "Building macOS Intel x64..."
	GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build \
		-ldflags "-s -w" \
		-o $(OUT_DIR)/$(BINARY)-darwin-x64 \
		$(MODULE)
	cd $(OUT_DIR) && zip -9 $(BINARY)-darwin-x64.zip $(BINARY)-darwin-x64

darwin-arm64:
	@echo "Building macOS Apple Silicon..."
	GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build \
		-ldflags "-s -w" \
		-o $(OUT_DIR)/$(BINARY)-darwin-arm64 \
		$(MODULE)
	cd $(OUT_DIR) && zip -9 $(BINARY)-darwin-arm64.zip $(BINARY)-darwin-arm64

clean:
	rm -rf $(OUT_DIR)
