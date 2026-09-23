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
2026-09-13 | fix(frontend): suppress global loading overlay for background polling and status requests | frontend services & components | Set SKIP_GLOBAL_LOADING on periodic status updates and background timers to prevent intrusive spinner overlays.
2026-09-05 | feat(events): add current-month time filter with per-user persistence | frontend event-list, user-preferences model, backend user controller | New default "Aktueller Monat" option, RECENT widened from ±10 to ±14 days, last selection stored in user preferences (eventListTimeFilter) and restored on revisit.
2026-06-18 | fix(public-page): rich-text and image-text blocks lose content on save | backend public-page.controller | sanitizeRichBlocks used field name 'content' but frontend model uses 'html'; also adds richBlocks to getPublicPageBySlug response.
2026-06-24 | feat(chat): persist unread notification state in DB and enrich email template | backend chat notifier/model/init, backend email service, frontend admin mail-templates | Replaces in-memory anti-spam map with DB-persisted lastNotifiedMessageId on chat_read_state; adds placeholders last_author_initials, last_message_text, last_message_date, last_message_attachment_name, total_unread_count; direct link now targets specific room; chat-unread tab added to admin template editor with test-mail support.
2026-06-24 | fix(monthly-plan): trigger change detection after async availability load and save | frontend availability-table | Injects ChangeDetectorRef and calls markForCheck() after HTTP responses to fix stale view under OnPush strategy.
2026-09-06 | fix(backend): enable CORS for www subdomain and add dual health route | backend app.js, tests/ping.cors.test.js | Allows www.nak-chorleiter.de in CORS allowed origins; maps /health alongside /api/health; adds CORS regression test.
2026-09-06 | fix(deploy): repair syntax errors in deploy.sh and align with deploy.ps1 | deploy.sh, deploy.local.example.sh, .gitignore | Resolves unclosed if-statement bug; adds tar exclusions for node_modules/logs/uploads; implements smart frontend build skip and trap cleanup; adds local config support.
2026-09-05 | feat(reminder): skip event reminders for cancelled users and add planned director to reminder mail | backend reminder service, email templates, init migration, tests | Users with UNAVAILABLE availability for the event date get no reminder (push+email); rehearsal-reminder template gains {{event_director}} placeholder (migration appends line to existing DB template); new rehearsal-reminder.service test.
2026-09-05 | feat(chat): add direct 1:1 rooms per choir member | backend chat controller/routes/validators, frontend chat component/service | getOrCreateDirectRoom reuses existing two-member private room or creates dm-<idA>-<idB> room; membership in active choir validated.
2026-09-05 | feat(chat): add GIF search dialog for messages | frontend gif-search.service, chat-gif-dialog component, chat component | New dialog to search and insert GIFs into chat messages.
2026-09-05 | feat(chat): render @mentions as links in markdown pipe | frontend markdown.pipe, chat component | MarkdownPipe accepts mention candidates and converts @Name occurrences to mention: links; DOMPurify URI regexp extended.
2026-09-05 | feat(plan): two-way sync between plan entries and events | backend planEntryEventSync service, event/planEntry/planRule controllers, plan_entry model, init migration | plan_entry gains eventType/linkedEventId (ensurePlanEntryEventSyncFields); event create/update links and syncs matching plan entry, delete unlinks.
2026-09-05 | feat(admin): mobile tab selector on admin hub pages | frontend admin mail-management, organizations, pwa-config, security, system-settings, usage-statistics | On handset viewports tabs are replaced by a mat-select subarea dropdown with icons.
2026-09-05 | chore(env): untrack backend .env files and ignore .env* | .gitignore, choir-app-backend/.env removal | Real env files removed from repo; only .env.example remains tracked per deployment policy.
2026-09-05 | docs(project): add frontend audit, security and cleanup reports | doc/project + doc/frontend | Frontend-Gesamtpruefung plan/protocol, DSGVO checklist, security negativtests, route-guard matrix, tenant isolation report, UI component catalog/migration list, code/SCSS cleanup reports.
2026-09-14 | chore(frontend): bump build version to 0.7.1 | choir-app-frontend package manifests | Updates the frontend package and lockfile version from 0.6.1 to 0.7.1.
2026-09-14 | fix(forms): require signed capability token for public submission updates | backend form controller/routes/validators, utils/submission-token, frontend form.service + form-fill | check-duplicate no longer leaks submission IDs; PUT /public/forms/:guid/submissions requires a short-lived HMAC token bound to form and email.
2026-09-14 | fix(availability): verify manager role in requested choir scope | backend availability.controller | resolveChoirId now requires choir_admin/director in the choir passed via ?choirId for manager-only routes; global admins unaffected.
2026-09-14 | fix(event): scope plan-entry unlink to the active choir | backend event.controller | Event ownership is checked before linkedEventId is cleared, preventing cross-tenant plan-entry changes.
2026-09-14 | fix(chat): match direct rooms by deterministic dm key | backend chat.controller | findDirectRoomForUsers looks up dm-<idA>-<idB> instead of reusing any two-member private room.
2026-09-14 | fix(chat): render direct-chat titles per requesting user | backend chat.controller | Room titles for dm rooms are derived from the peer membership in getRooms, getRoomDetail and unread summaries.
2026-09-14 | fix(frontend): allow relative links through markdown sanitization | frontend markdown.pipe | ALLOWED_URI_REGEXP accepts /path, #anchor and ?query while still rejecting protocol-relative URLs.
2026-09-14 | fix(backend): break models <-> user PII crypto require cycle | backend models/user.model, init/encryptUserPersonalData, utils/pii-crypto | PII helpers moved to utils/pii-crypto with lazy encryption.service import; db was an empty object inside the cycle so the PII migration silently failed.
2026-09-14 | fix(deploy): poll the backend health endpoint instead of a single check | deploy.ps1, deploy.sh | Startup runs all migrations before listening; health check now retries for up to 180s.
2026-09-14 | perf(backend): make Sequelize SQL logging opt-in | backend models/index, .env.example | Query logging is disabled unless DB_LOGGING=true, which noticeably shortens production startup.
2026-09-23 | fix(email): resolve mail template placeholders with alias-tolerant matching | backend emailTemplateManager + email tests | Regex-based replacement keeps unknown placeholders intact and accepts choir/choir_name/choirname and type-prefixed aliases.
2026-09-23 | fix(choir-management): decrypt member contact data before returning it | backend choir-management.controller | Member list now decrypts phone/street/postalCode/city PII fields, tolerates missing req.userId and rethrows when no next handler is present.
2026-09-23 | fix(repertoire): keep every collection reference in the lookup list | backend repertoire.controller + test | Join rows are loaded through collection_piece directly because belongsToMany deduplicated multiple numbers of the same collection; references and titles are joined with a slash.
2026-09-21 | fix(frontend): deduplicate preference loads and reduce HTTP error logging | frontend user preferences, auth, api, error handling + tests | Shares and caches GET requests, silently falls back on HTTP 429 and prevents duplicate raw HttpErrorResponse output.
2026-09-21 | fix(frontend): make monthly plan background refresh silent | frontend monthly plan component, event, choir and monthly-plan services | Displayed plan data is preserved and the global loading overlay is suppressed for refresh requests once data is already visible.
2026-09-21 | feat(frontend): extract shared availability control for event views | frontend shared availability-control, event-card, my-calendar, dashboard, upcoming-events widget + spec | Availability labels, icons and the save call move into one reusable component; event-card only emits edit and renders the control.
2026-09-21 | fix(participation): align month headers and reuse availability control | frontend participation component | Flex-based month groups now match the date columns and managers can update a selected member through the shared availability control.
2026-09-23 | feat(events): highlight the next upcoming event in the list | frontend event-list, event-dialog, collection-list and literature-list styles | findNextUpcomingEventId marks the closest future event so it can be visually emphasised; dialog and list spacing adjusted.
2026-09-23 | feat(frontend): rework the public welcome page and add header login entry | frontend welcome component, main-layout, index.html | Landing page gets a dedicated stylesheet and Instrument Serif headings; logged-out visitors see Registrieren and a login icon in the toolbar.
2026-09-21 | feat(build): reuse frontend builds when inputs are unchanged | frontend build wrapper and package scripts, deploy.ps1, deploy.sh | build-if-needed stores a content fingerprint in dist so an up-to-date build skips Angular and keeps the existing build timestamp.
2026-09-16 | chore(git): add automatic local branch cleanup command | root scripts, package scripts, PowerShell wrapper | Prunes origin and safely removes merged or remotely deleted tracking branches, with dry-run and force options for npm and PowerShell.
