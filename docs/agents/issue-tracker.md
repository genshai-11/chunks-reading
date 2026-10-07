# Issue tracker: GitHub

Issues and specs live in https://github.com/genshai-11/chunks-reading/issues. Use the `gh` CLI with explicit `--repo genshai-11/chunks-reading`; local Git currently has no remote, so repository inference is not reliable.

## Conventions

- Authenticate/check access with `gh auth status` and a read-only repository query before writes. Report missing access rather than fabricate publication.
- Create: `gh issue create --repo genshai-11/chunks-reading --title "..." --body-file <markdown-file> --label <label>`.
- Read including labels: `gh issue view <number> --repo genshai-11/chunks-reading --json number,title,body,labels,comments,url,state`.
- List: `gh issue list --repo genshai-11/chunks-reading --state open --json number,title,body,labels,url`, with appropriate `--label`/`--state` filters.
- Comment: `gh issue comment <number> --repo genshai-11/chunks-reading --body-file <markdown-file>`.
- Label: `gh issue edit <number> --repo genshai-11/chunks-reading --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> --repo genshai-11/chunks-reading --comment "..."`.

When a skill says publish to the issue tracker, create a GitHub issue. Before creation, search for an existing issue for the same scope and update it when appropriate instead of duplicating it. Fetch relevant tickets with the read command above.

Use `docs/agents/triage-labels.md` for role-to-label mapping. Verify labels exist before publishing; if creation is authorized and a required label is missing, create that exact mapped label. A complete spec requested through to-spec uses `ready-for-agent` without additional triage.

After a write, read back the issue and report its URL and actual labels. Keep the local spec's publication status/issue URL accurate. A local spec file is not a published issue. Tracker setup alone does not push code, create remote labels or publish an issue.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set to yes only if the project explicitly chooses to treat external PRs as feature requests.

GitHub issues and PRs share a number space; resolve the object type before handling an ambiguous reference. This setup does not enable automatic PR triage.
