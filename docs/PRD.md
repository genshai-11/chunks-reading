# Chunks reading — Product Requirements

Status: product decisions confirmed after grilling; remaining engineering choices explicitly marked. Existing React/Vite prototype built successfully in the historical audit; production Auth/backend/security/deployment remain unverified.
Audience: Antigravity / AI Studio Build Agent and implementing engineer.

## 1. Outcome and evidence

[Confirmed — user] Teacher-controlled English reading classes for approximately 20 learners per room. Both application UI and reading content are English. Teacher manages/imports articles and custom categories, shares a room, and controls learners' visible reading content.

[Confirmed — user] Highlight means exact expressions such as **“long story short”**, not the entire sentence or paragraph. The system must detect candidate expressions through data processing and/or AI. Default reading hold is **3 seconds**, configurable by teacher. Default Hold then erase keeps text fully visible for 3 seconds, then erases over 1 second. Optional Erase within window uses a total 3 seconds, with the final 1 second for erasing. These are different timing policies, not interchangeable deadlines.

[Confirmed — user] Teaching assistant for assigning and presenting reading, not testing/grading. Sentence/Paragraph granularity and phrase highlight on/off are independent. Compact book-like UI, CHUNKS red accent, attractive dynamic setup previews, moving reading guide and eraser effects; logo supplied at `C:/Users/gensh/Downloads/logo.png`.

[Proposed architecture] Complete the existing React/TypeScript/Vite web app in place, with a trusted Node.js API, Firebase Auth and Firestore. Antigravity is the local implementation path; AI Studio is optional through an imported-source audit and bounded checkpoints. DESIGN.md is visual authority; old Stitch artifacts were removed locally and are not implementation inputs. Preserve current deployment topology unless an explicit infrastructure decision changes it; Cloud Run is a possible server target, not a provisioned or mandatory default.

## 2. Confirmed operating contract

- Teacher signs in with Google through Firebase Authentication. Learner opens a room link and enters a display name; no account registration or manual admission. Anonymous technical identity is an implementation proposal, not visible registration.
- Anyone with the active link can join. Teacher sees online count and participant-name details. About 20 learners is a test target, not a hard admission cap.
- Teacher manually advances. After erasing, show a blank paper/waiting state until teacher action.
- Sentence/Paragraph and approved phrase highlight on/off are independent settings.
- Hold then erase defaults to holdMs=3000, eraseMs=1000. Erase within window defaults to totalMs=3000, eraseMs=1000 (2000ms hold). Teacher customizes timings, effect and guide with a dynamic private preview. Word-count/WPM automation is deferred engineering scope, not a mandatory MVP feature.
- Play/Replay runs the timed sequence. Show displays persistent text for explanation until Hide; this explicit manual state bypasses automatic timing.
- Resource/mode/settings changes remain in private preview until Apply to room, which stops the current turn and returns learners to blank waiting. Teacher then Play/Show.
- MVP import: pasted text, TXT and supported public article URLs; inaccessible URLs fall back to paste. PDF/DOCX/OCR/video transcription are later phases.
- Agent seeds categorized resources directly into the database as Draft. Teacher reviews content and phrase candidates before publication. See docs/resource-seeding.md for the logical data contract and future seed procedure.
- Initial content belongs to each teacher; no cross-teacher shared catalog without explicit permission.
- [Confirmed — latest user update] Keep existing **Minimal** as default; add **Neobrutalism**, bold flat blocks/hard shadows with light 1px borders. Teacher chooses room theme; both teacher and learners receive it. Appearance changes do not restart playback, clear the unit or require Apply; reading settings still do.
- [Confirmed — latest user update] Learner is phone-first and sees only necessary learner content/status. No teacher role switch, teacher sign-in/workbench/library/source/roster or infrastructure footer in learner entry/reader. Server snapshots and permissions must also prevent teacher/future-resource data leakage.

## 3. Roles and permissions

Teacher can CRUD own articles/categories, import content, review candidate phrases, create/end own rooms, view/remove learners, modify session settings and issue playback commands. Teacher cannot access another teacher's private content.

Learners can join an allowed room, read the current authorized unit and connection/session status. They cannot issue control commands or reveal expired text using app controls. Learners must not receive the teacher's entire article or future units just to display one unit. A timed UI rule is NOT DRM: authorized users can screenshot or inspect already delivered content.

All control commands must be authorized server-side. A client-provided role is not authority. Firestore rules must deny learner writes to room control state and unauthorized article reads. Admin SDK calls must enforce equivalent ownership/membership checks explicitly.

## 4. Teacher journey

1. Sign in with Google → Library. Filter by All articles, News, TED Talks, Inspiration or custom category.
2. Import → preview extracted article, title, source attribution and category; edit text.
3. Run phrase detection → review candidate spans → approve/reject/edit or add manual spans.
4. Publish reviewed version → create room → select resource, Sentence/Paragraph, highlight toggle, timing policy and effects.
5. Share link → view online count/name list → Play or Show a unit.
6. Pause/resume timed playback, previous/next, replay, Show/Hide or end room. Unit navigation is private until Play/Show; resource/mode/settings changes require Apply to room first.
7. After the erase phase, learners see blank paper/waiting. Teacher retains full article and private preview/control visibility.

