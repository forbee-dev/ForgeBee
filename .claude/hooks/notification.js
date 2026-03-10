#!/usr/bin/env node
/**
 * notification.js — Send OS notification when Claude needs attention
 */

const { execSync } = require('child_process');

try {
  if (process.platform === 'darwin') {
    execSync('osascript -e \'display notification "Claude Code needs your attention" with title "Claude Code"\'', { stdio: 'pipe' });
  } else {
    execSync('notify-send "Claude Code" "Needs your attention"', { stdio: 'pipe' });
  }
} catch {
  // Notification failed silently — not critical
}
