# Historical two-agent design review — retained conclusions

## Current status

The user replaced candidate-selection with the supplied DESIGN.md system and requested autonomous in-place UI improvement. Old local Stitch exports, screenshots, scripts/request records and its task brief have been deleted at the user's request. Remote projects were not deleted. No candidate is an approved pixel-perfect target; missing exports are not a blocker.

Implementation inputs are current source, [PRD](../PRD.md), [spec](../../specs/001-teacher-controlled-reading/spec.md) and [DESIGN.md](../../DESIGN.md). Use [Antigravity](../prompts/antigravity-redesign-and-backend.md) or optional [AI Studio handoff](../aistudio-handoff.md), not an obsolete design-port instruction.

## Historical outcomes

- Paper file: https://app.paper.design/file/01M4B47GZ9SNSN67J51WB6K0FR/p-1-0. Library, editor/review, Setup, Live and Join were authored; Reader/sign-in and JSX export remained incomplete when weekly quota stopped work. Four local screenshots remain; full appearance/accessibility/browser verification was not completed. Do not assume the historical quota-reset estimate still applies.
- Stitch project: https://stitch.withgoogle.com/projects/11316902573190440149. Worker settled without observed screens; a later read-only poll found five static screens (Setup; Reader Hold/Erasing/Blank/Manual Show). This changed the inventory, not the failed full-delivery outcome. Library/editor/Live/Join were unverified. Local exports/evidence files are no longer retained.
- Workers made no application/Firebase edits. Terminal releases returned retained/user_takeover; no forced closure or remote cleanup was performed. Historical coordination receipts remain in run.json.

## Defects to avoid in implementation

The following conclusions were recorded from the former static references; they are not a fresh re-inspection:
1. Fixed390px canvas plus body padding caused mobile overflow: use actual responsive viewport layout.
2. Learner technical proof labels, guide annotations, explanatory eraser callouts and unsupported training claims distracted from reading: remove them.
3. Vertical whole-column masks did not follow rendered lines, and illustrative progress/elapsed labels disagreed: derive phase/mask coherently from real timing and measured line geometry.
4. Tailwind CDN, repeated color literals, placeholder links, small controls and missing logo were not production-ready: use compiled styling, semantic tokens, actual logo, labels/focus and >=44px targets.
5. Mock Sync ready, identity/counts and static correct spans were not proof of Auth, realtime, presence or correct expiry. No real motion/reflow/contrast/focus/backend pass was established.

## Remaining gate

Review real improved UI and tested behavior, not candidate completion. Implement vertical slices with public test seams, independent Standards/Spec review where available and Done/Partial/Missing/Unverified coverage. Production identity/data/rules, manual-Show offline policy, retention/bounds and deployment remain separately verified/approved. No production writes or deployment are authorized by design cleanup.
