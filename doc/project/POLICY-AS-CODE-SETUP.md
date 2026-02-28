# Policy-as-Code Setup Guide

This document explains how to set up and use the automated quality gates for the Chorleiter project.

## Overview

We've implemented **Policy-as-Code** to automate quality checks and prevent common mistakes:

- **Dependabot**: Automatic dependency updates
- **PR Labeler**: Automatic labeling of pull requests
- **Pre-commit hooks**: Local validation before commits
- **CI Pipeline**: Automated testing and policy enforcement

## 1. Dependabot Setup

Dependabot is configured in [.github/dependabot.yml](../.github/dependabot.yml) and runs automatically on GitHub.

### What it does:
- Weekly dependency updates for backend, frontend, GitHub Actions
- Groups related updates (Angular, Material, dev dependencies)
- Creates PRs with semantic commit messages

### No action required
Dependabot works automatically once the repository is on GitHub.

## 2. PR Labeler Setup

The PR labeler is configured in [.github/labeler.yml](../.github/labeler.yml).

### What it does:
- Automatically labels PRs based on changed files
- Labels: `backend`, `frontend`, `database`, `api`, `ui-components`, `security`, etc.

### No action required
Labeler runs automatically in the CI pipeline for pull requests.

## 3. Pre-commit Hooks Setup

Pre-commit hooks run **locally** before every commit to catch issues early.

### Installation (One-time setup)

1. **Install pre-commit** (requires Python):
   ```bash
   pip install pre-commit
   ```

2. **Install the git hooks**:
   ```bash
   pre-commit install
   ```

### What it does:
- ✅ Removes trailing whitespace
- ✅ Ensures files end with newline
- ✅ Validates YAML and JSON syntax
- ✅ Detects merge conflicts
- ✅ Checks for large files (>1MB)
- ✅ Detects private keys and secrets
- ✅ Runs ESLint on frontend/backend
- ✅ Checks for dangerous database patterns
- ✅ Verifies `require()` dependencies are in `package.json`
- ✅ Formats markdown and YAML

### Usage

**Automatic:** Hooks run automatically on every `git commit`

**Manual run:**
```bash
# Check all files
pre-commit run --all-files

# Check specific files
pre-commit run --files choir-app-backend/src/some-file.js

# Update hook versions
pre-commit autoupdate
```

### Skipping hooks (emergency only!)
```bash
# Skip all hooks (NOT RECOMMENDED)
git commit --no-verify -m "Emergency fix"

# Skip specific hook
SKIP=eslint-frontend git commit -m "WIP: needs cleanup"
```

## 4. CI Pipeline

The CI pipeline is defined in [.github/workflows/ci.yml](../.github/workflows/ci.yml).

### What it does:
1. **Policy Checks** (runs first, fails fast):
   - ❌ Blocks `sequelize.sync({ alter: true })`
   - ❌ Blocks `sync({ force: true })` outside init/
   - ❌ Detects hardcoded secrets
   - ⚠️  Warns about missing `.env.example`
   - ⚠️  Warns about `console.log` in production code

2. **Backend Tests**:
   - Runs `npm test` in `choir-app-backend/`
   - Uses npm cache for faster builds
   - Uploads test results as artifacts

3. **Frontend Tests**:
   - Runs Angular tests with Karma
   - Generates build info
   - Uploads coverage reports

4. **PR Labeler**:
   - Auto-labels pull requests based on changed files

### Viewing Results

- On GitHub: Check the "Actions" tab on each PR/commit
- Locally: Run tests before pushing:
  ```bash
  # Backend
  npm test --prefix choir-app-backend

  # Frontend
  npm run test --prefix choir-app-frontend -- --watch=false --browsers=ChromeHeadlessCI
  ```

## 5. Pull Request Template

A PR template is provided at [.github/pull_request_template.md](../.github/pull_request_template.md).

### What it includes:
- ✅ Change type selection (bugfix, feature, breaking, etc.)
- ✅ Component checklist (backend, frontend, database, etc.)
- ✅ Code quality checklist
- ✅ Backend-specific checks (asyncHandler, no sync({ alter: true }), etc.)
- ✅ Frontend-specific checks (responsive design, dark mode, accessibility)
- ✅ Testing strategy section
- ✅ Reviewer checklist

