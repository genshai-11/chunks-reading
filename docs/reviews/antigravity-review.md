# Antigravity working-tree audit — NOT accepted end-to-end

## Scope and limits

Reviewed current local codebase, including untracked service/components/tests, against PRD/spec and the pre-existing Minimal visual contract. The latest user additionally confirmed optional Neobrutalism synchronized to learners and phone-first learner-only surfaces; these are NEW requirements, not retroactive faults in the previous theme implementation.

HEAD is `58356e4d702b09d896f665b0992eb7bf1f33f5d4`; no later implementation commits exist. `git diff 58356e4...HEAD` is empty, while working tree contains changes. Fixed-point confirmation was requested; this is a current-code audit, not a finalized attributed commit-diff review. No independent parallel reviewers were available through discovered subagent tools; the two axes below are one agent's separate passes, not independent review. Baseline source docs already had unrelated modifications; no source/rules/config/package changes were made by this review.

Skills read: code-review, agent-browser/agent-browser-verify, Firebase Auth + relevant Web/rules references, Firestore and firebase-security-rules-auditor; Hallmark design-system variant guidance. Current database ID/edition, deployed rules and real Auth domains/providers remain unknown. No cloud writes/provider sign-in/deployment were performed.

## Executed verification

| Check | Actual result | Meaning |
|---|---|---|
| `npm test` | 10 files / 50 tests passed | Unit/in-memory simulations and string rules assertions pass; not browser/API/data E2E. |
| `npm run build` | TypeScript + Vite passed | Bundle warning: JS580.83kB, gzip153.43kB, >500kB threshold. Compilation is not classroom/security acceptance. |
| Browser initial page | Loads; logo `/logo.png` loaded; no Vite overlay/runtime error reported in exercised flow | Meaningful controls render. No Google/anonymous login was attempted against production. |
| Private Next | Click Next Unit; still Unit1 of3, Previous disabled | Staging does not reach authority/hook. |
| Setup granularity | Click Paragraph by Paragraph; Apply still disabled, banner says synchronized | Staging setter loses the new object. |
| Pause/Resume | Play ->1200ms ->Pause ->Resume; displayed elapsed1.2s ->0.1s | Actual component wiring resets timer despite pure Resume function passing tests. |
| Learner phone | 390x844 and320x740; body scrollWidth520 in both, root width390/320 | Global overflow clip conceals the wide teacher header; not actual accessible reflow. |
| Learner chrome | Teacher/Learner/Join-Sign-In buttons, Hosting/App footer present | Learner can click Teacher and reach private workbench/source. |
| Separate contexts | ContextA manual Show fixture; fresh contextB learner waits blank in same room code | No shared authority/transport or room join. |
| Endpoint probes | GET `/api/time`:200 text/html; POST `/api/rooms/room-demo/join`:404; POST `/api/rooms/room-demo/commands`:404 | GET is Vite SPA fallback, not a working JSON time API. No proposed room handlers were found. |
| Rule test infrastructure | `npm ls @firebase/rules-unit-testing @playwright/test --depth=0`:empty | Existing rules tests are substring checks, not emulator permission tests. Browser verification used cached agent-browser. |
| Themes | No current theme selector/state/snapshot token variant | New dual-theme requirement is pending implementation. |

Screenshots retained: antigravity-baseline-desktop.png, antigravity-learner-390.png, antigravity-learner-320.png, antigravity-second-context.png. Image reading was disabled; visual aesthetics/contrast were not assessed from these images. DOM/viewport measurements and interactions above were observed directly. Current-dev API probes say nothing about unknown deployed infrastructure.

## Standards — 4 actionable findings

