# CalyCode Bootstrapper Build
# Produces standalone installers for Windows (exe) and macOS (macho binary).
#
# Prerequisites: Go 1.26+
#
# Usage:
#   make all          Build all targets
#   make windows      Build Windows .exe (from any OS)
#   make darwin-amd64 Build macOS Intel binary
#   make darwin-arm64 Build macOS Apple Silicon binary
#   make test         Run the bootstrapper unit tests
#   make preview      Run the UI against a scripted state (any stage via STAGE=)
#   make clean        Remove build artifacts

OUT_DIR    := dist
BINARY     := calycode-installer
MODULE     := github.com/calycode/xano-tools/bootstrapper
VERSION    ?= $(patsubst @calycode/cli@%,%,$(shell git describe --tags --always --dirty 2>/dev/null || echo dev))
LDFLAGS    := -s -w -X main.version=$(VERSION)
STAGE      ?= welcome

.PHONY: all windows darwin-amd64 darwin-arm64 test preview clean

all: windows darwin-amd64 darwin-arm64

$(OUT_DIR):
	mkdir -p $(OUT_DIR)

windows: $(OUT_DIR)
	@echo "Building Windows x64 ($(VERSION))..."
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build \
		-ldflags "$(LDFLAGS) -H=windowsgui" \
		-o $(OUT_DIR)/$(BINARY)-windows-x64.exe \
		$(MODULE)

darwin-amd64: $(OUT_DIR)
	@echo "Building macOS Intel x64 ($(VERSION))..."
	GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build \
		-ldflags "$(LDFLAGS)" \
		-o $(OUT_DIR)/$(BINARY)-darwin-x64 \
		$(MODULE)
	cd $(OUT_DIR) && zip -9 $(BINARY)-darwin-x64.zip $(BINARY)-darwin-x64

darwin-arm64: $(OUT_DIR)
	@echo "Building macOS Apple Silicon ($(VERSION))..."
	GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build \
		-ldflags "$(LDFLAGS)" \
		-o $(OUT_DIR)/$(BINARY)-darwin-arm64 \
		$(MODULE)
	cd $(OUT_DIR) && zip -9 $(BINARY)-darwin-arm64.zip $(BINARY)-darwin-arm64

test:
	go test ./...

preview:
	go run ./preview -stage $(STAGE)

clean:
	rm -rf $(OUT_DIR)