Editing a library article must not mutate an active room's frozen article version. Apply to room atomically installs a published resource version/settings and clears the current learner display; it never auto-plays the next resource.

## 5. Learner journey and states

Open link → enter display name → join the current synchronized phase (waiting, hold, erasing, paused or manual Show) → blank/waiting → session ended. Late joins see the same phase as classmates, not a restarted sequence.

Visible states: Joining, Room not found, Waiting for teacher, Reading, Paused, Time's up, Reconnecting, Removed, Session ended. All UI copy is English.

Learner view is uncluttered: paper-like canvas, large readable English text, small room/progress/timing metadata. No learner Next, Pause, Replay or Reveal buttons.

Reading-guide is a visual cue moving across words/phrases; no camera/eye tracking. Eraser masks text without layout shifts. Reduced motion substitutes static/progress-based presentation while preserving the same policy-specific deadline. Keyboard/focus, screen-reader announcements and accessible alternative timing should be configurable by teacher; do not silently alter teacher-selected timing.

## 6. Visibility timing and room state

State machine: waiting → hold → erasing → expired/blank; timed playback ↔ paused; Show → manual-visible until Hide; any active state → ended. Next/Previous select privately; Play/Show issues the display command. Apply to room returns to waiting.

Hold then erase: holdMs=3000, eraseMs=1000; hold at 2999ms, erasing at 3000ms, no text at elapsed >=4000ms. Erase within window: totalMs=3000, eraseMs=1000; hold at 1999ms, erasing at 2000ms, no text at elapsed >=3000ms. Validate positive finite durations, eraseMs <= totalMs for within-window, and display the effective hold/erase/total durations. Proposed server maximums still need validation.

Guide/eraser traverse measured text lines without changing layout. Recompute geometry on resize while keeping absolute timeline progress. No frame events over the network.

Pause freezes phase/progress. Resume preserves elapsed time. Replay begins an explicit new sequence and increments revision. Late joins/reloads use the same current phase and erase-mask progress as classmates; after expiry they see no text. Manual Show remains visible until teacher Hide or another authoritative command. Hidden/background tabs recalculate on visibility change; do not rely on setTimeout frame counts. Clients estimate server clock offset using a time endpoint; absolute clock accuracy and synchronization tolerance must be tested, not assumed.

On disconnect, never reset/extend an existing deadline. If an already received window expires offline, hide text. Block transitions/reveals until an authorized current snapshot is available. Reconnect must reject stale revisions and never replay a missed unit automatically.

Suggested room snapshot: roomId, articleVersionId (reference only), revision, status, mode, contextGranularity, unitIndex, currentUnitText, currentUnitAnnotations, timingPolicy, holdMs, eraseMs, totalMs, startedAt, pausedElapsedMs, effects, highlightEnabled, participantCount. Use authoritative expiry computation server-side when serving a join/reconnect snapshot. Persist only coarse room transitions, not per-frame animation events. A Firestore reading snapshot may remain stored as reading past its deadline: all readers must derive expired from the deadline rather than trusting status alone.

Commands have commandId/idempotency key and expectedRevision; conflict returns 409 and refetches state. Membership and participant bookkeeping must tolerate duplicate joins/reconnects. Do not enforce a 20-seat limit just because the target class size is 20. Approximate class size 20 is the target for testing, not a proven capacity or an unchangeable product cap.

## 7. Exact phrase detection contract

Candidate types: idiom, fixed_expression, phrasal_verb, collocation. Prefer meaningful multiword expressions, not every adjacent pair of words. Teacher remains the final reviewer.

Pipeline: deterministic known-expression matcher → optional server-side Gemini candidate extraction → validate exact spans → deduplicate/resolve overlaps → teacher review → approved annotations stored with articleVersionId.

Canonical text is frozen before span detection. Use start-inclusive/end-exclusive UTF-16 string offsets, matching JavaScript slicing, and store the exact substring. Model output should use unitId + exact phrase + occurrence index (0-based) + type + meaning; server resolves offsets from text, avoiding unreliable model arithmetic. All occurrences are resolved distinctly; rejected/unresolved matches must not appear as highlights. Edits invalidate affected annotations and require rerun/review.

A validated approved annotation contains id, articleVersionId, unitId, start, end, exactText, type, meaning, source (dictionary/ai/manual), reviewStatus and detector/prompt version. Overlapping spans are shown as a review conflict, never merged into an entire sentence. Learners receive only approved spans for their current unit.

Required fixture: `Long story short, we decided to give it a shot.` Only `Long story short` and `give it a shot` should be candidates. Highlight ONLY those substring ranges; comma and the rest of the sentence remain normal. Repeated expressions and Unicode/emoji preceding a phrase must resolve without offset drift.