1. **[P1] Verification labels overclaim their seam.** `tests/classroom-e2e.test.ts:1-136` instantiates one RoomAuthorityService and loops function calls; no devices, browser, network or data. `tests/firestore-rules.test.ts:1-45` asserts text substrings, so permissive rules still pass. `docs/spec-coverage-baseline.md:5-35` claims realtime/secure rules/persistence/readback and GitHub issue verification without this proof. Repo contract: actual browser/API/data evidence and Done/Partial/Missing/Unverified. Preserve the agent claim as history and correct the ledger; add real tests at the public seam.
2. **[P1] Misnamed seed interface returns invented database proof.** `src/services/seedService.ts:48-106` only constructs arrays; `readbackVerified` is an `every` predicate over those arrays. No database writer/reader, target/owner verification or retry/readback boundary exists. Do not expose this as executeDirectDatabaseSeed or database verification. Implement the trusted approved job or label it candidate preparation without verified database status.
3. **[P2] Competing command pathways disconnect tested domain from real UI.** `TeacherView.tsx:50-87` calls pure command transforms, App.tsx:72-81 discards most resulting fields and maps any reading transition to PLAY, and useRoomSession duplicates authority handling. Possible duplicated/divergent command orchestration, not merely stylistic preference: replace with one typed intent path to the actual authority. Tests should exercise that path through user actions.
4. **[P2] Teacher private source isn't keyboard-equivalent.** `TeacherLive.tsx:270-284` clickable div unit rows cannot focus/activate via keyboard; unlabeled setup toggle buttons and spinbuttons were observed in accessibility snapshot. Add native controls/associated labels and keyboard regression coverage, not only `.touch-target` CSS. Global overflow clip must not hide reachable controls.

Standards worst issue: false acceptance/readback evidence. Heuristic smell is labelled separately; no tooling-enforced type/style trivia reported.

## Spec — 9 existing behavior defects / gaps

1. **[P1] No authoritative shared classroom or reviewed API surface.** `useRoomSession.ts:10-40` instantiates the class in each browser. `roomService.ts:82-101` accepts commands without an actor/token/ownership check and uses caller issuedAt. The hook has no server request or snapshot subscription. Both contexts diverge; API probes above fail. Violates stories22/40/44/50 and room authority contracts. Implement a trusted backend/current snapshot transport with verified identity/ownership, server time, revision/idempotency; role switching is not authentication.
2. **[P1] Learner can access teacher UI and bundled resources; room input ignored.** `Navbar.tsx:48-76` always exposes Teacher; `App.tsx:49,85-88,102-127` doesn't gate the workbench and ignores roomCode while signing in anonymously. App imports all SAMPLE_ARTICLES in every client and supplies teacher private selected title. Violates stories23/43/44/45. Use separate learner entry/shell, join active room through authority, split teacher-only bundles/data and return narrow current-unit response. Removing buttons alone is not sufficient.
3. **[P1] Staged edits are lost; Apply cannot apply.** `RoomAuthorityService.getRoomState():78-80` returns an outer copy; hook:28 and49-51 assign staged on that copy, never service state. `App.tsx:72-81` never dispatches APPLY_STAGED from TeacherView's Apply output. Browser Next/Paragraph reproduce no changes. Violates stories27/28/33/37/38. Add explicit staging setter/private model and typed Apply intent; test UI ->authority ->learner clear/wait.
4. **[P1] Resume and Replay are wired incorrectly.** `TeacherView.tsx:74-76` creates a valid Resume result; App.tsx:77 turns it into PLAY, discarding preserved elapsed. If status already reading, the same status condition also ignores explicit Play/Replay. Browser1.2s ->0.1s confirms Resume. Violates stories34/35. Dispatch RESUME/REPLAY explicitly; don't infer commands from partial status equality.
5. **[P1 if deployed] Local rules permit public/private and participant bypasses.** `firestore.rules:46-64` makes published resource plus all its versions publicly readable; rooms:81 reads any non-ended room with no membership; members:102,105-109 allows public roster read and unauthenticated create/update of any member ID with only name/bool checks. Anonymous identities can create teacher-owned resources/rooms because teacher provider/role isn't validated. This conflicts with teacher isolation, narrow current-unit delivery and member authority (stories2/26/44/45). Rule deployment/exploit against real data not checked. Add genuine allow/deny emulator tests, protected teacher data versus learner projection, authenticated active membership, owner UID and immutable/hasOnly/type/size validation.
6. **[P1] URL import falsely succeeds and persistence/publication absent.** `ImportReviewModal.tsx:45-59` returns fixed invented text for any validated URL, no fetch; App.tsx:95-98 stores articles only in useState. Article lacks status/immutable version; Save Draft vs Publish isn't durably represented. Service never refreshes its captured article array after adding resources. Violates stories10/11/13/17/21/49. Implement safe server import or explicit unavailable+paste fallback; actual Draft/Published/versioned storage and readback required.
7. **[P2] Imported phrase offsets lose their unit coordinate system.** `ImportReviewModal.tsx:86-94` attaches global text offsets to sentence/paragraph text by includes, without projecting/revalidating offsets or occurrence IDs. Approving an expression in sentence2 can then lose its highlight; repeated expressions produce invalid/conflicting candidates. Violates stories15/16 and UTF-16 contract. Freeze canonical version, map each approved occurrence to unit-local offsets, invalidate on edit, test multi-sentence/repeated/Unicode cases through actual import/review/render flow.
8. **[P2] Guide/eraser and phone surface violate acceptance.** `StudentView.tsx:96-109` and TeacherLive:320-329 use whole-column percentage masks, while `.reading-guide` is a stationary underline. No measured line traversal; reduced-motion behavior absent in current CSS. Phone teacher header/footer remains and body520px is clipped. Violates stories32/46/48. Use actual phone learner shell and shared measured-line renderer; verify deadlines/reflow, not static screenshots.
9. **[P2] Timing constraints are clamped/not rejected.** `timing.ts:24-41` accepts zero, negative, non-finite or erase>total via Math.max/min rather than validating finite positive policy inputs. Room commands don't validate payloads. Violates story29/30 and PRD duration validation; infinite hold can avoid expiry. Enforce at teacher form and trusted boundary; invalid command must fail without mutating room.

