# CHUNKS classroom reading — continuation handoff

## Start here

Workspace (Windows; resolve the environment variable rather than assuming an account name):

`%USERPROFILE%/Desktop/CHUNKS/PROJECT/chunks-reading---teacher-controlled-classroom`

All repository paths below are relative to the repository root, not the `docs/` directory. Read `AGENTS.md` first and follow its domain/tracker/security references. Owner communicates in Vietnamese.

## Current state

Owner accepted the preview and explicitly approved this build for production and main push. Classroom source/tests/package changes are committed and pushed as `0d7246e90fd7da09d0cca6e93065481f41231669`. Production Hosting is live at https://chunks-reading-studio.web.app. GitHub CI passed, but automatic CD lacked its Firebase service-account secret; the authorized release was completed via existing Firebase CLI authentication. Future production releases still require explicit approval. Do not implement additional features merely because this is a handoff.

Preview: https://chunks-reading-studio--classroom-reading-controls-brghrnjo.web.app

The full feature history, implementation decisions, reproductions, test results, release identifiers and limits are already documented; use those artifacts rather than reconstructing or copying them:

| Artifact | Purpose |
| --- | --- |
| `.scratch/classroom-reading-controls/spec.md` | Owner-approved contract; navigation/review/pause and live-feedback sections supersede historical toolbar/inline-editor requirements. |
| `.scratch/classroom-reading-controls/navigation-review-verification.md` | **Latest** return-current, paragraph review, Pause/Resume, full→sentence fixes, complete teacher routing/history and 64-test preview verification. |
| `.scratch/classroom-reading-controls/live-feedback-verification.md` | Prior fixes, clock calibration mechanism, red/green evidence, private rehearsal, verification and remaining risks. |
| `.scratch/classroom-reading-controls/production-release.md` | Latest main commit, CI/CD outcome, manual Hosting live release and unauthenticated production smoke. |
| `.scratch/classroom-reading-controls/preview-release.md` | Preview deployment metadata and remote smoke results. |
| `.scratch/classroom-reading-controls/audio-review-verification.md` | Prior audio/manual-review and eraser stacking work; historical, not latest authority. |
| `.scratch/classroom-reading-controls/followup-verification.md` | Earlier toolbar, timing, private full-article preview and rendering regressions. |
| `.scratch/highlight-alignment/diagnosis.md` | Original highlight defects. Owner confirmed full-review matching fixed; avoid unnecessary changes to matching logic. |
| `docs/reviews/codebase-baseline.md` | Observed behavior and known gaps, **not** approved product requirements. |

Inspect the working-tree diff for implementation details. The tree contains accumulated changes from multiple iterations. Preserve unrelated `README.md`, modified baseline review and untracked files under `docs/reviews/`; do not attribute or commit the whole tree as this task.

## What the owner was last told

The accepted build now runs on the main production domain and implements all five requested UI/routing changes. Teacher endpoints are `/teacher/live`, `/teacher/library`, `/teacher/studio`; full review now marks paragraphs and Sentence exits full preview/broadcast; timed playback has Pause/Resume. Open the preview on **both teacher and learner**, refresh both, then Replay once. If the problem persists, supply the room code and the actual URLs open on each side. No particular real failing room or transport trace was supplied to this agent.

The latest user requests and their handling are recorded in the spec and latest verification artifact; do not reopen resolved UI placement decisions from earlier sections. Live highlight editing was retired; preparation editing in the library was intentionally retained.

## Recommended next work

1. Read the latest artifacts and independently review the uncommitted implementation for actionable defects, especially server-clock calibration/integration, applied-settings isolation on Show/full-review exit, routing/history lifecycles and private preview keyboard/timer cleanup.
2. Obtain owner preview feedback and a real room/URL pair before attributing any remaining divergence to a specific cause. A clock-skew reproduction is not proof of the cause in every unidentified room.
3. With appropriate access, validate the real authenticated clock read and teacher/learner synchronization. The current evidence does **not** establish live Firestore REST permissions, API restrictions/App Check/CORS or physical two-device latency behavior.
4. Reproduce confirmed new defects before editing, run relevant regressions and report verification tiers separately. Do not declare production ready solely from existing mock tests.

Full-diff independent review and real Firestore Emulator enforcement remain outstanding. Unattended GitHub CD is also blocked by missing Firebase authentication: existing continue-on-error masks the deploy failure; do not equate a green workflow with a live release. See the latest verification artifact for tooling blockers and all skipped checks. Do not treat rules-simulator checks as deployed enforcement evidence.

## Safety and execution context

- Keep staged teacher settings distinct from applied room state. Learners do not gain room-command authority. Private browsing/rehearsal must not publish future units or affect learner playback.
- This accepted build's production release was explicitly approved and completed. Future production releases, rules/backend deployment, destructive library resets and data deletion require **separate explicit approval**.
- Do not casually push/trigger `main`: its workflow intends live deployment. The authorized release pushed only classroom source/tests/package changes; unrelated documentation/audit changes remain local.
- Preview uses the existing Firebase backend. Signed-in user actions can affect real data. The agent performed no cloud room/resource writes; classroom browser tests used mocked services.
- Static Hosting does not execute the Express API.
- Owned fixture/browser processes were stopped. Saved PID files may be stale; never kill an old PID without checking ownership. Inspect `package.json` scripts and the documented fixture setup before restarting verification.
- Screenshots do not imply visual review; physical audio/native fullscreen and real-device checks remain bounded by the documented limits.
- Keep credentials, auth tokens and personal information out of logs, prompts, bundles and documentation.

## Suggested skills

Call the next agent runtime's **Skill tool** for the relevant skill:

- `review-agent`: initial independent, read-only defect review.
- `diagnosing-bugs`: red-capable feedback loop for reported or newly identified defects.
- `react-best-practices`: hook cleanup/dependencies, private keyboard context, accessibility and rendering review.
- `agent-browser` and `agent-browser-verify`: browser verification when restarting the fixture or testing a provided environment.
- `google-cloud-auth-verification` and `gcp`: before real cloud access; also follow repo Firestore security instructions.
- `accidental-data-loss-prevention`: if a proposed operation could delete data; explicit consent remains mandatory.

Skill files may be in the configured shared skill directories; resolve availability rather than assuming a particular runtime installation.

## Handoff transport note

The preceding attempt to launch a background agent with `claude --bg --name ...` failed because the Claude CLI could not be found in PATH or checked standard locations. **No background agent was launched.** The replacement handoff was initially saved in the OS temporary directory, then copied to `docs/classroom-reading-handoff.md` at the owner's explicit request.
