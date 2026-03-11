const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const STATE_DIR = '/tmp/claude-code-sessions';
const STALE_MS = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_MS = 300;

let statusBarItem;
let debounceTimer;
let previousAggregate = 'none';

function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  // Ensure state directory exists
  try { fs.mkdirSync(STATE_DIR, { recursive: true }); } catch (_) {}

  // Initial read
  updateStatusBar();

  // Watch for changes
  try {
    const watcher = fs.watch(STATE_DIR, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateStatusBar, DEBOUNCE_MS);
    });
    context.subscriptions.push({ dispose: () => watcher.close() });
  } catch (_) {
    // Fallback: poll every 2 seconds if fs.watch fails
    const interval = setInterval(updateStatusBar, 2000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
  }

  // Periodic stale cleanup every 60 seconds
  const cleanupInterval = setInterval(cleanupStale, 60000);
  context.subscriptions.push({ dispose: () => clearInterval(cleanupInterval) });
}

function readSessions() {
  const sessions = { waiting: 0, working: 0, idle: 0 };
  let files;
  try {
    files = fs.readdirSync(STATE_DIR).filter(f => f.endsWith('.json'));
  } catch (_) {
    return sessions;
  }

  const now = Date.now();
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(STATE_DIR, file), 'utf8');
      const data = JSON.parse(content);
      const age = now - (data.ts * 1000);
      if (age > STALE_MS) {
        sessions.idle++;
      } else if (data.state === 'waiting') {
        sessions.waiting++;
      } else if (data.state === 'working') {
        sessions.working++;
      } else {
        sessions.idle++;
      }
    } catch (_) {
      // Skip malformed files
    }
  }
  return sessions;
}

function updateStatusBar() {
  const sessions = readSessions();
  const total = sessions.waiting + sessions.working + sessions.idle;

  if (total === 0) {
    statusBarItem.hide();
    previousAggregate = 'none';
    return;
  }

  let aggregate;
  if (sessions.waiting > 0) {
    aggregate = 'waiting';
  } else if (sessions.working > 0) {
    aggregate = 'working';
  } else {
    aggregate = 'idle';
  }

  // Build display text
  const parts = [];
  if (sessions.waiting > 0) parts.push(`${sessions.waiting} waiting`);
  if (sessions.working > 0) parts.push(`${sessions.working} working`);

  let icon, text, bg;
  switch (aggregate) {
    case 'waiting':
      icon = '$(bell)';
      text = `${icon} ${parts.join(', ')}`;
      bg = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'working':
      icon = '$(sync~spin)';
      text = `${icon} ${parts.join(', ')}`;
      bg = undefined;
      break;
    case 'idle':
      icon = '$(check)';
      text = `${icon} Claude: Idle`;
      bg = undefined;
      break;
  }

  statusBarItem.text = text;
  statusBarItem.backgroundColor = bg;
  statusBarItem.tooltip = `Claude Code: ${sessions.waiting} waiting, ${sessions.working} working, ${sessions.idle} idle`;
  statusBarItem.show();

  // Fire notifications on transitions
  if (aggregate === 'waiting' && previousAggregate !== 'waiting') {
    notify('Claude needs your input', 'bell.oga');
  } else if (aggregate === 'idle' && previousAggregate !== 'idle' && previousAggregate !== 'none') {
    notify('All tasks complete', 'complete.oga');
  }

  previousAggregate = aggregate;
}

function notify(message, soundFile) {
  execFile('notify-send', ['--urgency=normal', '--expire-time=3000', '--icon=dialog-information', 'Claude Code', message], () => {});
  execFile('paplay', [`/usr/share/sounds/freedesktop/stereo/${soundFile}`], () => {});
}

function cleanupStale() {
  let files;
  try {
    files = fs.readdirSync(STATE_DIR).filter(f => f.endsWith('.json'));
  } catch (_) {
    return;
  }

  const now = Date.now();
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(STATE_DIR, file), 'utf8');
      const data = JSON.parse(content);
      const age = now - (data.ts * 1000);
      // Clean up files older than 30 minutes
      if (age > 30 * 60 * 1000) {
        fs.unlinkSync(path.join(STATE_DIR, file));
      }
    } catch (_) {}
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
