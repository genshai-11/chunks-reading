---
type: spec
status: draft
publication_status: pending_github_publication
intended_triage_label: ready-for-agent
description: Complete the teacher-controlled Chunks reading teaching assistant from the existing local prototype.
owner: project-owner
parent_basis: confirmed-conversation-and-PRD
tags: [spec, classroom, reading]
---

# Chunks reading — Teacher-controlled reading classroom

## Problem Statement

Teachers need a compact teaching assistant to prepare categorized English reading resources, review useful expressions, and present reading units to a classroom at a teacher-controlled pace. This is not a testing or grading platform. Learners should enter through a shared link and their name, follow the same current reading state, and see an attractive book-like interface rather than a crowded control panel.

The current prototype demonstrates teacher and learner views but does not establish a shared classroom: switching views uses local React state, the learner receives the whole sample article, text remains visible outside timed playback, and the eraser loops independently of authoritative timestamps. Teachers cannot reliably stage resource changes, publish reviewed resources, identify connected learners or synchronize late joins across devices.

## Solution

Deliver an English-language teaching assistant with a cream-paper, serif-reading, CHUNKS-red visual identity. Teachers sign in with Google through Firebase Authentication, maintain a categorized Draft/Published resource library, review exact phrase candidates, create rooms and share join links. Learners enter their name without account registration or teacher admission and follow teacher commands.

Teachers choose Sentence or Paragraph independently of phrase highlighting, configure and privately preview reading/erase effects, and control Play, Pause, Resume, Replay, Show and Hide. Default timing holds all text for 3 seconds, then erases over 1 second. An alternative uses a total 3-second window, erasing in its final second. Completed playback returns to blank paper until teacher action. Resource/mode/settings changes require Apply to room and never unexpectedly start a new turn.

Agents can seed classified resources directly into the approved database as Draft. Seeding never substitutes for teacher publication or phrase approval.

## User Stories

