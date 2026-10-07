# Antigravity — In-place UI improvement and missing backend

Paste the launch block into Antigravity with this repository open. The full execution contract follows. No credentials belong in the prompt. This is an implementation handoff, not a claim that work is already done.

## Launch block — copy and send

```text
Work in C:/Users/gensh/Desktop/CHUNKS/PROJECT/Chunks-reading.
Read AGENTS.md and docs/prompts/antigravity-redesign-and-backend.md completely, then follow that execution contract.
Improve the UI/UX directly in the existing React/Vite app using the newly updated DESIGN.md; the current Paper/Stitch candidates were not approved and must not be copied blindly.
Implement the missing classroom/backend behavior from docs/PRD.md and specs/001-teacher-controlled-reading/spec.md through the Matt Pocock flow: audit -> proposed vertical tickets and test seams -> brief approval -> implement with TDD -> Standards + Spec review -> evidence.
Read and apply the actual Firebase skill files before relevant work. Maintain a skill-read and acceptance-evidence ledger; naming a skill is not following it.
This request authorizes local in-place implementation and emulator tests, not production writes, cloud provisioning, billing changes, push or deployment. Preserve existing user changes. Start by returning your observed baseline, skill availability, proposed slices/seams and first UI scope. Do not restart the product interview; ask only about genuine blockers or required skill gates.
```

## 1. Mission and role

Act as the implementing full-stack engineer and product designer. Improve a teaching assistant, not an assessment product. The user accepts the supplied design SYSTEM and authorizes your own thoughtful in-place visual improvement; there is no approved Paper/Stitch screen to trace pixel-for-pixel. Deliver polished UI and real, verified classroom capabilities incrementally, rather than a successful-looking static demo.

## 2. Context and authority

Read in this order:
1. AGENTS.md and docs/agents/issue-tracker.md, triage-labels.md, domain.md.
2. DESIGN.md — new user-supplied YAML palette/typography/radii/spacing plus behavior appendix.
3. docs/PRD.md and specs/001-teacher-controlled-reading/spec.md — confirmed product behavior and acceptance.
4. docs/resource-seeding.md — direct-database Draft seed contract.
5. docs/spec-coverage-baseline.md — historical audit, to revalidate against current source.
6. docs/design-review/coordinator-review.md — historical partial/unapproved candidate review and known defects. Local Stitch artifacts have been deleted; do not request or recreate them. DESIGN.md and current source are sufficient visual inputs.

Inspect current package scripts, Git status/history, source, Firebase/Hosting configuration and available tests. Earlier audit observed React 19/TypeScript/Vite/Tailwind, local room useState and TeacherView/StudentView, forest/Vietnamese UI, 5s/3s defaults, looping eraser, full article passed to learner, no true join/presence/room service or test suite. Firebase SDK/configuration exists; this does not prove real Google sign-in, durable data, correct deployed rules or live backend. Recheck all observations; do not erase another agent's newer work to match this snapshot.

Candidate existing boundaries: src/App.tsx; src/components/TeacherView.tsx, StudentView.tsx and Navbar.tsx; src/types.ts; src/index.css; src/firebase.ts; src/data/sampleArticles.ts. Establish actual new paths through inspection. Keep useful React boundaries and the existing frontend deployment topology unless an approved technical change requires otherwise.

The current AI Studio handoff also audits/improves imported source in bounded checkpoints; it is optional, not a prerequisite for this local run. Historical architecture documents and superseded prompts are not implementation authority. Do not provision Cloud Run or replace Firebase Hosting merely because earlier docs proposed a different deployment target.

### Skill loading — mandatory evidence, not name-dropping

This machine has project Firebase skills under `.agents/skills/<name>/SKILL.md`. Global Matt skills are under `C:/Users/gensh/.agents/skills/`; Pi-specific TDD/review copies are under `C:/Users/gensh/.pi/agent/skills/`. Read the actual files and their relevant references; use relative references against each skill directory. On another machine discover equivalent installed paths; do not assume a slash command exists.

