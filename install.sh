#!/bin/bash
# Install Claude Code VS Code Status Bar Indicator
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Claude Code Status Indicator..."

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required. Install it with your package manager:"
  echo "  Arch: sudo pacman -S jq"
  echo "  Ubuntu/Debian: sudo apt install jq"
  echo "  macOS: brew install jq"
  exit 1
fi

# Install VS Code extension
EXT_DIR="$HOME/.vscode/extensions/local.claude-status-0.1.0"
mkdir -p "$EXT_DIR"
cp "$SCRIPT_DIR/extension/package.json" "$EXT_DIR/"
cp "$SCRIPT_DIR/extension/extension.js" "$EXT_DIR/"
echo "  VS Code extension installed to $EXT_DIR"

# Install hook script
HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DIR"
cp "$SCRIPT_DIR/hooks/update-state.sh" "$HOOKS_DIR/"
chmod +x "$HOOKS_DIR/update-state.sh"
echo "  Hook script installed to $HOOKS_DIR/update-state.sh"

# Create state directory
mkdir -p /tmp/claude-code-sessions
echo "  State directory created at /tmp/claude-code-sessions/"

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Add hooks to ~/.claude/settings.json (see hooks/claude-hooks-example.json)"
echo "  2. Reload VS Code (Ctrl+Shift+P -> 'Developer: Reload Window')"
echo "  3. Restart Claude Code sessions for hooks to take effect"