1. As a teacher, I want to sign in with Google, so that I can manage my resources and rooms without a separate password.
2. As a teacher, I want my library isolated from other teachers, so that private preparation is not exposed.
3. As a teacher, I want a compact book-like workspace, so that preparation and presentation remain focused.
4. As a learner, I want English UI and reading content, so that the classroom experience is consistent.
5. As a teacher, I want searchable resources, so that I can quickly select a suitable reading.
6. As a teacher, I want category, topic, level, source-type and publication-status filters, so that a seeded library remains easy to browse.
7. As a teacher, I want to create custom categories, so that resources fit my teaching organization.
8. As a teacher, I want to paste English text, so that I can prepare a reading without external import dependencies.
9. As a teacher, I want to import TXT files, so that existing plain-text resources are reusable.
10. As a teacher, I want to import supported public article URLs, so that permitted material needs less manual preparation.
11. As a teacher, I want pasted-text fallback when a URL fails, so that preparation is not blocked.
12. As a teacher, I want to inspect and edit extracted text and attribution, so that errors do not reach the classroom.
13. As a teacher, I want immutable published versions, so that editing my library does not change a live reading.
14. As a teacher, I want expression suggestions from deterministic matching and optional AI, so that I can identify useful language efficiently.
15. As a teacher, I want to approve, reject, edit or manually add exact phrase annotations, so that suggestions are not treated as truth.
16. As a teacher, I want annotation conflicts and invalid spans exposed, so that highlighting remains accurate.
17. As a teacher, I want Draft resources reviewed before publication, so that learner-facing material is intentional.
18. As a seeding agent, I want a documented database record contract, so that I can insert valid classified Draft resources.
19. As a seeding agent, I want idempotent seed retries, so that failures do not create duplicate resources.
20. As a teacher, I want provenance and estimated level recorded for seeded resources, so that I can judge suitability and rights.
21. As a teacher, I want only published versions selectable for learner presentation, so that review cannot be bypassed.
22. As a teacher, I want to create and share a room link, so that learners can join with minimal friction.
23. As a learner, I want to enter only my name after opening the link, so that I do not need to register an account.
24. As a learner, I want to join an active room without manual admission, so that participation is immediate.
25. As a teacher, I want an online participant count and named list, so that I know who is currently connected.
26. As a teacher, I want to remove a participant, so that I can manage disruptions without exposing control authority to learners.
27. As a teacher, I want Sentence and Paragraph options, so that I can choose the reading unit size.
28. As a teacher, I want an independent highlight toggle, so that either granularity can include or omit approved phrase emphasis.
29. As a teacher, I want configurable hold and erase durations, so that the reading pace fits my material.
30. As a teacher, I want both Hold then erase and Erase within window, so that I can choose between a full reading hold and a bounded total sequence.
31. As a teacher, I want a private dynamic setup preview showing Hold, Erase and Total, so that timing is understandable before presentation.
32. As a learner, I want a subtle reading cue and polished eraser/dissolve effect, so that animation supports rather than obstructs reading.
33. As a teacher, I want private unit navigation, so that selecting a sentence does not accidentally broadcast it.
34. As a teacher, I want Play and Replay to start explicit timed sequences, so that learners never restart playback themselves.
35. As a teacher, I want Pause and Resume to preserve phase progress, so that interruptions do not grant an unintended new sequence.
36. As a teacher, I want Show to keep text visible until Hide, so that I can explain a unit without a timer.
37. As a teacher, I want resource/mode/settings changes staged until Apply to room, so that live changes are deliberate.
38. As a learner, I want Apply to room to return me to blank waiting, so that a new resource does not appear before the teacher presents it.
39. As a learner, I want blank paper after erasing finishes, so that the teacher controls when the next unit appears.
40. As a learner joining late, I want the current phase and erase progress, so that I see what classmates see rather than a restarted countdown.
41. As a learner, I want reload and background-tab recovery to preserve classroom timing, so that navigation does not restart exposure.
42. As a learner, I want honest reconnecting and ended-room states, so that stale displays are not mistaken for live synchronization.
43. As a learner, I want no playback or reveal controls, so that reading follows the teacher's intended pace.
44. As a teacher, I want control commands authorized server-side, so that hiding buttons is not the only classroom protection.
45. As a learner, I want only the current unit delivered, so that the interface does not preload the teacher's entire article or future units.
46. As a mobile learner, I want text, highlights and effects to fit wrapped lines without overflow, so that the reading works on my device.
47. As a keyboard user, I want labelled controls and visible focus, so that I can use the teacher workflow without a mouse.
48. As a motion-sensitive user, I want a reduced-motion presentation preserving the selected timeline, so that effects are accessible without changing teacher timing.
49. As a teacher, I want explicit import, validation and AI errors with manual fallback, so that failures do not pretend to succeed.
50. As a project owner, I want verified two-device and approximately 20-learner classroom behavior, so that production claims are supported by evidence.
51. As a teacher, I want to switch between existing Minimal and additional Neobrutalism, so that I can choose the classroom appearance without replacing the existing theme.
52. As a learner, I want to inherit my room's teacher-selected theme on join/change/reconnect without resetting playback, so that visual preference does not change reading exposure.
53. As a mobile learner, I want a learner-only entry/reader showing necessary content/status without teacher navigation, private data or infrastructure chrome, so that my phone remains a focused reading surface.

## Implementation Decisions

### Current system and reuse

