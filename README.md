<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9b3bd265-9c01-4ef9-a294-da82dc26872c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. For optional AI phrase suggestions, copy [.env.example](.env.example) to `.env` and set `GEMINI_API_KEY` locally. The server loads `.env` via `dotenv/config`; without a key, phrase detection uses the deterministic fallback. Keep credentials out of version control.
3. Run the app:
   `npm run dev`

## Project documentation

- [Agent guide](AGENTS.md): project guardrails and Matt workflow entry point.
- [Codebase baseline review](docs/reviews/codebase-baseline.md): observed behavior, contract gaps and verification limits.
- [Local issue tracker](docs/agents/issue-tracker.md): spec/ticket locations and readiness rules.
- [Domain docs](docs/agents/domain.md): glossary and architecture-decision conventions.
- [Security specification](security_spec.md): intended security invariants; see the baseline review for enforcement gaps.

Agent setup is complete. The product spec is pending agreement on test seams and unresolved product decisions.