Spec worst issue: no shared authorized classroom, plus local rules unsafe if deployed. New dual-theme requirements are tracked separately, not counted as previous agent defects.

## Endpoint inventory — observed, not imagined

No route handlers/Node server/Functions package or room/resource HTTP fetch/subscription were found. Proposed contract routes below remain implementation requirements, not available endpoints:
- GET `/api/time`; POST `/api/rooms`; POST `/api/rooms/:id/join`.
- POST `/api/rooms/:id/commands`; GET `/api/rooms/:id/snapshot`.
- Resource create/import/review/publish/detection routes matching the approved design.
- An owner-only theme update intent (or endpoint) projecting theme into learner snapshots without changing the reading timeline.

Firebase Web Auth wrappers exist. They don't authorize RoomAuthorityService or establish Firestore persistence/realtime. Static Hosting wildcard rewrite also cannot implement a JSON API. New server route names must be agreed with the actual topology; no automatic Cloud Run/Functions provisioning is authorized.

## Verdict / next checkpoint

**Build/unit tests pass; classroom E2E fails; production authorization/persistence/rules/realtime are not accepted.** No production deploy recommendation. GitHub issues1–7 status/closure wasn't independently fetched and is unverified.

Preserve Minimal and the user-approved dual-theme/learner contract; implement the corrective prompt at `../prompts/antigravity-review-fixes.md` in approved vertical slices. First correct report claims and command wiring; then trusted identity/join/snapshot, learner-only phone shell + synchronized themes, followed by real persistent resource/review/seed/import. No source edits were made here; theme contract is recorded, switching itself still missing.

Counts: Standards4, Spec9 existing findings. Independent review, production provider/rules validation, real-device latency/20 concurrent browser clients and visual contrast review remain outstanding.
