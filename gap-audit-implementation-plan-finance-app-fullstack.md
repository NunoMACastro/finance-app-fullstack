# Gap Audit Implementation Plan

## Summary

This plan is the implementation companion to [gap-audit-report-finance-app-fullstack.md](./gap-audit-report-finance-app-fullstack.md).
It turns the audit findings into a phased execution path, starting by reconciling the report with current reality and then closing the remaining verification and documentation gaps.

## Status

All eight phases are complete in the current workspace.

- Phase 1: report reconciliation completed.
- Phase 2: documentation drift and stale metadata cleanup completed.
- Phase 3: observability coverage added.
- Phase 4: scheduler bootstrap/runtime coverage added.
- Phase 5: auxiliary stats endpoint coverage added.
- Phase 6: auxiliary budget endpoint coverage added.
- Phase 7: shared-account UI behavior coverage added.
- Phase 8: profile UI behavior coverage added.
- Verification: frontend `npm run test` passed after the final round of changes.

## Phase 1 - Reconcile the audit with current reality

- Reclassify findings into `doc drift`, `coverage gap`, and `true functional gap`.
- Remove or downgrade speculative findings that are already explained by the codebase, especially `backend/src/services.ts`.
- Reframe shared-account and profile subflows as covered structurally but not yet fully proven behaviorally.
- Update the end-to-end matrix so it does not mark already-implemented flows as missing.

## Phase 2 - Clean documentation drift and stale metadata

- Remove `VITE_USE_MOCK` from the root README onboarding path and align frontend setup docs with the current API-only runtime.
- Update `frontend/README.md` so the theme inventory matches the official 7-theme contract.
- Treat `TODO.md` as stale backlog noise and remove it from the effective project state.
- Normalize the frontend package metadata so it reflects the actual project identity.

## Phase 3 - Add observability coverage

- Add automated tests for `/health`, `/ready`, and `/metrics`.
- Cover success, failure, and auth-gated scenarios.
- Verify readiness failure when Mongo is unavailable and metrics exposure when the bearer token is set.

## Phase 4 - Prove scheduler bootstrap and runtime behavior

- Add tests for `startScheduler()` under disabled, test, and active runtime conditions.
- Prove that `server.ts` calls the scheduler after DB bootstrap.
- Cover lock acquisition, lease renewal, and graceful release in the recurring job path.

## Phase 5 - Cover auxiliary stats endpoints

- Add integration coverage for `GET /stats/compare-budget` and `GET /stats/insights/latest`.
- Validate date-range rejection, empty-result behavior, and stable payloads for valid ranges.
- Verify the latest-insight lookup behavior when the current period has no ready record.

## Phase 6 - Cover auxiliary budget endpoints

- Add integration coverage for `/budgets/templates`, category add/remove, and `copy-from`.
- Validate protected categories, in-use category rejection, missing source budget, and template correctness.
- Verify fallback category preservation and month total synchronization.

## Phase 7 - Strengthen shared-account UI coverage

- Add behavior-driven frontend tests for create, join, switch-active-account, and leave-account flows.
- Validate button states, confirmation dialogs, and context updates rather than only route mounting.
- Ensure the UI remains aligned with backend role and membership rules.

## Phase 8 - Strengthen profile UI coverage

- Add behavior-driven frontend tests for profile, security, and preferences subpages.
- Cover update profile/email/password, export, delete/deactivate, session management, theme switching, and tutorial reset.
- Verify that the flows fail visibly and safely when API actions reject.

## Test Strategy

- Backend: unit suites were validated during the implementation pass; rerun integration coverage if new backend changes land.
- Frontend: `npm run test` passed after the final round of UI behavior coverage.
- Documentation: keep the gap report synchronized with the implementation state when new findings appear.

## Assumptions

- The audit report remains the source document for findings.
- The plan file lives at the repo root next to the report for easy comparison.
- Phase 1 is documentation-only and does not require runtime behavior changes.
- Later phases should prefer test additions before implementation changes when the feature already exists but lacks proof.
