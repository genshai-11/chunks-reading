# Agent instructions

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `genshai-11/chunks-reading`. Before reading, creating or updating tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels. Before applying or changing triage labels, read `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` and `docs/adr/`. Before codebase exploration or design, read `docs/agents/domain.md` and any relevant existing domain documents.

## Implementation workflow

Before UI improvement or missing-backend implementation, read `docs/prompts/antigravity-redesign-and-backend.md`. Follow the actual Matt Pocock skill files (ticket/seam approval, TDD and separate Standards/Spec review), and load the applicable `.agents/skills/firebase-*/SKILL.md` plus `firestore-rules-creation` before Firebase work. Record resolved skill paths and evidence; do not substitute naming skills for reading/applying them. Cloud writes and deployment require separate owner approval.

## Product contract

Before implementing classroom behavior or visual changes, read `docs/PRD.md` and `DESIGN.md`. For the full implementation scope, read `specs/001-teacher-controlled-reading/spec.md`. Historical architecture proposals are not authority over the confirmed contract. Local Stitch exports have been removed; do not request or recreate them as prerequisites. AI Studio handoff starts with `docs/prompts/aistudio-audit.md`, followed by one reviewed checkpoint.

Before implementing resource seeding, read `docs/resource-seeding.md`. Verify the target database and obtain approval for actual writes; seeded resources remain Draft until teacher publication.
