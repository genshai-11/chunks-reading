# Triage labels

Map canonical engineering-skill roles to the exact strings used in GitHub Issues for `genshai-11/chunks-reading`.

| Canonical role | Tracker label | Meaning |
| --- | --- | --- |
| needs-triage | needs-triage | Maintainer needs to evaluate the issue |
| needs-info | needs-info | Waiting for required information |
| ready-for-agent | ready-for-agent | Fully specified work ready for an agent |
| ready-for-human | ready-for-human | Requires human implementation |
| wontfix | wontfix | Will not be actioned |

When a skill references a role, use its mapped tracker label. The to-spec workflow applies ready-for-agent without additional triage. These mappings are confirmed; remote label existence has not been verified by this setup.

Edit the tracker-label column if the project's vocabulary changes. Preserve the canonical role column so consumers retain a stable mapping.
