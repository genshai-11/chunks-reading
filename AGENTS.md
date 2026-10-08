# Agent guide

Before changing classroom behavior, read the domain docs below and the relevant product spec in the configured tracker. Treat the current-system map in [the baseline review](docs/reviews/codebase-baseline.md) as observed behavior, not approved product requirements.

For Firestore changes, read [security_spec.md](security_spec.md) and the baseline review. Verify enforcement with Firestore Emulator tests; the existing rules simulator alone is not evidence that deployed rules enforce the contract.

Preserve the distinction between staged teacher settings and applied room state. Room commands belong to the teacher; learner UI must not acquire command authority.

Keep secrets out of client bundles and documentation. Deployment, destructive library resets and data deletion require explicit approval. Preserve unrelated working-tree changes.

For verification, inspect `package.json` scripts. Report typecheck, build, helper tests, rules enforcement and browser E2E separately, including skipped checks. Firebase static Hosting does not by itself run the Express API.

## Agent skills

### Issue tracker

Local Markdown under `.scratch/<feature>/`. Read [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) before publishing specs, creating tickets or resolving dependencies.

### Triage labels

Use the five default Matt roles. Read [docs/agents/triage-labels.md](docs/agents/triage-labels.md) before assigning readiness.

### Domain docs

Single-context. Read [docs/agents/domain.md](docs/agents/domain.md) before domain exploration or glossary/ADR changes.
