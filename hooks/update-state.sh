#!/bin/bash
# Usage: echo '<hook-json>' | bash update-state.sh <state>
# States: working, waiting, idle, delete
set -euo pipefail

STATE_DIR="/tmp/claude-code-sessions"
mkdir -p "$STATE_DIR"

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')

if [ -z "$session_id" ]; then
  exit 0
fi

state="$1"

if [ "$state" = "delete" ]; then
  rm -f "$STATE_DIR/$session_id.json"
else
  echo "{\"state\":\"$state\",\"ts\":$(date +%s)}" > "$STATE_DIR/$session_id.json"
  # Stop hook requires approval JSON on stdout
  if [ "$state" = "idle" ]; then
    echo '{"decision": "approve"}'
  fi
fi
