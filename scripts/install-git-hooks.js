#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function runGit(args) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
  });
}

function main() {
  const check = runGit(['rev-parse', '--is-inside-work-tree']);
  if (check.status !== 0 || !(check.stdout || '').trim().includes('true')) {
    console.log('[hooks] Git repository not detected. Skipping hook setup.');
    return;
  }

  const setHooksPath = runGit(['config', 'core.hooksPath', '.githooks']);
  if (setHooksPath.status !== 0) {
    const stderr = (setHooksPath.stderr || '').trim();
    throw new Error(stderr || 'Failed to set core.hooksPath');
  }

  console.log('[hooks] core.hooksPath set to .githooks');
}

try {
  main();
} catch (err) {
  console.error(`[hooks] ${err.message}`);
  process.exit(1);
}