- A React 19, TypeScript, Vite and Tailwind prototype exists. App owns local room state and switches TeacherView/StudentView within one browser. TeacherView already has resource selection, Sentence/Paragraph, highlight toggle and basic playback controls; preserve useful UI boundaries, not incorrect behavior.
- RoomState currently models fixed/dynamic timing, hold/erase durations, a single effect and idle/reading/paused/ended. It defaults to 5-second hold and 3-second erase, not the confirmed defaults. Its timestamp is not an authoritative shared clock.
- TeacherView directly mutates live selection/settings. Resume sets a fresh start timestamp rather than preserving elapsed progress. StudentView receives the whole Article, highlights regex phrase strings, exposes article-wide annotations and loops an interval-based eraser. Idle/ended do not enforce absence of reading text.
- Sample categories are a fixed union; annotations lack versioned offsets and review status. Sample content contains Vietnamese meanings and unmatched phrase examples. Treat samples as migration inputs requiring review, not already approved database material.
- Firebase app/Auth/Firestore clients and Hosting configuration/build artifacts exist. Initialization is not evidence of implemented Google sign-in, database persistence, deployed rules or a functioning backend. No room transport, seed service, import API or tests were found. Deployment health has not been checked.
- No domain glossary or ADR set was found. Use Teacher, Learner, Resource, Resource Version, Reading Unit, Phrase Annotation, Room, Draft, Published, Play/Replay, Show/Hide and Apply to room consistently. Confirmed conversation and current PRD supersede historical architecture and original Stitch semantics.

### Modules and authority

- Retain teacher and learner view boundaries, extending them with authenticated Library/editor/review/setup/join flows. Separate private teacher preparation from authoritative live room state; learner routing must not offer a teacher/student role switch as authorization.
- Proposed server modules are resource publication, phrase detection/review, safe import, membership and room commands. React/TypeScript remains the frontend; a Node.js trusted API and Firebase Auth/Firestore are the proposed production architecture. Verify actual Firebase project, database edition, SDK and infrastructure before implementation writes.
- Google teacher identity is confirmed. The backend checks teacher ownership, not a client-supplied role. Learner link/name entry may use invisible anonymous technical identity, subject to implementation verification; names are not authenticated identities.
- Anyone with an active join link may enter. Approximately 20 participants is a validation target, not a hard cap. Participant presence needs reconnect/duplicate-tab-safe identities and heartbeat/expiry bookkeeping; list only currently online memberships and do not retain names indefinitely by accident.
- Learners cannot write control state or read another teacher's private resources. Admin SDK access requires explicit equivalent ownership checks because it bypasses Security Rules. Never deliver full resources to learners simply to render one unit.

### Room command and snapshot contracts

- Room commands carry identity, command ID/idempotency key and expected revision. Reject unauthorized requests and stale/conflicting revisions with actionable errors; retries cannot apply commands twice.
- Private Previous/Next or arbitrary unit selection does not change learner display until Play/Show. Resource, granularity, highlight or timing/effect edits require Apply to room first. Apply atomically installs the selected published version/configuration, increments revision and clears the display to waiting. It does not auto-play.
- Play/Replay starts a new timed turn. Pause stores elapsed phase time; Resume preserves it. Show creates manual-visible state with no automatic expiry; Hide clears either manual or timed display. End rejects subsequent joins/commands except authorized lifecycle handling.
- Authoritative snapshots include room ID, frozen resource version reference, revision, current unit text and approved spans only, granularity, highlight toggle, playback status, timing policy/durations, server start time, paused elapsed time and effect configuration. Participant summary is authorized independently of learner content delivery.
- Use coarse server transitions and realtime snapshots, not per-word/frame network updates. Estimate client/server clock offset. Derive phase locally from absolute time; do not depend on a scheduled expiry write or timer frame counts. Reconnect rejects stale revisions and retrieves current authority.
- Offline clients never restart a timed turn; received timelines still expire. Do not allow new reveals without current authority. Policy for stale manual Show needs an explicit fail-safe before production; unlike timed playback it has no intrinsic deadline.

### Themes and learner-only responsive surface

