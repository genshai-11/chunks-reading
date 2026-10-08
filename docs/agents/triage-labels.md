# Triage labels

The owner selected the five default Matt roles. For the local tracker, write the role verbatim in the `Status:` line.

| Canonical role | Local status | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer must evaluate the request |
| `needs-info` | `needs-info` | Missing requirements or decisions block readiness |
| `ready-for-agent` | `ready-for-agent` | Owner-approved scope and checks support agent implementation |
| `ready-for-human` | `ready-for-human` | Requires human implementation or action |
| `wontfix` | `wontfix` | Maintainer has explicitly decided not to act |

Assign readiness from evidence, not from the presence of code or passing simulator tests. Record the missing decision when using `needs-info`, and the rationale when using `wontfix`.

Completion and wayfinding states are specified separately in [issue-tracker.md](issue-tracker.md).
