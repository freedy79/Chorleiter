# Session Commit Log

This file is the shared, repo-local source of truth for session-level one-line summaries.

## How to use

- Add one line per feature, fix, or cleanup after each session.
- A single commit can include multiple lines if it bundles multiple features/fixes.
- Use a Conventional Commit style summary whenever possible.
- Before committing, compare the latest log entries against the current diff.
- If the diff changed since the log line was written, update the line before creating the commit.
- A pre-commit guard blocks code commits when this file is not staged.

## Entry format

`YYYY-MM-DD | type(scope): summary | areas | notes`

- `type(scope): summary` should be the commit subject candidate.
- `areas` can list the main folders or feature areas touched.
- `notes` can include intent, edge cases, or verification hints.

## Recent entries

2026-06-16 | feat(frontend): improve login, welcome and availability UX flow | frontend login, home welcome, availability + tests | Refined user-facing flow and added availability component test coverage.
2026-06-16 | feat(auth): add demo lead flow and tighten admin/choir guard behavior | backend auth/routes/models, frontend guards/login/admin views | Introduced demo lead model/init flow plus role-aware navigation and access updates.
2026-06-16 | chore(git): enforce session commit log guard via pre-commit hook | root scripts, .githooks, package scripts | Added check script, hook installer, hooksPath bootstrap and LF-safe hook config.
2026-06-16 | feat(mail): track trigger context for outgoing mails | backend mail logging, frontend admin mail views | Added request-context-aware mail metadata and migration support.
2026-06-16 | feat(admin): add referral, feedback and address-book workflows | backend referrals, backend feedback, frontend admin + monthly plan dialogs | Large feature bundle with new admin workflows and tests.
2026-06-18 | fix(backend): migrate piece_link FILE_DOWNLOAD enum and add searchable error codes | backend init, error middleware, errors util | Adds ensurePieceLinkTypes migration to fix 500 on DELETE /api/pieces/link-file; extends AppError with code field and generates DB_METHOD_ROUTE codes for all Sequelize errors.
2026-06-18 | security(deploy): remove hardcoded infra secrets and harden SSH auth | deploy.ps1, deploy.local.example.ps1, .gitignore | Replaces hardcoded IP/user/paths with env vars loaded from gitignored deploy.local.ps1; adds SSH key file support for plink; fixes StrictHostKeyChecking=no MITM risk; guards password file permissions; cleans up temp files in finally.