- Default Minimal preserves the existing token set. Add Neobrutalism as a scoped appearance variant: bold flat blocks/strong UI type/sparse hard shadows, light 1px borders. Keep neutral serif reading and exact phrase highlights. Both variants share components and behavior; DESIGN.md defines tokens.
- Teacher chooses an authoritative room theme, included in the narrow learner snapshot. Guest/learner cannot set it. Legacy room defaults to Minimal; validate IDs and owner-only updates server-side. Appearance update preserves playback timestamps/phase/elapsed/unit/approval, requires no Apply and never remounts the reader or recreates room authority. This is an explicit exception to staged reading-setting changes.
- Learner entry and reader are distinct from teacher surfaces. No Teacher/Learner role switch, teacher login/workbench/library/source/roster or Hosting/App/debug footer in learner DOM or snapshot. Permit only current approved unit, necessary connection/session status, optionally own name/authorized published title and a single room identifier.
- Phone-first at 320/375/390/414px: actual viewport/dynamic-height/safe-area handling, readable wrapped text and vertical scrolling for long paragraphs. Do not hide horizontal overflow to conceal a wide header. Resize/theme reflow recalculates geometry without restarting time.

### Timing and effects

- Default Hold then erase: full text until elapsed 3000ms; erase for the next 1000ms; blank at elapsed >=4000ms.
- Optional Erase within window: total 3000ms, erase duration 1000ms; full text until elapsed 2000ms; erase through 3000ms; blank at elapsed >=3000ms.
- Teacher edits duration values and sees effective Hold/Erase/Total. Require finite positive timings and erase duration no greater than total for within-window. Production min/max bounds remain an engineering release choice. Word-count/WPM automation is not a required MVP feature.
- Late joins match hold/erase/paused/manual-visible state and current erase-mask progress. A late join does not get a new three seconds. No automatic advance.
- Reading guide is a small moving cue, not eye tracking. Eraser follows rendered text lines; dissolve is an alternative. Guide and eraser should be independently configurable rather than forced into mutually exclusive behavior. Resize recalculates geometry, not elapsed time. Never use a translucent whole-column mask that leaves readable text indefinitely.
- Reduced motion substitutes static/progress-based presentation on the same selected timeline. Blank paper can have an unobtrusive waiting label outside the reading area. Animation must not obstruct controls or add undocumented timing.

### Resource lifecycle and logical storage

- Resource records are teacher-owned and include English title/text metadata, custom category, topic tags, estimated level, content type, provenance/attribution, rights basis, Draft/Published/Archived state and version references. Use explicit stable IDs rather than category union literals.
- Published versions are immutable. Library edits create a Draft version; active rooms retain their frozen published reference. Draft or pending-review material cannot bypass publication into a learner room.
- Phrase candidates are idioms, fixed expressions, phrasal verbs or collocations. Pipeline: deterministic matching, optional server-side AI, exact-span validation, overlap review and teacher approval. Detection failure preserves manual/deterministic workflows.
- Freeze canonical text before annotation. Store start-inclusive/end-exclusive UTF-16 offsets, exact substring, unit/version IDs, type, meaning, source and review status. AI proposes exact phrase and zero-based occurrence index; the server resolves offsets. Text edits invalidate dependent spans. Render slices, not unescaped regex or arbitrary HTML.
- The fixture “Long story short, we decided to give it a shot.” highlights only “Long story short” and “give it a shot”. Punctuation and remaining text stay normal. Only approved current-unit annotations reach learners; article-wide vocabulary drawers cannot leak hidden/future text.
- Agents write categorized Draft records directly through a trusted, explicitly authorized seed job. Candidates remain pending. Verify destination/teacher owner, dry-run, obtain target-write approval, then perform bounded idempotent writes and database readback. Never overwrite published versions or live room references.
- Seed deduplication uses teacher owner, normalized source identity and canonical content hash; changed content produces a new Draft version. Partial failures need safe retry and accurate insert/skip/error reporting. No bulk deletion is included.
- Public access is not permission to copy an article. Seed/import permitted material or original text, retaining rights/provenance. Teacher reviews before publication; do not bypass paywalls or use browser cookies.

### Import, visual design and rollout

