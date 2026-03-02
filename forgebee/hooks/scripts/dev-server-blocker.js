#!/usr/bin/env node
/**
 * dev-server-blocker.js — Block dev servers outside tmux
 * PreToolUse hook: prevents long-running dev servers from being started
 * directly, which would block the Claude session. Suggests tmux instead.
 *
 * Exit code 2 = block the command
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

  // Check if already in tmux
  if (process.env.TMUX) {
    process.stdout.write(input);
    process.exit(0);
  }

  // Dev server patterns (long-running, will block session)
  const devServerPatterns = [
    'npm run dev',
    'pnpm dev',
    'pnpm run dev',
    'yarn dev',
    'bun run dev',
    'npx next dev',
    'npx vite',
    'npx nuxt dev',
    'php artisan serve',
    'wp server',
    'python manage.py runserver',
    'python -m http.server',
    'flask run',
    'uvicorn .* --reload',
    'nodemon',
    'ts-node-dev',
    'tsx watch',
  ];

  for (const pattern of devServerPatterns) {
    const regex = new RegExp(`(^|&&\\s*|;\\s*)${pattern}(\\s|$|&)`, 'i');
    if (regex.test(command)) {
      log(
        '[Hook] BLOCKED: Dev server must run in tmux to avoid blocking the session'
      );
      log(`[Hook] Use: tmux new-session -d -s dev "${command}"`);
      log('[Hook] Then: tmux attach -t dev  (to view logs)');
      process.exit(2);
    }
  }

  // Suggest tmux for other long-running commands (non-blocking)
  const longRunningPatterns = [
    'npm install',
    'pnpm install',
    'yarn install',
    'composer install',
    'composer update',
    'docker build',
    'docker-compose up',
    'docker compose up',
  ];

  for (const pattern of longRunningPatterns) {
    const regex = new RegExp(`(^|&&\\s*|;\\s*)${pattern}(\\s|$)`, 'i');
    if (regex.test(command)) {
      log('[Hook] Consider running in tmux for session persistence:');
      log(`[Hook] tmux new-session -d -s build "${command}"`);
      break;
    }
  }

  process.stdout.write(input);
  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
