#!/bin/bash
# Unix/macOS installer entrypoint.
# Delegates to the existing shared installer implementation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "${SCRIPT_DIR}/install.sh" "$@"
