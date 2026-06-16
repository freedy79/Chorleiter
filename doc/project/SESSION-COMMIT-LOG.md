# Session Commit Log

This file is the shared, repo-local source of truth for session-level one-line summaries.

## How to use

- Add one line per coherent change set after each session.
- Use a Conventional Commit style summary whenever possible.
- Before committing, compare the latest log entries against the current diff.
- If the diff changed since the log line was written, update the line before creating the commit.

## Entry format

`YYYY-MM-DD | type(scope): summary | areas | notes`

- `type(scope): summary` should be the commit subject candidate.
- `areas` can list the main folders or feature areas touched.
- `notes` can include intent, edge cases, or verification hints.

## Recent entries

2026-06-16 | feat(mail): track trigger context for outgoing mails | backend mail logging, frontend admin mail views | Added request-context-aware mail metadata and migration support.
2026-06-16 | feat(admin): add referral, feedback and address-book workflows | backend referrals, backend feedback, frontend admin + monthly plan dialogs | Large feature bundle with new admin workflows and tests.