### Usage:
The template appears automatically when creating a PR on GitHub.

## 6. Troubleshooting

### Pre-commit hooks fail

**Problem:** ESLint or Prettier not found
```bash
# Install dependencies first
npm install --prefix choir-app-frontend
npm install --prefix choir-app-backend
```

**Problem:** Python not found
```bash
# Install Python 3.8+ from https://www.python.org/
# Then reinstall pre-commit
pip install pre-commit
pre-commit install
```

**Problem:** Gitleaks fails on false positive
```bash
# Add to .gitleaksignore (only if truly a false positive!)
echo "path/to/file:line_number" >> .gitleaksignore
```

### CI pipeline fails

**Problem:** "sequelize.sync({ alter: true }) forbidden"
- See [doc/backend/DATABASE-MIGRATION-RULES.md](../backend/DATABASE-MIGRATION-RULES.md)
- Use manual migrations instead

**Problem:** "Potential hardcoded secrets detected"
- Move secrets to `.env` file
- Reference via `process.env.SECRET_NAME`

**Problem:** Tests fail on CI but pass locally
- Ensure you're using `npm ci` (not `npm install`) locally
- Check Node version matches (20.x)
- For frontend: Use `ChromeHeadlessCI` browser

### Dependabot PRs not appearing

**Problem:** No PRs created
- Check GitHub repository settings → Security → Dependabot
- Ensure Dependabot is enabled for the repo

**Problem:** Too many PRs
- Adjust `open-pull-requests-limit` in `.github/dependabot.yml`

## 7. Best Practices

### For Developers

1. **Run pre-commit hooks locally** before pushing
2. **Fill out PR template** completely
3. **Address CI failures** before requesting review
4. **Keep PRs focused** - smaller is better
5. **Test both locally and in CI** environment

### For Reviewers

1. **Check CI status** first (must be green)
2. **Verify PR template** is filled out
3. **Look for auto-labels** to understand scope
4. **Review test coverage** from artifacts
5. **Consider deployment risks** (checklist in PR template)

### For Maintainers

1. **Review Dependabot PRs weekly**
2. **Update pre-commit hooks** monthly: `pre-commit autoupdate`
3. **Monitor CI performance** (adjust caching if slow)
4. **Adjust policies** as needed in `.github/workflows/ci.yml`

## 8. Continuous Improvement

### Measuring Success

**KPIs (see project plan):**
- Incidents caused by forbidden patterns → 0
- Time from commit to CI feedback → <5 min
- False positive rate in policy checks → <5%
- Dependabot PR merge rate → >80%

### Feedback Loop

If a policy is:
- **Too strict:** Adjust checks in `.github/workflows/ci.yml`
- **Too lenient:** Add new checks to `pre-commit-config.yaml`
- **False positives:** Refine regex patterns or add exceptions

### Iterating

This is **Iteration 1.1** of the project plan:
- Next: **Iteration 1.2** - Domain Facades (API service refactoring)
- Future: **Iteration 2** - Modular routing and vertical slice testing

See the full [project plan](../project/OPENCLAW-PATTERNS-ROADMAP.md) for details.

## 9. Related Documentation

- [Database Migration Rules](../backend/DATABASE-MIGRATION-RULES.md) - Why `sync({ alter: true })` is forbidden
- [API Refactoring Guide](../frontend/API-REFACTORING-COMPLETE.md) - Service architecture patterns
- [Architecture Overview](../project/ARCHITECTURE.md) - System design
- [UI/UX Guidelines](.github/agents/ui-ux-instructions.md) - Component standards

## Quick Reference

| Task | Command |
|------|---------|
| Install pre-commit | `pip install pre-commit && pre-commit install` |
| Run all checks | `pre-commit run --all-files` |
| Update hooks | `pre-commit autoupdate` |
| Backend tests | `npm test --prefix choir-app-backend` |
| Frontend tests | `npm run test --prefix choir-app-frontend -- --watch=false --browsers=ChromeHeadlessCI` |
| Skip hooks (emergency) | `git commit --no-verify` |
| Check CI status | Visit GitHub Actions tab |

---

**Questions?** Open an issue or ask in the team chat.
