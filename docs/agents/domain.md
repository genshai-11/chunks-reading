# Domain docs

## Layout

Single-context repository: one root `CONTEXT.md` glossary and `docs/adr/` for architecture decision records. No per-package context map is needed for the current single-app repository.

## Before exploration or design

1. Read root `CONTEXT.md` when it exists.
2. Read existing ADRs in `docs/adr/` that touch the work.
3. If a future `CONTEXT-MAP.md` exists, follow its pointers and read the relevant context documents and context-scoped ADRs.

If these documents do not exist, proceed silently; setup defines their location but does not invent a glossary or decisions. Domain-modeling work can create them when terminology or architecture choices are actually resolved.

## Vocabulary and decisions

Use glossary terms consistently in issue titles, specs, tests and implementation discussions. When a needed concept is missing, check whether existing terms cover it before proposing a glossary addition.

Surface conflicts with an existing ADR explicitly, naming the record and why reopening it may be justified. Do not silently overwrite an accepted decision.

Product requirements and visual behavior are governed by `docs/PRD.md` and `DESIGN.md`; these do not imply that every proposed infrastructure detail is an accepted ADR. Distinguish confirmed product decisions, observed implementation and unverified engineering proposals.
