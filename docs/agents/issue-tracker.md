# Issue tracker: Local Markdown

The owner selected local Markdown for this repo. Specs and tickets live under `.scratch/`; publishing means writing a local file, not creating a remote issue.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Spec: `.scratch/<feature-slug>/spec.md`.
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, one file per ticket, numbered from `01` after inspecting existing files.
- Each spec/ticket carries a `Status:` line near the top. Read [triage-labels.md](triage-labels.md) for the five triage roles.
- Record dependencies as `Blocked by:` followed by ticket numbers or explicit paths. An empty list means no dependencies.
- Append discussion under `## Comments`; retain previous decisions and unresolved questions.
- Fetch work by reading the referenced local path. Do not assume an issue number refers to GitHub.

## Spec readiness

Separate observed behavior, approved requirements and open questions. A retrospective baseline with unresolved requirements stays `needs-info`; a spec is `ready-for-agent` only after owner approval and agreement on test seams.

Use the Matt `to-spec` sections: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes. Keep source-path evidence in the baseline review rather than hardcoding file paths into implementation decisions.

## Completion and dependency tracking

Triage status describes readiness, not completion. Implementation tickets also carry `Progress: open | claimed | completed`. A dependent implementation ticket is unblocked only when every blocking ticket has `Progress: completed` and recorded verification. This completion field is a local convention, not an extra Matt triage label.

## Wayfinding

For decision exploration, use `.scratch/<effort>/map.md` and one child file per ticket in `issues/`. Child tickets carry `Type: research | prototype | grilling | task` and `Status: open | claimed | resolved`; these are wayfinding lifecycle states, separate from triage readiness.

Claim before starting; append the result under `## Answer` before setting `resolved`. Add an answer summary and relative link to the map. A wayfinding ticket is unblocked when all its blocking decision tickets are resolved; choose the lowest-numbered open, unblocked, unclaimed ticket.