- MVP supports paste, TXT and supported public HTTP(S) article URLs. URL fetching requires SSRF defenses at DNS/connection/each redirect, bounded timeout/size/content types and sanitized plain-text extraction. Unsupported sources fall back to paste.
- Apply supplied logo, red accent tokens, paper/ink colors, serif reading text and compact English controls. Existing forest/Vietnamese UI and outdated Stitch countdown scripts are references to replace, not requirements. No grading dashboards or lexical heatmaps.
- This is a completion of a local prototype, not a live-data migration. Preserve source, assets and useful evidence. Obsolete local Stitch design artifacts have been deleted at the user's request; their absence does not block implementation. Revalidate local sample content as Draft before any database import; backfill offsets only after canonicalization and teacher review.
- Deliver incrementally: server-backed explicitly labelled demo; secure Google identity/membership/realtime; persistent library/review/import and Draft seeding; load/accessibility/release verification. Demo authority paths must not remain reachable in production. Preview or live deployment requires separate approval.

## Testing Decisions

### Primary seam and review status

Prefer one primary public classroom-workflow seam: authenticated teacher commands plus learner snapshots/rendered views against the actual shared room service. Test visible behavior and authorized responses, not component internals, hook names, storage call counts or private reducer layouts. This is a proposed seam; the user has not separately reviewed the test-seam choice. Include it in spec review without reopening the confirmed product interview.

Reuse TeacherView/StudentView as UI entry boundaries; their current local props are not evidence of multi-device synchronization. No application test suite or analogous tests were found; build is TypeScript compilation plus Vite bundling, not behavioral verification. Add only focused subordinate seams where the high-level flow cannot efficiently prove deterministic clock/Unicode/security cases.

### Required coverage

- Classroom integration/E2E: teacher Google sign-in, published-resource selection, share link/name join, online count/list, timed playback, private selection, Apply reset, manual Show/Hide, End and denied learner control. Run independent browser contexts and two real devices, not merely view switching in one tab.
- Controlled-clock room tests: default hold at 2999ms, erase starts at 3000ms, blank at 4000ms; within-window hold at 1999ms, erase starts at 2000ms, blank at 3000ms. Manual Show remains beyond both deadlines until Hide. Invalid durations fail.
- Timeline recovery: late join during each phase, pause during hold/erase, resume without restart, replay as a new revision, refresh, background suspension, resize, offline expiry and stale reconnect. Assert phase and mask progress, not implementation frame counts.
- Command contracts: duplicates, conflicting revisions, concurrent Apply/Play and no auto-play after Apply. Learner cannot select or reveal content by directly invoking an API. Other teachers cannot access private resources or room control.
- Publication/seed integration: Draft excluded from learner presentation, seed cannot approve/publish candidates, idempotent retries, changed-content Draft versions, missing owner/category validation, partial retry/readback, and stable active room references after edits/seed.
- Phrase/rendering boundary: fixture exact spans; repeats; emoji/Unicode prefixes; punctuation/case; regex metacharacters; overlaps; invalid offsets; rejected/pending candidates; edited-text invalidation. No entire-sentence/paragraph background or future-annotation leakage.
- AI integration contract: malformed output, hallucinated phrases, unresolved occurrences, timeout and prompt injection fail validation without side effects or fabricated success. Deterministic/manual path remains usable.
- Import boundary: malformed TXT/input, inaccessible URLs, oversized responses, private IPv4/IPv6, localhost/metadata and redirect attacks. Render imported content as safe text; errors provide paste fallback.
- UI/accessibility: 320/375/414/768/1440 widths, long names/titles, multi-line geometry, keyboard focus and dialog behavior, contrast, English loading/error/waiting states, reduced motion and logo. Use screenshots as supporting evidence, not proof of functional sync.
- Themes/learner isolation: independent teacher/learner contexts switch Minimal/Neobrutalism, late join/reload/reconnect adopts room theme, invalid/guest/other-teacher appearance updates denied, elapsed/phase/unit unchanged. Assert absence of teacher controls/private fields in DOM AND actual learner responses at phone widths; verify geometry instead of accepting overflow clipping.
- Load: approximately 20 simulated learners plus real-device smoke tests. Measure actual synchronization error; <=250ms foreground mismatch under normal measured conditions is a proposed test goal, not a guarantee.
- Verification reporting: build/typecheck/behavioral tests, commands/results, screenshots, actual transport/sync measurements and unverified checks. Never report initialization, mock counts, Hosting artifacts or hidden buttons as proof of backend security.

