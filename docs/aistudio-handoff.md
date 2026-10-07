# Chunks Reading — current-source → AI Studio handoff

Status: prompt/documentation handoff only. Existing React/Vite prototype is the starting point; no new app, backend completion, cloud writes or deployment is claimed. Stitch exports/scripts/screenshots were removed from the local repo at the user's request. Remote design projects were not deleted; their screens are not required inputs.

## Source of truth

- [PRD](PRD.md): confirmed product behavior.
- [Spec](../specs/001-teacher-controlled-reading/spec.md): all user stories and acceptance/testing scope.
- [DESIGN.md](../DESIGN.md): supplied editorial design system and current interaction contract.
- [Draft seeding contract](resource-seeding.md): trusted direct-database Draft workflow, human review before Publish.
- [Spec coverage baseline](spec-coverage-baseline.md): historical observations, to revalidate against current source.

AI Studio is optional; Antigravity remains the local implementation path via [its execution contract](prompts/antigravity-redesign-and-backend.md). Both paths improve the existing app and preserve the same requirements. Do not run both agents on the same file set concurrently.

## Inputs to attach/import

AI Studio cannot fetch local Windows paths. Open an existing WEB project or import/upload the current source using the receiving environment's supported mechanism. Verify the source is really present before issuing an edit prompt. No ZIP has been created.

Include:
- Current frontend source, package.json/lockfile, relevant build/config/tests and existing backend if present. Preserve deployment configuration; never attach .env values, service accounts, private keys or tokens.
- `AGENTS.md`, `docs/agents/`, `docs/PRD.md`, `DESIGN.md`, `specs/001-teacher-controlled-reading/spec.md`, `docs/resource-seeding.md` and `docs/spec-coverage-baseline.md`.
- Real `assets/logo.png`; use a verified served copy in the app, not a Windows src path.
- The prompt for the selected checkpoint; runtime phrase prompt only when preparing the later optional detector.
- Relevant installed Firebase/Matt skill files AND references, using the paths listed in the Antigravity contract. AI Studio does not automatically inherit local installed skills. Verify availability; a named skill is not proof it was read or run. Do not upload unrelated skill collections or private credentials.

## Send prompts in order

1. [Audit-only prompt](prompts/aistudio-audit.md): inspect actual code/runtime/skills, report baseline, proposed vertical tickets and public test seams. No edits. Review and approve the bounded plan.
2. [First implementation checkpoint](prompts/aistudio-first-checkpoint.md): redesigned Teacher Setup/Live and learner join/Reader, exact spans and both timing policies through a controlled server-backed development tracer. Reuse secure existing capabilities if present; never downgrade them to mocks.
3. Review actual test/browser/API evidence and improved UI. Generate one next prompt from its real paths/report: secure Firebase classroom → reviewed persistent resources/Draft seed → safe URL/optional AI → acceptance/release audit.

Full product scope remains the PRD/spec. The tracer intentionally does not claim Google Auth, durable resources, rule security, seed or AI are complete. Missing capabilities are labelled as such. Public unauthorized demo commands are forbidden.

## Firebase / engineering gates

Follow actual Firebase Auth, Firestore and rules-authoring/auditor skill instructions before corresponding work; verify database ID/edition, SDK, project ownership and target. Classic Vite SPA hosting is not automatically Firebase App Hosting or Cloud Run. Server deployment choice requires an approved plan.

Use the Matt route: audit → approved vertical tickets/test seams → implement/TDD → separate Standards/Spec review → evidence. If skills, reviewers, CLI or browser are unavailable, report the limitation and pause the affected gate rather than fabricate pass results. No automatic Git commits/push, cloud configuration or deployment.

## Runtime AI is a separate prompt plane

[Exact phrase runtime contract](prompts/runtime-phrase-detection.md) is server application logic for teacher-initiated candidate extraction, not the Build Agent task. It yields pending suggestions only; backend validates exact UTF-16 occurrences and teacher approval precedes learner highlighting. Deterministic/manual review works without a provider. Current model/API, budget and privacy require verification before enabling billable calls.

## Credentials and production approval

No credentials are included. Any credential previously shared in chat should be rotated by its owner. Keep replacements in appropriate server secret/environment controls, never prompts, assets, logs or source bundles. Public Firebase Web configuration is not a server/Admin credential.

Production writes/provisioning, provider enablement, billing, retention changes and deployment require separate explicit owner approval. Emulator success and build passing do not prove production Auth, security or multi-device synchronization.
