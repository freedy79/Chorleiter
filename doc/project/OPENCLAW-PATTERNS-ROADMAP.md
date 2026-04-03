# OpenClaw Patterns - Chorleiter Improvement Roadmap

This document outlines a comprehensive plan to adopt best practices from the [openclaw/openclaw](https://github.com/openclaw/openclaw) repository (MIT license) into the Chorleiter project.

## Executive Summary

**Goal:** Improve code quality, maintainability, and developer experience without disrupting feature development.

**Approach:** Incremental adoption using the strangler pattern across 3 iterations over 8-10 weeks.

**Quick Wins:** Policy-as-Code automation (Iteration 1.1) provides immediate value with minimal risk.

## Pattern Analysis Summary

We identified **10 better patterns** from openclaw/openclaw with specific applications to Chorleiter:

| # | Pattern | Impact | Effort | Risk | Chorleiter Application |
|---|---------|--------|--------|------|------------------------|
| 1 | Policy-as-Code in CI | 5 | 2 | 1 | Add pre-commit hooks, dependabot, forbidden pattern checks |
| 2 | Domain Facades (BFF) | 5 | 4 | 2 | Split `api.service.ts` into domain services (pieces, composers, etc.) |
| 3 | Modular Route Mounting | 4 | 3 | 2 | Extract routes from `app.js` into `/routes` modules |
| 4 | Model Associations in Models | 4 | 3 | 3 | Move associations from `models/index.js` to individual model files |
| 5 | Contribution Workflow | 4 | 2 | 1 | Add `.github/pull_request_template.md` with checklists |
| 6 | Use-Case Service Layer | 5 | 5 | 3 | Add `/use-cases` layer between controllers and models |
| 7 | Strict Typing at API Boundary | 4 | 3 | 2 | Add DTO validation schemas for request/response |
| 8 | Progressive Disclosure in Docs | 3 | 2 | 1 | Restructure docs with quickstart → detailed guides |
| 9 | Vertical Slice Testing | 4 | 4 | 2 | Add integration tests for complete user flows |
| 10 | Skills-Based Agent Workflows | 3 | 3 | 1 | Document domain knowledge in `.agents/skills/` |

**Impact/Effort/Risk Scale:** 1 (low) to 5 (high)

## Iteration Plan

### Iteration 1: Foundation & Quick Wins (3 weeks)

**Goal:** Establish automated quality gates and prevent regression.

#### 1.1 Policy-as-Code (Week 1) ✅ COMPLETED

**Status:** ✅ **DONE** - All files created and documented

**Deliverables:**
- ✅ `.github/dependabot.yml` - Automated dependency updates
- ✅ `.github/labeler.yml` - Auto-label PRs by changed files
- ✅ `.pre-commit-config.yaml` - Local quality checks
- ✅ `.github/workflows/ci.yml` - Extended with policy enforcement
- ✅ `.github/pull_request_template.md` - Structured PR checklist
- ✅ `choir-app-backend/.env.example` - Environment variable documentation
- ✅ `doc/project/POLICY-AS-CODE-SETUP.md` - Setup guide

**Automated Checks:**
- ❌ Block `sequelize.sync({ alter: true })`
- ❌ Block `sync({ force: true })` outside init/
- ❌ Detect hardcoded secrets
- ⚠️  Warn about `console.log` in production code
- ✅ Validate YAML/JSON syntax
- ✅ Detect private keys with Gitleaks
- ✅ Verify `require()` dependencies in package.json
- ✅ Run ESLint on frontend/backend

**Success Metrics:**
- Incidents from forbidden patterns: → 0
- CI feedback time: <5 min
- False positive rate: <5%
- Dependabot merge rate: >80%

#### 1.2 Domain Facades in Frontend (Week 2) ✅ COMPLETED

**Status:** ✅ **DONE** - Documentation and deprecation complete

**Goal:** Establish pattern for using domain services directly instead of `api.service.ts` facade.

**Reality Check:**
- Domain services **already exist** (47 specialized services: `PieceService`, `ComposerService`, etc.)
- Problem: Components inject `ApiService` (1120-line facade) instead of direct services
- Solution: Deprecate `ApiService`, document migration, enforce for new code

**Deliverables:**
- ✅ `api.service.ts` marked as `@deprecated` with migration guidance
- ✅ `doc/frontend/API-SERVICE-MIGRATION-GUIDE.md` - Complete migration guide
- ✅ `doc/frontend/DOMAIN-SERVICES-MIGRATION-SUMMARY.md` - Summary and progress tracking
- ✅ Strangler pattern established (gradual migration, no breaking changes)

**Success Metrics:**
- New features: 100% use domain services directly (enforced in code review)
- Existing code: Opportunistic migration (when touched for other reasons)
- Developer awareness: IDE shows `@deprecated` warnings
- Bundle size: 5-10% reduction when fully migrated

**Migration Progress:** 0/50 components (0%) - New features MUST use domain services

#### 1.3 Contribution Workflow Documentation (Week 3)

**Goal:** Standardize development workflow for team collaboration.

**Deliverables:**
- `doc/project/DEVELOPMENT-WORKFLOW.md` - Git flow, branching strategy
- `.github/CONTRIBUTING.md` - How to contribute (setup, testing, PR process)
- Update `.github/copilot-instructions.md` with new patterns

### Iteration 2: Architectural Improvements (3-4 weeks)

#### 2.1 Modular Route Mounting (Week 4)

**Goal:** Break up `app.js` route registration monolith.

**Approach:**
1. Create `/routes` directory (already exists, expand it)
2. Each route file exports router + metadata:
   ```javascript
   // routes/pieces.routes.js
   module.exports = {
     path: '/api/pieces',
     router: require('express').Router(),
     middleware: [verifyToken, requireNonDemo]
   };
   ```
3. Auto-discover routes in `app.js`:
   ```javascript
   const routes = require('./routes');
   routes.forEach(({ path, router, middleware = [] }) => {
     app.use(path, ...middleware, router);
   });
   ```
4. Move route definitions from `app.js` to domain files

**Success Metrics:**
- `app.js` route registration: <50 lines
- Merge conflicts on `app.js`: Reduce by 80%
- Route modules: Self-contained (validators, controllers, middleware)

#### 2.2 Model Associations in Model Files (Week 5)

**Goal:** Eliminate `models/index.js` merge conflict hotspot.

**Approach:**
1. Add static `associate()` method to each model:
   ```javascript
   // models/Piece.js
   static associate(models) {
     Piece.belongsTo(models.Composer);
     Piece.belongsToMany(models.Category, { through: 'piece_category' });
   }
   ```
2. Update `models/index.js` to call `associate()` on all models after loading
3. Move associations incrementally (test after each model)

**Success Metrics:**
- `models/index.js` size: <100 lines (only initialization)
- Merge conflicts: Reduce by 90%
- Association clarity: Co-located with model definition

#### 2.3 Use-Case Service Layer (Weeks 5-6)

**Goal:** Decouple business logic from controllers and enable reuse.

**Approach:**
1. Create `/use-cases` directory:
   ```
   use-cases/
     pieces/
       CreatePieceUseCase.js
       EnrichPieceDataUseCase.js
       SearchPiecesUseCase.js
     collections/
       AddPieceToCollectionUseCase.js
   ```
2. Controllers become thin orchestrators:
   ```javascript
   // Before
   async createPiece(req, res) {
     // 50 lines of business logic
   }

   // After
   async createPiece(req, res) {
     const result = await CreatePieceUseCase.execute(req.body, req.userId);
     res.json(result);
   }
   ```
3. Use cases handle validation, authorization, DB transactions, events

**Success Metrics:**
- Controller methods: <20 lines average
- Business logic reuse: Same use case used in API + background jobs
- Testability: Use cases fully unit-testable without HTTP

### Iteration 3: Quality & Observability (2-3 weeks)

#### 3.1 Strict Typing at API Boundary (Week 7)

**Goal:** Catch data contract violations early with validation schemas.

**Approach:**
1. Use `express-validator` (already in use, expand coverage)
2. Define DTOs for complex requests:
   ```javascript
   // validators/piece.validators.js
   const createPieceSchema = [
     body('title').isString().trim().notEmpty(),
     body('composerId').isInt(),
     body('categoryIds').isArray().optional(),
     // ...
   ];
   ```
3. Add response schemas for documentation:
   ```javascript
   /**
    * @typedef {Object} PieceResponse
    * @property {number} id
    * @property {string} title
    * @property {ComposerResponse} composer
    */
   ```

**Success Metrics:**
- Validation errors in CI/CD: >0 (catch issues pre-merge)
- Runtime validation errors: Reduce by 70%
- API documentation: Auto-generated from schemas

#### 3.2 Vertical Slice Testing (Week 8)

**Goal:** Test complete user flows end-to-end.

**Approach:**
1. Create `tests/integration/` directory
2. Write tests for critical flows:
   - User registration → login → create piece → add to collection
   - Director assigns roles → librarian uploads file → member downloads
   - Monthly plan creation → rehearsal scheduling → reminder emails
3. Use `supertest` for HTTP + real (test) database
4. Run in CI pipeline after unit tests

**Success Metrics:**
- Critical flows covered: 100%
- Regression bugs caught: >80% before production
- CI runtime: <10 min total

#### 3.3 Progressive Disclosure Documentation (Week 8-9)

**Goal:** Make documentation accessible to new developers.

**Approach:**
1. Restructure `doc/` directory:
   ```
   doc/
     quickstart/
       01-local-setup.md (5 min read)
       02-first-feature.md (10 min read)
     guides/
       backend-patterns.md
       frontend-architecture.md
       database-migrations.md
     reference/
       api-endpoints.md
       environment-variables.md
   ```
2. Update main `README.md` with clear navigation
3. Add "Where to start" flowchart

**Success Metrics:**
- New developer onboarding time: <1 hour
- Documentation findability: 90% of questions answered in docs

#### 3.4 Skills-Based Agent Workflows (Week 9)

**Goal:** Codify domain knowledge for AI-assisted development.

**Approach:**
1. Create `.agents/skills/` directory (already exists)
2. Document domain patterns:
   ```
   .agents/skills/
     add-api-endpoint/SKILL.md
     database-migration/SKILL.md
     frontend-component/SKILL.md
   ```
3. Each skill includes: context, step-by-step guide, examples, gotchas

**Success Metrics:**
- Agent success rate on common tasks: >90%
- Knowledge scattered in Slack/emails: Formalized in skills

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes during refactoring | High | Use strangler pattern, feature flags, incremental rollout |
| Performance degradation from new layers | Medium | Benchmark before/after, optimize hot paths |
| CI pipeline overhead slows development | Medium | Cache dependencies, run checks in parallel, optimize regex |
| Team resistance to new tools | Low | Start with optional (pre-commit), demo value, iterate |

### Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overhead from PR templates | Low | Keep templates concise, make sections collapsible |
| Dependabot noise | Medium | Group updates, limit open PRs, auto-merge minor updates |
| False positives in policy checks | Medium | Iterate on rules, document exceptions, quick feedback loop |
| Documentation becomes outdated | Medium | Automate where possible (API docs from code), assign owners |

## Success Criteria

### Quantitative (KPIs)

**Code Quality:**
- Average lines per file: <300 (currently >500 in problem files)
- Cyclomatic complexity: <10 per function
- Test coverage: >80% (currently ~60%)

**Developer Experience:**
- Merge conflict frequency: Reduce by 80%
- CI feedback time: <5 min
- False positive rate: <5%
- Dependabot merge rate: >80%

**Reliability:**
- Incidents from forbidden patterns: 0
- Regression bugs in production: Reduce by 50%
- Documentation findability: 90%

### Qualitative

**Team Adoption:**
- ✅ Developers use pre-commit hooks voluntarily
- ✅ PR templates filled out consistently
- ✅ New patterns followed in new code

**Code Health:**
- ✅ Services are focused and testable
- ✅ Business logic is decoupled from framework
- ✅ Associations are discoverable near model definitions

**Knowledge Sharing:**
- ✅ New developers onboard in <1 hour
- ✅ AI agents successfully complete common tasks
- ✅ Documentation is trusted source of truth

## Timeline Overview

```
Weeks 1-3: Iteration 1 (Foundation) ✅ COMPLETE
  Week 1 (Feb 21): ✅ Policy-as-Code setup
  Week 2 (Feb 24): ✅ Domain facade documentation + migration guide
  Week 3: Contribution docs (optional)

Weeks 4-6: Iteration 2 (Architecture)
  Week 4: Modular routes
  Week 5: Model associations + use-case layer start
  Week 6: Use-case layer completion

Weeks 7-9: Iteration 3 (Quality)
  Week 7: Strict typing (DTOs)
  Week 8: Vertical slice testing + docs restructure
  Week 9: Agent skills documentation

Week 10: Buffer + retrospective
```

## Next Steps

1. ✅ **Iteration 1.1 completed** - Policy-as-Code implemented (2026-02-21)
2. ✅ **Iteration 1.2 completed** - Domain facades documented (2026-02-24)
3. **Start Iteration 2.1** - Begin modular route mounting (Backend)
4. **Validate KPIs** - Measure baseline metrics before changes
5. **Team alignment** - Share roadmap, gather feedback
6. **Iterate** - Adjust plan based on learnings

## Related Documentation

- [Policy-as-Code Setup Guide](POLICY-AS-CODE-SETUP.md)
- [Policy-as-Code Summary](POLICY-AS-CODE-SUMMARY.md)
- [API Service Migration Guide](../frontend/API-SERVICE-MIGRATION-GUIDE.md)
- [Domain Services Migration Summary](../frontend/DOMAIN-SERVICES-MIGRATION-SUMMARY.md)
- [Database Migration Rules](../backend/DATABASE-MIGRATION-RULES.md)
- [API Refactoring Guide](../frontend/API-REFACTORING-COMPLETE.md)
- [Architecture Overview](ARCHITECTURE.md)

## Retrospective Template

After each iteration, assess:

**What went well?**
- [ ] Metric 1: ...
- [ ] Metric 2: ...

**What needs improvement?**
- [ ] Issue 1: ...
- [ ] Issue 2: ...

**Adjustments for next iteration:**
- [ ] Change 1: ...
- [ ] Change 2: ...

---

**Version:** 1.2  
**Last Updated:** 2026-02-24  
**Status:** In Progress (Iteration 1 complete - Foundation)  
**Owner:** Development Team
