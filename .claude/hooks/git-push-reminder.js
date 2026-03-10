#!/usr/bin/env node
/**
 * git-push-reminder.js — Review reminder before git push
 * PreToolUse hook: warns before pushing to remind you to review changes
 * Also warns specifically about pushing to main/master
 */

const fs = require('fs');
const { log } = require('./_common.js');

async function main() {
  let input = '';

  // Read stdin synchronously
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch (e) {
    process.stdout.write('');
    process.exit(0);
  }

  let toolInput;
  try {
    toolInput = JSON.parse(input);
  } catch (e) {
    process.stdout.write(input);
    process.exit(0);
  }

  const command = toolInput?.tool_input?.command;

  if (!command) {
    process.stdout.write(input);
    process.exit(0);
  }

  // Only process git push commands
  if (!/^git push/.test(command)) {
    process.stdout.write(input);
    process.exit(0);
  }

  // Only warn about pushing to main/master — don't nag on every push
  if (/git push.*(origin|upstream)\s+(main|master)\b/.test(command)) {
    log('[Hook] WARNING: Pushing directly to main/master branch');
    log('[Hook] Consider using a feature branch and PR instead');
  }

  process.stdout.write(input);
  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
