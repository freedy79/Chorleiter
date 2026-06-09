# Agent Experiences Log

## 2026-06-09
- Established a wave-based UX nightly backlog with mandatory test gates before each commit.
- Added reusable agent template + two specialized nightly agents (UX implementation, test engineering).
- Reusable pattern: enforce checkpoint commits before each wave to simplify rollback.
- Retry-enabled global error overlays improved recovery UX and are easy to protect with focused unit tests.
- A11y hardening should include DOM assertions for aria labels on icon-only controls to avoid regressions.
- Removing inline styles is most reliable when paired with class-based tests on target containers instead of global `[style]` assertions.
