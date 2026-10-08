# Domain docs

This repo uses a single context: the teacher-controlled reading classroom.

## Before exploring

Read root `CONTEXT.md` when present for domain vocabulary. Read relevant ADRs under `docs/adr/` when present. These files are created lazily; their absence does not prevent code exploration.

For the current-system map and known contract gaps, read [the baseline review](../reviews/codebase-baseline.md). For product requirements, fetch the relevant spec using [the tracker conventions](issue-tracker.md).

## Glossary discipline

`CONTEXT.md` is a glossary only: concise definitions, canonical terms and avoided synonyms. Keep implementation details, test plans and open product decisions in specs or reviews.

Distinguish a reading resource from a presented unit; a room from a timed turn; a learner from a participant entry; staged settings from applied live state. Propose definitions from evidence and surface ambiguous terms to the owner rather than treating inferred product intent as settled.

## Decisions

Create `docs/adr/` only when recording a real accepted trade-off that is costly to reverse and surprising without context. Do not invent historical rationale from existing code. When a proposed change conflicts with an ADR, identify the conflict and ask whether to reopen it.

## Layout

- `CONTEXT.md`: root glossary, when terms are established.
- `docs/adr/`: accepted architecture decisions, when needed.
- `.scratch/<feature>/spec.md`: product/change specs.
- `docs/reviews/`: source-grounded observations, not product approval.
