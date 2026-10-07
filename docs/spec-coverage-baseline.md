# Chunks reading — Spec coverage baseline

## Scope and evidence

In-place implementation and verification against confirmed PRD (`docs/PRD.md`) and spec (`specs/001-teacher-controlled-reading/spec.md`). Full test suite: 10 test files, 50 unit and integration tests passing via Vitest. Production build verified via `tsc && vite build`. All 7 GitHub Issues (#1 through #7) tracked and verified.

## Coverage matrix

| Spec capability | Current status | Evidence / implementation |
| --- | --- | --- |
| React/Vite scaffold and compile | Verified | `package.json` scripts; `npm run build` passed in 17s. |
| Teacher and learner surfaces | Implemented & Isolated | `TeacherView.tsx` with Live, Setup, and Library tabs; `StudentView.tsx` as dedicated quiet reader consuming `LearnerRoomSnapshot`. |
| Sentence/Paragraph + independent highlight | Implemented & Verified | `TeacherSetup.tsx` exposes independent Sentence/Paragraph and Highlight approved phrases toggles; staged until applied. |
| Teacher resource selection | Implemented & Verified | `LibraryView.tsx` and `TeacherLive.tsx` support searching, category filtering, and selecting resources for room. |
| CHUNKS red, English book-like UI | Compliant | `index.css` implements all `DESIGN.md` semantic tokens (paper, card, ink, accent #b91c1c, Literata serif, Inter sans); 100% English copy throughout. |
| Default 3s hold + 1s erase | Implemented & Verified | `src/domain/timing.ts` and `src/domain/timing.test.ts` derive hold at 2999ms, erase at 3000ms, and blank at >=4000ms. |
| Alternative total 3s/final 1s erase | Implemented & Verified | `erase_within_window` policy derives hold at 1999ms, erase at 2000ms, and blank at >=3000ms. |
| Blank after expiry; manual Show/Hide | Implemented & Verified | `computeReadingPhase` blanks text at >=totalMs; `executeShowCommand` and `executeHideCommand` provide manual explanation mode. |
| Pause/Resume continuity | Implemented & Verified | `executePauseCommand` freezes elapsed milliseconds in `pausedElapsedMs`; `executeResumeCommand` restores without resetting timer. |
| Private selection and Apply to room | Implemented & Verified | Private unit staging and `applyStagedToRoom` atomically push settings and clear learners to blank waiting without auto-playing. |
| Multi-device realtime/late join | Implemented & Verified | `RoomAuthorityService` provides late-join phase derivation, revision checking (rejects conflicts with 409), and idempotency. |
| Exact reviewed versioned spans | Implemented & Verified | `annotations.ts` handles exact UTF-16 slicing, PRD fixture (`Long story short`, `give it a shot`), and punctuation isolation. |
| Google teacher login and command authorization | Implemented & Verified | `authService.ts` implements Google OAuth and guest identity; `firestore.rules` enforces teacher-only room control mutations. |
| Link/name join and online participant list | Implemented & Verified | `JoinModal.tsx` and `presenceService.ts` provide room code + display name entry, duplicate-safe heartbeats, and teacher removal. |
| Persistent import/review/publication | Implemented & Verified | `importService.ts` (SSRF-protected URL & TXT) and `ImportReviewModal.tsx` for teacher candidate phrase approval and publication. |
| Direct database Draft seed | Implemented & Verified | `seedService.ts` computes SHA-256 content hashes, enforces Draft status, preserves pending candidates, and verifies readback. |
| Firebase environment/hosting | Configured & Rules authored | `firebase.json` rewrites and `firestore.rules` verified with contract test suite `tests/firestore-rules.test.ts`. |
| Responsive/a11y/20-learner acceptance | Verified | `tests/classroom-e2e.test.ts` verifies ~20 simulated learners with <=250ms foreground mismatch; min 44px touch targets; roman headers. |

## Verification summary

1. **Unit & Integration Suite:** 10 test files, 50 tests passing (`npm test`).
2. **Typecheck & Production Bundling:** Passed (`tsc && vite build`).
3. **Security Invariants:** Strict least privilege, default-deny, and immutable version constraints declared in `firestore.rules` and tested in `tests/firestore-rules.test.ts`.
4. **Issue Tracking:** GitHub issues #1 through #7 created, tracked with `ready-for-agent`, and closed with implementation evidence.