AI keys stay on server. Treat article content as untrusted data; no tools or side effects in detection. Use a configured available text model after current documentation verification, not an invented model ID. Optional detection timeout target 15s, at most one retry for transient errors; input max 20,000 UTF-16 code units per request, chunk by unit; explicit teacher initiation and caching per article version. These are engineering defaults to validate against cost/latency budgets. AI failure preserves deterministic/manual detection, never claims success with fabricated annotations.

## 8. Candidate seams and contracts (not existing implementation files)

Candidate frontend seams: LibraryPage, ImportEditorPage, PhraseReviewPanel, RoomSetupPage, TeacherLivePage, JoinRoomPage, StudentReaderPage, useRoomSnapshot, visibilityClock, PhraseText.

Candidate server seams: authMiddleware, articleService, phraseDetectionService, roomCommandService, membershipService, safeArticleImporter. Firestore collections: teachers, categories, articles, articleVersions, rooms and roomMembers. Exact file paths must be established by auditing the exported/generated project.

Candidate APIs: GET /api/time; POST /api/articles/import; POST /api/articles/:id/detect-phrases; POST /api/rooms; POST /api/rooms/:id/join; POST /api/rooms/:id/commands; GET /api/rooms/:id/snapshot. Validate payloads, membership/ownership, quotas, timeouts and output schemas. Return actionable validation/auth/conflict/timeout errors. Avoid logging article bodies, learner names, tokens or secret values unnecessarily.

URL import: HTTP(S) only; protect against SSRF at DNS, connection and each redirect boundary; block local/private/metadata targets, credentials-in-URL and unsupported protocols. Apply response-size, content-type and timeout limits. Do not bypass paywalls or accept browser cookies. Render extracted content as text/sanitized data, never arbitrary source HTML. Save attribution and source URL; teacher confirms rights.

## 9. Design system and screens

App design: editorial reading workspace, cream paper, ink text, CHUNKS red accent, warm phrase highlights. Reading text uses a serif such as Literata; navigation/tools use Inter. Do not copy the architecture explainer theme into the app automatically. Use `DESIGN.md` for tokens and UI rules.

Screen set: Teacher Library; Import/editor + phrase review; Room Setup; Teacher Live; separate learner Join/Waiting and Reader shells. Teacher Settings selects Minimal or Neobrutalism for the room; learners inherit the authoritative theme, including late join/reconnect. Desktop prioritizes teacher controls; learner is phone-first with necessary status only, no teacher navigation or host/debug footer. Use real sample English content marked as sample. Counts such as 20 learners are illustrative design states, not real people.

Use the actual repo asset assets/logo.png, uploaded/attached with source for external tools. No external tool can read a local Windows path. Use a verified served copy in the app; do not substitute a generated wordmark or leave a logo placeholder in the finished UI.

## 10. Acceptance and release gates

1. English labels/content on all screens; no generated Vietnamese UI strings.
2. Sentence/Paragraph plus independent highlight toggle; only approved exact spans get backgrounds.
3. Fake-clock tests cover both policies: default hold 2999/3000ms and blank at 4000ms; within-window hold 1999/2000ms and blank at 3000ms. Manual Show has no timed expiry; Hide clears it.
4. Late join matches current hold/erase/paused/manual phase and mask progress; refresh/offline/background never restarts a timed sequence. Apply to room clears text and waits.
5. Teacher pause/resume preserves exposure; replay starts an explicit new window; learner cannot replay.
6. Direct learner/other-teacher control requests and unauthorized article reads fail; rejection is not just a disabled UI button.
7. Known phrase fixture, repeated occurrence, overlaps, Unicode offsets, AI malformed/timeout/injection cases pass deterministic validation and human semantic review.
8. Two real devices and a 20-learner simulated room synchronize. Proposed foreground mismatch target <=250ms under measured normal network; this is a test goal, not a guarantee.
9. URL failures have pasted-text fallback; SSRF tests block localhost/private IPv4/IPv6, metadata and redirect attacks.
10. Responsive widths 320/375/414/768/1440, keyboard focus, contrast, reduced motion, long article/title and empty/error states pass or are explicitly reported unverified.
11. Build, typecheck, tests and runtime acceptance evidence pass before production. Secret scans do not expose keys. Deployment requires a separate explicit approval.
12. Both themes remain available. Teacher theme changes propagate to separate learner contexts without resetting elapsed/phase/unit or requiring Apply. Invalid IDs/unauthorized theme writes fail. Legacy/missing theme defaults to Minimal; learner DOM and snapshot exclude teacher-only information at 320/375/390/414 widths without hidden clipping. Browser -> real authorized room API -> actual data -> learner response is required; in-memory simulations or substring rules tests are not E2E/emulator evidence.

## 11. Non-goals and remaining choices

No video meeting, screen capture, eye tracking, learner self-paced reveal, automated grading, payment, paywall scraping or full LMS in MVP. No claim of pedagogical efficacy or copy protection.

Remaining engineering/release choices: Firebase project/database edition/location, anonymous technical identity, timing bounds, offline manual-Show fail-safe, data retention/deletion, model/cost budget and deployment. None is provisioned or authorized by this document. Product decisions above are confirmed; require explicit approval for cloud writes/billing/deployment.
