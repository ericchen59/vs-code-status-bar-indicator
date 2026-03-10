# Claude Code VS Code Status Bar Indicator

A VS Code status bar indicator that shows the aggregate state of all your Claude Code conversations at a glance. Never miss a waiting prompt again.

## What It Does

When you run multiple Claude Code conversations in VS Code, the only way to check which ones need attention is opening the sidebar dropdown. This extension adds a persistent status bar indicator that shows:

| State | Status Bar | Notification |
|-------|-----------|-------------|
| Waiting for input | `[bell] 1 waiting, 2 working` (yellow) | Toast + bell sound |
| Working | `[spin] 3 working` | -- |
| All idle | `[check] Claude: Idle` | Toast + complete sound |
| No sessions | Hidden | -- |

**Priority:** If *any* session is waiting, the indicator shows waiting (yellow). This ensures you always unblock Claude first.

## How It Works

Two components:

1. **Claude Code hooks** (`update-state.sh`) -- Write per-session state to `/tmp/claude-code-sessions/{session_id}.json` whenever Claude changes state
2. **VS Code extension** (`extension.js`) -- Watches the state directory and updates the status bar with aggregated counts

### Hook-to-State Mapping

| Hook Event | Matcher | State |
|-----------|---------|-------|
| UserPromptSubmit | `*` | working |
| PreToolUse | `AskUserQuestion\|Bash\|Write\|Edit` | waiting |
| PostToolUse | `Bash\|Write\|Edit` | working |
| Notification | `*` | waiting |
| Stop | `*` | idle |
| SessionEnd | `*` | delete |

The `PreToolUse`/`PostToolUse` pairing catches permission prompts: PreToolUse sets "waiting" before the permission dialog, PostToolUse sets "working" after approval. For auto-approved tools, both fire within milliseconds and the 300ms debounce prevents flickering.

## Requirements

- VS Code with Claude Code extension
- Linux (uses `notify-send` and `paplay` for notifications)
- `jq` for JSON parsing in hooks

## Installation

```bash
git clone https://github.com/ericchen59/vs-code-status-bar-indicator.git
cd vs-code-status-bar-indicator
bash install.sh
```

Then merge the hooks config into your `~/.claude/settings.json`. See `hooks/claude-hooks-example.json` for the full hooks configuration to add.

After installation:
1. Reload VS Code (Ctrl+Shift+P -> "Developer: Reload Window")
2. Restart Claude Code sessions (hooks load at session start)

## File Structure

```
vs-code-status-bar-indicator/
  extension/
    package.json      # VS Code extension manifest
    extension.js      # Extension logic (~160 lines)
  hooks/
    update-state.sh               # Hook script called by Claude Code
    claude-hooks-example.json     # Example hooks config for settings.json
  install.sh          # Installation script
  README.md
```

## Configuration

### Notifications

The extension fires desktop notifications via `notify-send` and audio via `paplay` using freedesktop sounds:
- **Waiting transition:** `bell.oga`
- **All idle transition:** `complete.oga`

### Staleness

Sessions with no update in 5 minutes are treated as idle. Session files older than 30 minutes are automatically cleaned up.

## Known Limitations

- Linux only (notifications use `notify-send` + `paplay`)
- Hook-based state tracking may have slight delay compared to the extension's native session dots
- If Claude crashes without firing `Stop`/`SessionEnd`, the session is treated as idle after 5 minutes

## License

MIT
