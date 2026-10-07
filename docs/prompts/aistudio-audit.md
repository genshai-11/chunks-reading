# AI Studio Build Agent — audit imported Chunks Reading

Run this first in an existing/imported WEB project. AI Studio cannot read this computer's paths; attach the source and documents listed in [handoff](../aistudio-handoff.md). This block is audit-only, not a runtime Gemini prompt.

```text
MISSION AND AUTHORITY
Act as the engineer auditing the existing Chunks Reading web app. Do not edit files, install packages, write database records, change cloud configuration, enable providers, commit/push or deploy. No secrets should appear in your report.

INPUTS AND CURRENT STATE
Read the attached AGENTS.md, docs/PRD.md, DESIGN.md, specs/001-teacher-controlled-reading/spec.md, docs/resource-seeding.md, docs/spec-coverage-baseline.md and current app source/config/tests.
The previous audit observed React19/TypeScript/Vite/Tailwind, App/TeacherView/StudentView with browser-local state, Firebase SDK initialization, sample articles and no behavioral test suite. Historical build passed; today's behavior/build/backend must be rechecked. No Stitch export or handoff ZIP is required or authoritative.
The user requests improvement of the existing app using the new editorial DESIGN.md, not a greenfield rewrite. All UI/content English; teacher-controlled reading, not testing/grading. Preserve existing source changes and assets/logo.png.

PROTOCOL
Read the full inputs and assess edge cases before reporting. Inspect actual files, not proposed module names. Map:
1. Runtime, scripts/dependencies, entry points, screens and compiled styling.
2. Teacher setup/live and learner flow, state ownership, phase/mask timing and phrase renderer.
3. Server routes, if any, identity, tenant ownership, room membership/presence and authorized snapshots. Distinguish SDK initialization from working Auth/data/realtime.
4. Persistent resources/categories/immutable versions, Draft review/publication and direct-database seed tooling, if any.
5. Import and optional AI boundaries; report environment variable NAMES only. No real provider calls or remote reads/writes are authorized.
6. Tests/build, Firebase rules/index/emulator configuration and existing deployment topology. Do not force Cloud Run, App Hosting or a parallel frontend stack.
7. Available skill files and their references. Read supplied applicable Matt/Firebase instructions; report missing skills rather than claim execution. Do not install them or invent slash commands.

CONFIRMED INVARIANTS
- Google teacher sign-in via Firebase; learners active link -> display name, no registration/admission; approximately20 is a validation target, not a cap.
- Sentence/Paragraph independent of approved Highlight toggle.
- Default Hold then erase: full text3000ms, erase1000ms, blank at>=4000ms. Within-window total3000ms with final1000ms erase, blank at>=3000ms.
- Show/Hide manual persistent state; Pause/Resume preserves elapsed; Replay explicit; private navigation not broadcast; staged resource/mode/settings require Apply to room, clearing to blank without auto-play.
- Late join/reload/reconnect matches current phase/mask. No full article/future-unit delivery to learners. Exact approved UTF-16 spans only.
- Agent seed writes Draft; teacher reviews/publishes. No testing, scores, DRM or eye tracking.

COMPLETION CONTRACT
Return an evidence ledger [Observed/Inferred/Assumed/Unknown] with exact paths, current build/test results if executable, relevant defects, preserved boundaries and a small dependency-ordered vertical ticket plan. Confirm the proposed public classroom test seam: teacher commands -> shared authority -> learner snapshot/rendered view; add narrowly needed clock/Unicode/security boundaries.
Ask only genuine blockers and for ticket/seam approval, not another product interview. Identify the smallest feasible first checkpoint using docs/prompts/aistudio-first-checkpoint.md. If WEB server/runtime/access constraints prevent it, name the blocker and propose a bounded alternative for approval; do not replace shared authority with localStorage/BroadcastChannel and call it realtime.
Stop after the report. Implementation begins only with the separate checkpoint prompt after this baseline is reviewed.
```
