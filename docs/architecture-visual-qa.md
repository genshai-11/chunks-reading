# Architecture explainer QA

## Delivered

- `chunks-reading-architecture.html`: revised layer-based explainer.
- `architecture-visual.md`: editable draft; original `architecture-proposal.md` remains the detailed proposal.
- The previously shared cached HTML was also updated in place.
- Global Pi skill: `C:/Users/gensh/.pi/agent/skills/answer-me-with-html/SKILL.md`.
- Local extension: `scripts/am-agent.mjs`, `scripts/agent-skill-theme.mjs`, `scripts/layers-component.mjs`.
- Guidance: `references/agent-skill-theme.md`.
- Generated vendor `scripts/am.mjs` was not changed.

## Passed checks

- CLI render: 6 panels, 2 layer diagrams, 1 sequence, 2 timelines; zero writing warnings.
- Node test runner: 6/6 passed. Covers light/dark semantic contrast, disclosures, decorative SVGs, escaped input, empty/malformed input, extension render, and legacy CLI smoke tests.
- Browser at 1440×1000: no horizontal body overflow; architecture cards use two columns.
- Browser at 390×844: scrollWidth = 390px; architecture cards use one column.
- Browser at 720×500: no horizontal body overflow; toolbar does not overlap the page title.
- Focus first summary, press Space: disclosure opens, focus remains SUMMARY, outline is 3px.
- Mobile dark mode: black surface, light text, no body overflow; all layer SVGs marked aria-hidden.
- Browser error command returned no errors.

## Captures

- `architecture-desktop.png`
- `architecture-mobile.png`
- `architecture-mobile-dark.png`

## Remaining limitations

Image viewing is disabled in this session. Screenshots were captured, but visual judgement was based on DOM/layout checks rather than image inspection. Real touch hardware, a screen reader, physical 200% browser zoom, and OS reduced-motion behavior were not tested. Contrast tests cover defined semantic token pairs, not a full WCAG certification.

No product requirements were accepted implicitly. Architecture remains proposed; no Stitch, backend provisioning, application build or deployment was performed.

## Regenerate

```bash
node "C:/Users/gensh/.pi/agent/skills/answer-me-with-html/scripts/am-agent.mjs" render docs/architecture-visual.md -o docs/chunks-reading-architecture.html --no-open
node --test "C:/Users/gensh/.pi/agent/skills/answer-me-with-html/scripts/test-agent-theme.mjs"
```
