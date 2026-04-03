# Safe Production-Snapshot Migration Workflow

## Purpose
Use this skill when implementing schema/features that must be validated against a fresh production snapshot while keeping production continuously runnable.

## Guarantees
- Production DB is never modified during local validation.
- Snapshot transfer is integrity-checked (SHA256).
- Host key pinning is mandatory to mitigate MITM.
- Migration is always executed in an isolated local test database.
- Build checks are required before deployment.

## Required Inputs
- Host key fingerprint of the production server.
- Read-only (or minimally privileged) SSH access for backup download.
- Local PostgreSQL instance for isolated restore/migration test.

## Workflow
1. **Fetch current snapshot securely**
   - Use `scripts/secure-prod-snapshot.ps1` with:
     - `-HostKeyFingerprint '<fingerprint>'`
     - optional `-RestoreToTestDb`
   - Verify SHA256 remote vs local.

2. **Run migration on test DB**
   - Set env vars to test DB (`DB_NAME=chorleiter_migration_test`, etc.).
   - Run backend init/migrations (`npm --prefix choir-app-backend run init`).
   - Confirm new/changed tables and endpoints are available.

3. **Validate runtime safety**
   - Backend syntax check (`npm --prefix choir-app-backend run check`).
   - Frontend build (`npm --prefix choir-app-frontend run build`).
   - Run relevant tests (full suite or impacted subset).

4. **Feature verification**
   - Verify new APIs against restored snapshot data.
   - Verify UI wiring and permissions.

5. **Deploy readiness gate**
   - Only proceed when:
     - snapshot restore passed,
     - migration passed,
     - backend check passed,
     - frontend build passed,
     - no critical regressions.

## Security Rules
- Never bypass host key validation in automated snapshot workflows.
- Never expose snapshot credentials in logs.
- Keep backup files in `backups/` and avoid committing them.
- Restrict download endpoints with choir-scoped authorization checks.

## Output Checklist
- [ ] Snapshot downloaded and hash-verified
- [ ] Migration applied on isolated test DB
- [ ] Backend check successful
- [ ] Frontend build successful
- [ ] Feature manually verified
- [ ] Ready for deploy