### Gaps before production

Real Google OAuth/domain configuration, target database edition/rules, production network latency, retention policy and manual-Show offline fail-safe need owner-approved environment validation. Emulator/integration tests cannot prove production infrastructure or third-party availability. No tests or deployments are run by writing this spec.

## Out of Scope

- Automated tests of learners, grading, scores, pedagogical-effectiveness claims or full LMS functionality: this release is a teaching assistant.
- Video meetings, screen streaming, camera/eye tracking, learner self-paced replay/reveal, payments and DRM: not required for the confirmed classroom flow.
- PDF/DOCX, OCR and video transcription: deferred until text/TXT/public-URL workflows are reliable.
- Mandatory WPM automation, learner accounts, teacher admission queues and a hard 20-seat limit: not part of the accepted operating contract.
- Cross-teacher/global resource sharing: deferred pending a sharing and ownership model.
- Paywall bypass, unlicensed corpus scraping, destructive database cleanup, credential distribution or automatic production deployment: outside authorized scope.
- A simultaneous all-features AI Studio mega-prompt: implementation is staged with evidence gates.

## Further Notes

### Basis and decision record

Derived from the confirmed grilling conversation and [PRD](../../docs/PRD.md), [Design contract](../../DESIGN.md), [Draft seeding contract](../../docs/resource-seeding.md) and [handoff](../../docs/aistudio-handoff.md). No separate accepted proposal or ADR set exists; the user explicitly requested synthesis from already-confirmed context, not another interview. Product approval does not authorize provisioning or production writes.

Key trade-offs: teacher-controlled manual progression over auto-advance; separate Show/Hide over overloaded playback; two explicit timing policies over ambiguous “3 seconds”; Draft seed plus human publication over automatic trusted AI content; authoritative shared state over local demo state. Revisit these only through an explicit product change. Firebase deployment topology and database details remain provisional until verified.

### Updated visual implementation authorization

The user supplied a new design-system palette/typography/spacing contract and requested autonomous in-place UI improvement by Antigravity. Current DESIGN.md is the visual authority; Paper drafts remain unapproved references and obsolete local Stitch artifacts have been deleted at the user's request. Neither is a pixel-perfect acceptance target or implementation prerequisite. Implementation follows [Antigravity execution contract](../../docs/prompts/antigravity-redesign-and-backend.md), retaining the confirmed product behavior, Matt ticket/seam gates and separate infrastructure/deployment approval. This authorizes local edits after required planning gates, not a claim of completed UI or backend.

### Open engineering/release items

- Project owner must approve target Firebase project/database edition/location and deployment topology before cloud setup; initialized local config does not close this item.
- Owner must approve name/resource retention and deletion rules before production participation.
- Implementer must propose validated duration bounds and manual-Show offline policy; owner closes these through release review.
- Model availability, latency/cost limits and seed/import quotas require current documentation and measured evidence before enabling AI/agent writes.
- Test-seam proposal awaits review; it is not silently marked accepted.

### Tracker publication

Tracker configured as GitHub Issues for `genshai-11/chunks-reading`; see [tracker conventions](../../docs/agents/issue-tracker.md) and [triage mapping](../../docs/agents/triage-labels.md). Local Git has no remote; use an explicit repository argument. Intended label is `ready-for-agent`, with no additional triage. Remote access and label existence remain unverified. This file is a local spec draft awaiting publication, not a published issue; no issue ID or publication success is claimed.