For every phase, record skill name, resolved path, applicable rule and how the phase applied it. If a required skill is unavailable, report the exact missing path and pause the affected phase; do not pretend invocation succeeded or silently install random packages.

Matt route:
- Read `matt-advisor` and routing/phase-transition references.
- Read `to-tickets` before ticket breakdown. Use complete vertical tracer-bullet slices with real blocking edges; present the breakdown and obtain the skill's brief approval. Do not reopen settled product requirements.
- Read `implement` and `tdd` (including tests/mocking references). Confirm public test seams before writing behavioral tests. One failing behavioral test -> minimal implementation -> next slice. Use browser checks for visual-only changes; do not fabricate a failing test for CSS aesthetics.
- Read `code-review`; pin and confirm a baseline ref and include pre-existing dirty-file boundaries. Review Standards and Spec independently, preferably parallel read-only reviewers. If independent agents are unavailable, report the limitation; a self-review is not an independent review.
- Read `hallmark` redesign guidance for in-place visual improvement and preserve DESIGN.md tokens; `react-best-practices` after editing multiple TSX components. Design skill is not permission to bulldoze routes/modules.
- Read browser verification skill (`agent-browser` or available equivalent) when starting a dev server. Verify real pages, not screenshot filenames alone.

Firebase route:
- `.agents/skills/firebase-auth-basics/SKILL.md` before teacher Google sign-in and technical guest identity; read relevant Web SDK reference. Verify authorized domain/provider requirements against current official docs.
- `.agents/skills/firebase-firestore/SKILL.md` before database/schema/index/SDK work. Identify target database ID/edition before edition-specific SDK or concrete schema work. Use an explicitly configured emulator/development target for local verification; missing production edition is a blocker for production integration, not a reason to guess.
- `.agents/skills/firestore-rules-creation/SKILL.md` before authoring rules. If the designated rules-author subagent is available, delegate as required; otherwise follow the skill directly. Add emulator allow/deny tests.
- `.agents/skills/firebase-security-rules-auditor/SKILL.md` for an independent rule audit after rules are drafted; report uncovered items.
- `.agents/skills/firebase-basics/SKILL.md` ONLY when CLI login/project selection/config download is actually needed.
- `.agents/skills/firebase-hosting-basics/SKILL.md` for classic Hosting configuration/deployment. App Hosting skill is not the right default for this Vite SPA. Deployment remains approval-gated.
- If the plan uses GCP-managed server resources, load relevant GCP/auth-verification skills and current documentation before any cloud command. Local backend implementation does not authorize cloud resource creation.
- Optional AI phrase detection requires current provider/model documentation and appropriate AI skill. Firebase AI Logic client inference is not permission to move secret-backed server phrase logic into the learner client. No real AI call is required until provider/budget is configured.

## 3. Protocol and implementation checkpoints

### Phase 0 — Audit and bounded plan

- Capture source baseline, uncommitted changes, current scripts, route/backend topology and missing behavior. Preserve existing documents/assets and unrelated modifications. Do not reset/clean/overwrite the workspace.
- Present numbered vertical tickets with dependencies and acceptance, skill-read ledger, exact proposed modified/new files and public test seams. Ask once for ticket/seam approval required by Matt skills; no lengthy product interview.
- Primary seam: teacher actions -> actual shared room authority -> learner snapshot/rendered UI. Resource lifecycle uses its public import/review/publish interface; seed/readback uses authorized seed/publication boundary. Security-rule tests may directly exercise the emulator access boundary. Prefer high behavioral seams over internal hook/reducer mocks.
- Tracker is GitHub genshai-11/chunks-reading; use explicit repo and deduplicate. Publish only the approved breakdown, with ready-for-agent and correct dependencies, after confirming write access. Never invent issue IDs or silently switch tracker. If access blocks publication, report it and seek permission to proceed with recorded local planning evidence.
- Preserve user ownership: no automatic commit, push or deployment. This explicit handoff policy overrides the implement skill's automatic commit step. Report ready-to-commit diff after review.

