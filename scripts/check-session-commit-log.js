#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const LOG_FILE = 'doc/project/SESSION-COMMIT-LOG.md';
const ALLOWLIST_REGEX = [
  /^doc\/project\/SESSION-COMMIT-LOG\.md$/,
  /^\.github\/copilot-instructions\.md$/,
  /^doc\/project\/DOCUMENTATION-INDEX\.md$/,
  /^\.githooks\//,
  /^scripts\/check-session-commit-log\.js$/,
  /^scripts\/install-git-hooks\.js$/,
  /^package\.json$/,
  /^package-lock\.json$/,
];

function git(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || `git ${args.join(' ')} failed`);
  }

  return result.stdout || '';
}

function normalize(filePath) {
  return filePath.replace(/\\/g, '/');
}

function parseStagedFiles() {
  const output = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return output
    .split(/\r?\n/)
    .map((line) => normalize(line.trim()))
    .filter(Boolean);
}

function hasOnlyAllowlistedFiles(files) {
  return files.every((file) => ALLOWLIST_REGEX.some((rx) => rx.test(file)));
}

function isLogFileStaged(files) {
  return files.includes(LOG_FILE);
}

function printFailure(stagedFiles) {
  const root = path.resolve(process.cwd());
  console.error('❌ Commit blocked: Session-Commit-Log fehlt im Staging.');
  console.error('');
  console.error(`Bitte aktualisiere und stage ${LOG_FILE} (eine Zeile pro Feature/Fix).`);
  console.error('');
  console.error('Gestagte Dateien:');
  stagedFiles.forEach((file) => console.error(`  - ${file}`));
  console.error('');
  console.error(`Repo: ${root}`);
}

function main() {
  if (process.env.CHORLEITER_SKIP_SESSION_LOG_CHECK === '1') {
    process.exit(0);
  }

  const stagedFiles = parseStagedFiles();
  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  if (hasOnlyAllowlistedFiles(stagedFiles)) {
    process.exit(0);
  }

  if (!isLogFileStaged(stagedFiles)) {
    printFailure(stagedFiles);
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  console.error('⚠️ Session-Commit-Log-Check konnte nicht ausgeführt werden.');
  console.error(err.message);
  process.exit(1);
}
