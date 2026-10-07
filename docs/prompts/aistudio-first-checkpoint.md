# AI Studio Build Agent — checkpoint 1: redesigned classroom tracer

Status: current prompt aligned with PRD/spec/DESIGN.md; supersedes the old Stitch-port prompt. Run [audit](aistudio-audit.md) first and review its ticket/test-seam plan. Attach the current source, documents and real logo using [handoff](../aistudio-handoff.md). No ZIP is claimed to exist. Local paths below identify attachments, not URLs the Build Agent can fetch.

Send only the following block after audit approval. One checkpoint, not full production implementation; keep runtime phrase extraction separate.

```text
1. MISSION AND ROLE
Act as the implementing full-stack web engineer and editorial UI designer for Chunks Reading. Improve the existing React/Vite app in place and deliver ONE observable classroom tracer: a teacher's private Setup/Live controls present an exact English unit to a second learner context through a server-owned development room, with both timing policies, separate manual Show/Hide and staged Apply. Do not claim production Auth/persistence/security or deploy.

2. CONTEXT AND INPUTS
Platform: existing/imported WEB project. Reuse observed React/TypeScript/Vite/Tailwind boundaries. A trusted Node.js service is a candidate for the missing server; verify the actual receiving environment supports it before implementation. Do not convert to Android, Next.js, App Hosting or a new app by default.
Authority:
- docs/PRD.md: confirmed product requirements.
- specs/001-teacher-controlled-reading/spec.md: user stories, implementation/testing decisions and exclusions.
- DESIGN.md: current user-supplied design system and interaction appendix.
- AGENTS.md and docs/agents/*: workflow, tracker and domain conventions.
- docs/resource-seeding.md: later direct-database Draft seed contract.
- docs/prompts/runtime-phrase-detection.md: later server runtime candidate extraction, not this Build Agent instruction.
- assets/logo.png and current source/config/tests; previous audit report and approved ticket/seam plan.
No Stitch artifacts are required. Improve layout independently using the accepted design system; do not invent an approved external screen or request obsolete exports.

Historical source audit (revalidate): src/App.tsx owns local room state; TeacherView mutates live settings/private navigation and Resume resets start time; StudentView loops a local eraser and uses unsafe phrase matching; src/types.ts lacks versioned review/timing states; src/firebase.ts initializes SDK only; sampleArticles/index.css provide old samples/styles. A historical build passed, not Auth/backend verification. Preserve any newer working implementation found in the audit.

3. PROTOCOL, SCOPE AND CONSTRAINTS
A. Follow the approved bounded ticket plan. Read the actual supplied skills before applicable work: Matt advisor -> to-tickets -> implement/TDD -> separate Standards/Spec code review; Firebase Auth/Firestore/rules-authoring/auditor when their scope is reached. Skill names are not proof. AI Studio cannot read global Windows skill paths: use attached skill files and relevant references; report unavailable files/capabilities. Missing skills block the affected phase, not permission to silently replace them. No GitHub publication without access/write approval.
B. Capture a source baseline and preserve unrelated changes. Briefly list files and public interfaces to change, then implement the approved slice test-first for behavior: one red test -> minimal green -> next behavior. Visual styling uses real browser checks; do not invent cosmetic failing tests. Pin review scope; report independent reviewer unavailability honestly.
C. Build tokens/compact responsive Teacher Setup/Live, join-name entry and uncluttered Learner Reader. Real logo, all English copy. Literata/Georgia reading/headings; Inter controls; roman headings. Paper#f6f6f3, ink#222220, accent#b91c1c with white actions, phrase#f3e2ad. Use all semantic roles and states from DESIGN.md, compiled CSS not Tailwind runtime CDN. Component radii4/8px map to rounded DEFAULT/lg, not scale sm/md. No marketing hero, fake device frames, debug proof labels, grades or lexical heatmap.
D. Setup independently controls Sentence/Paragraph, approved Highlight, timing policy/durations, guide and eraser/dissolve. Show Hold/Erase/Total and actual private animated preview. Teacher retains full source/private navigation and learner preview. Learner gets only current-unit text and approved spans, no future text, article-wide vocabulary list or playback/navigation controls.
E. Reuse an existing trusted room service if available. Otherwise add the smallest server-owned deterministic DEMO room across two independent browser contexts. Do not use BroadcastChannel/localStorage or a role switch as shared authority. In-memory demo state is non-durable and labelled as such. Restrict demo authority to controlled local/development access and prevent production exposure. If this environment cannot guarantee that boundary, stop the server portion and request approval for an external/local verification environment. Do not publish unauthenticated teacher commands. A development-only access token is not production Google identity.
F. Use two clearly labelled sample resources and approved fixture spans. Teacher chooses units privately; Play/Show presents. Resource/mode/highlight/timing/effect changes are staged; Apply atomically installs selection/settings, increments revision, clears learners to blank waiting, and never auto-plays. Learner link + name joins without admission or hard20-seat cap; count/list must reflect real connected demo memberships, not hardcoded20.
G. Commands validate payloads, command IDs/idempotency and expected revision; stale conflicts are actionable. Snapshot/time boundary supplies server time and current revision. Coarse realtime/polling is acceptable for this development tracer if its latency is measured; no per-frame network messages.
H. Default Hold then erase: holdMs3000, eraseMs1000; hold at2999, erasing at3000, blank at>=4000ms. Erase within window: totalMs3000, eraseMs1000; hold at1999, erasing at2000, blank at>=3000ms. Teacher-adjustable finite positive durations; erase<=total for within-window. Show is persistent until Hide/authoritative transition, not a timed replay. Pause preserves elapsed phase/mask; Resume continues; Replay explicitly starts a new turn. No auto-advance/looping.
I. Late join/reload/background/reconnect derives the current phase/mask from the authoritative timeline, never a new3s. Received timed content expires offline. Reject stale snapshots; no new reveal offline. Record stale manual-Show fail-safe as an unresolved production decision rather than silently inventing it. Guide/opaque eraser follows measured rendered lines/words; resize changes geometry, not time. Erase text and phrase background together and leave blank at expiry. No translucent whole-column mask or reading-order label pretending to prove motion. Reduced motion keeps the same deadlines.
J. Render validated UTF-16 [start,end) slices, not unescaped regex/string replacement/arbitrary HTML. Fixture: Long story short, we decided to give it a shot. ONLY Long story short and give it a shot receive approved warm inline backgrounds; punctuation/rest normal. Source=manual/fixture, not fabricated AI success. Freeze canonical sample text/version before annotation; reject invalid/overlapping spans.
K. Add keyboard-visible focus3px, labelled controls, >=44px targets, dialog focus/Escape, long-name wrapping, loading/empty/invalid-link/reconnecting/ended/errors. Mobile canvas is actual viewport, not fixed390px frame with extra padding. Disabled controls must explain staged/unavailable actions.

PRESERVE / EXCLUDE
Preserve confirmed teacher-controlled behavior, actual source/assets/routes where useful and current deployment topology. Never equate hidden learner buttons with authorization.
This checkpoint excludes production Google OAuth, real Firebase data/rule writes, persistent Library/review/publication, actual seed jobs, URL fetching, paid Gemini inference and release. If already working, preserve these features and their regression coverage; do not replace them with demo mocks. Absent later features remain visibly unavailable, not successful-looking fake buttons.
Keep production teacher identity/ownership and guest membership as required next checkpoint. Full product requires categorized Draft/Published Library, immutable versions, teacher phrase approval, safe paste/TXT/URL import and direct-database Draft seed; none is implicitly removed by this bounded slice.
No provisioning, provider enablement, billing, production writes, push or deployment. Do not print secrets; Firebase public Web config is not an Admin credential. Verify environment names/target without exposing values. Use current official documentation before volatile SDK/model/hosting decisions; do not freeze a model ID or force Cloud Run.

4. ACCEPTANCE AND COMPLETION CONTRACT
Evaluate each criterion Pass/Fail/Unverified before summarizing:
1. Teacher Setup/Live and learner join/reader use DESIGN.md, real logo, English copy, independent granularity/highlight, labelled durations, private dynamic preview, staged Apply and separate timed/manual controls.
2. Exact fixture, repeated occurrence and emoji-prefix spans are correct; punctuation/full sentence never highlighted; invalid spans fail safely.
3. Clock tests cover2999/3000/4000 and1999/2000/3000ms; manual Show remains after both deadlines until Hide. Invalid timing rejected. Pause/Resume preserves remaining exposure and Replay is explicit.
4. Two independent contexts actually use shared server state. Late join during hold/erase/pause/Show and after expiry matches current phase/mask. Apply clears/waits. Private navigation does not change learner display. Duplicate/stale commands cannot apply twice or roll back revision.
5. Network interruption, background resume, reload and resize do not restart time or disclose future text. Actual measured line-following motion and complete expiry are verified, not inferred from a static screenshot.
6. Verify320/375/390/414/768/1440px, no body overflow/clipped words, touch targets, focus/labels/contrast/reduced motion and console errors. Counts/names are real demo presence, not invented metrics.
7. Run actual build/typecheck/targeted tests/full available suite. Report red-before/green-after behavior evidence and separate Standards/Spec review. Tests not runnable in the preview must be reported unverified with precise external instructions, never marked passed.

Return demo steps, observed/changed paths, skills actually read/applied, test commands/results, screenshots, real transport/sync measurements, review findings, security/demo limitations and story coverage Done/Partial/Missing/Unverified. Production Auth/persistence/seed/AI remain Not implemented unless preserved with actual evidence. No fabricated completion percentage.
Stop after this checkpoint for evidence/UI review. Do not automatically execute the later roadmap or deploy.
```

## Next checkpoints — generate only after current evidence passes

| Checkpoint | Observable outcome and gate |
|---|---|
| 2. Secure classroom | Google teacher identity, verified ownership, link/name guest membership, real presence/removal, authorized room commands/realtime; Firestore edition/target verified, rules emulator allow/deny tests and audit. Remove production-reachable demo authority. |
| 3. Reviewed resources | Persistent teacher-owned categorized Library, paste/TXT, phrase review, immutable publication and frozen room versions. Implement idempotent direct-database Draft seed tooling with dry-run and emulator/development readback; actual target writes separately approved. |
| 4. Safe import / optional AI | Supported public URL import with SSRF/redirect/size/timeout defenses and paste fallback; optional configured server detector follows runtime contract and semantic/injection/timeout evaluation. No AI approval shortcut. |
| 5. Acceptance / release audit | Approximately20 learners plus real-device sync, complete story coverage, accessibility/regressions, retention/manual-Show fail-safe and duration bounds resolved. Separate release approval; no automatic deploy. |

Every subsequent prompt must name actual files and evidence from the prior checkpoint, not imagined modules. The current PRD/spec remain the full scope; a demo is not acceptance of missing production features.