### First delivery — Improve the existing teacher/learner experience

- Build a coherent compact editorial UI with the actual local logo, English UI/content, Literata reading/headings and Inter controls. Use DESIGN.md semantic tokens; CHUNKS primary actions use accent #b91c1c with white, reading uses paper/ink. Broader Material-style primary #93000b does not silently replace the brand accent.
- Preserve token distinctions: rounded scale sm=2px/md=6px, while component radius-sm=4px (DEFAULT) and radius-md=8px (lg). Verify contrast for actual adjacent colors.
- Prioritize Teacher Setup/Live and Learner Reader. Do more than recolor the old page: improve hierarchy, density, private-vs-live grouping, controls, whitespace and responsive layout. Functional reading motion matters more than decorative animation.
- Reader fills the actual viewport and remains uncluttered. Remove debug footnotes, proof labels, eraser explanations, fake device frames and article-wide vocabulary leakage. Keep discreet connection/waiting metadata outside the reading field. Mark development-only samples honestly; mock controls are not finished features.
- Teacher Setup: independent Sentence/Paragraph and approved Highlight toggle; two timing policies, labelled editable durations and effective Hold/Erase/Total; independent guide toggle and eraser/dissolve effect; real private animation preview.
- Teacher Live: private unit navigation/resource selection, source article and learner preview, separate Play/Replay, Pause/Resume, Show/Hide, Apply and End controls. Stage changes; never auto-broadcast private selection.
- Use compiled styles, not Tailwind runtime CDN. All interactive states, labels/focus, >=44px touch targets and reduced-motion behavior must work. Add clear loading/empty/error/reconnecting states.
- Capture before/after screenshots at teacher1440/768 and learner320/375/390/414 widths; verify no root overflow or word clipping. Present the improved UI for feedback; record whether visual approval is pending. Do not falsely label it user-approved.

### Classroom behavior delivery — Real shared room, not local-role-switch demo

- Implement an authoritative trusted room service using the proposed stack only after inspecting current topology. Validate commands server-side against teacher ownership. Learner UI absence of controls is not authorization.
- Use idempotent command IDs, expected revision and transactional updates. Snapshot delivers only the current authorized unit/approved spans, not full article/future units. Coarse transitions/realtime only, no per-frame network events.
- Use server timestamps/clock-offset estimate and policy-specific absolute phase derivation. Default full hold0–2999ms, erase3000–3999ms, blank>=4000ms. Within-window hold0–1999ms, erase2000–2999ms, blank>=3000ms. Validate finite positive timings and erase<=total for within-window.
- Guide and opaque eraser traverse measured rendered lines/words. Resize changes geometry, not timeline. Text/highlight become fully unreadable at expiry. No reset-at100% loop, translucent expiry mask or multi-line vertical strip pretending to follow reading order.
- Pause freezes elapsed phase/mask; Resume continues; Replay starts a new revision. Show is persistent until Hide/authoritative transition. Apply installs published version/settings, clears to blank waiting and does not auto-play. Private navigation presents only on teacher Play/Show.
- Late join/reload/background/reconnect derives current phase/mask; never a fresh3s. Stale revisions cannot overwrite current authority. Timed content still expires offline. Resolve manual-Show offline fail-safe through an explicit owner decision before production.

### Identity and participation delivery

- Teacher Google sign-in through Firebase Auth; backend verifies tokens/ownership. Reject learner and other-teacher commands even if requests are crafted directly.
- Active room link + display name, no visible learner registration/admission. Invisible technical anonymous identity is acceptable only with verified membership/security; names are not proof of identity. No hard20-seat cap.
- Real online count/name list, duplicate/reconnect-safe presence and teacher removal. Room-end/reconnect/join errors are meaningful. Use appropriate rate/input limits; never grant teacher rights from client role flags.
- Add Firestore rules, indexes and emulator tests against the verified edition/SDK. If Admin SDK is used, explicitly enforce equivalent ownership/membership because rules do not constrain it.

### Resource delivery — Reviewed content and direct Draft seed

- Persistent teacher-owned categories/resources/immutable versions; filters category/topic/estimated CEFR/type/source and Draft/Published. Review/edit text and provenance before publishing; only published versions enter rooms. Active room versions do not change from library edits.
- Paste/TXT first, then safe supported URL import with timeout/size/content-type limits, SSRF protection across DNS/connect/redirect and text sanitization. Inaccessible URL offers paste fallback; no paywall/cookie bypass.
- Deterministic candidates and manual review first; optional AI only with configured provider/budget. Exact approved UTF-16 [start,end) slices, version/unit/exactText/type/source/review status, repeated occurrence resolution and overlap conflicts. Edits invalidate spans.
- Fixture: Long story short, we decided to give it a shot. Highlight ONLY Long story short and give it a shot, not punctuation or entire container. English meanings/content throughout.
- Implement trusted seed tooling with explicit target/owner, dry-run, idempotent source/content hash, bounded writes, actual database readback and retry-safe audit. Seed directly into emulator/approved development database as Draft; phrase suggestions remain pending. No published/approved seed shortcut, destructive cleanup or mutation of active versions.
- Real source rights/provenance are mandatory; public URL is not copying permission. Original/clearly permitted content is the default for initial samples.

### Final verification and release gate

Each delivery is a complete observable capability through needed data/API/UI/tests, not a giant horizontal UI/backend rewrite. Resolve only real blocking edges. Work one approved frontier ticket at a time; fresh context may be used once its ticket and evidence are externalized.

Run targeted tests regularly, typecheck/build and full suite at completion. Review Standards and Spec separately against the fixed baseline; fix findings through tested changes. Update coverage by user story with Done/Partial/Missing/Unverified plus actual evidence. No invented completion percentage.

Explicit owner approval is required before cloud provisioning, production data/rule writes, provider enablement, billable AI, retention-policy rollout, Git push or deployment. Local request is not blanket Firebase project authorization. Verify target/environment and report blockers without printing tokens or private keys. Firebase public Web configuration is not an Admin credential; verify project identity rather than claiming all client config is a leaked server secret.

## 4. Acceptance and completion evidence

Record individual Pass/Fail/Unverified:
- New design tokens, actual logo, English copy, useful compact teacher hierarchy and quiet reader.
- Real desktop/mobile reflow and keyboard/contrast/reduced-motion checks.
- Both timing policies at boundary milliseconds; Show remains visible until Hide; pause/resume preserves progress; Replay explicit.
- Apply clears/waits; private unit/resource selection does not accidentally publish.
- Late join/background/offline/reload does not restart a timed turn; measured multi-device sync.
- Exact approved spans including repeats, Unicode prefixes, overlap, invalidated edits and malformed AI output.
- Google identity, guest membership/presence and direct unauthorized access rejection; Firestore emulator rules tests and audit.
- Persistent Draft review/publication/version isolation and categorized idempotent direct-database seed with readback.
- Safe import failures and SSRF/redirect cases; deterministic/manual fallback when AI absent.
- Approximately20-learner test; report measured latency and limitations, not a guarantee.

For every checkpoint return:
1. Implemented ticket/scope and real modified file paths.
2. Skills read/applied and unresolved skill/environment gates.
3. Commands/tests with actual results; failing red test evidence for behavior changes.
4. Screenshots or accessible preview instructions; actual transport/data verification.
5. Separate Standards and Spec findings, fixes and remaining issues.
6. Coverage changes, unverified checks and next blocked ticket.

A build passing does not prove UI quality, authentication, security, realtime or production readiness. Report these independently. Stop at human/infra gates rather than fabricate success or auto-deploy.
