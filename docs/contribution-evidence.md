# Contribution evidence and repository process

IssueSprint separates suitability from existing-work evidence and repository instructions. A label, an open issue, and a missing assignee never prove that work is available.

## Discover first, inspect before investing

`list_issues` includes unlabeled and assigned issues by default. The optional `beginner_only` and `unassigned_only` filters default to false. Skill matches and tentative scope estimates are explainable heuristics, not verified difficulty assessments. Help wanted means help is invited; it does not establish beginner suitability.

Every discovery card says **Availability unchecked**. `get_contribution_context` checks the issue timeline, referenced PRs, review decisions, discussion claims, and repository guidance. It returns source links, inspection time, coverage limits, and a proposed next action.

| Observed evidence | Suggested next action |
| --- | --- |
| Open PR references the issue | Inspect its scope and feedback; consider helping the existing PR |
| Assignee or possible discussion claim | Coordinate with the contributor according to repository practice |
| Closed or merged referenced PR | Read its outcome before proposing another implementation |
| No competing work observed and direct PR guidance found | Follow the documented process, with limited confidence |
| Missing activity, partial scans, incomplete or conflicting guidance | Investigate the uncertainty before investing |
| Closed issue | Choose another issue unless maintainers request further work |

These are suggestions, not permission or reservations. No inactivity threshold declares a PR abandoned. A change-request review is not proof that a PR is useless. The server does not judge AI authorship, implementation correctness, CI, or code diffs.

## Repository-specific guidance

The service checks README, CONTRIBUTING, common PR templates, and issue template/configuration locations. It also tries the community profile's contribution-file location and public owner-level `.github` defaults when applicable.

English keyword heuristics extract quoted signals about assignment, direct PRs, and discussion. Conditional wording and contradictory signals remain visible. This is not a complete interpretation of repository policy. Missing phrases do not establish that an action is permitted or forbidden. Follow the linked source documents and maintainer clarification when needed.

Links to additional contributor guides are exposed for manual inspection; arbitrary external guides are not automatically fetched. Large or truncated documents and request failures reduce coverage. Repositories using different languages or conventions remain supported for discovery, but automatic policy assessment may remain unclear.

## Evidence limits

Each inspection scans at most 200 timeline entries and details for three referenced PRs, with at most 200 reviews per PR. Latest decisive review states are considered per reviewer; a later comment alone does not erase a change request. Truncated scans and failed requests are reported. Public cross-repository references are checked; inaccessible or private references cannot establish availability.

Explicit PR links and timeline references can be incidental. An observed closing reference is distinguished from a general reference, and neither proves the PR solves the issue. Unlinked, private, newly started, and off-platform work can be missed. Discussion claims are possible claims, not ownership. Coverage marked inspected means the bounded requests completed; it does not mean all activity everywhere is known.

## Saving the appropriate plan

`save_work_plan` refreshes context before saving. Its default strategy follows the fresh recommendation: implementation, review of existing work, or coordination. A review plan requires an observed open PR. An explicit implementation strategy against the recommendation requires a scope/coordination explanation. That explanation is recorded as user-supplied, unverified information, not maintainer approval.

Saved Markdown records the evidence timestamp, recommendation, references, quoted guidance, chosen strategy, and limits. It does not comment, assign, open PRs, or modify GitHub.

## Offline scenarios

Use repository `issuesprint-demo/demo-repo`:

- Issue 101: labeled documentation work.
- Issue 102: open PR with change-request feedback.
- Issue 103: possible discussion claim.
- Issue 104: broad work with a closed, unmerged PR.
- Issue 105: assigned documentation work.
- Issue 106: unlabeled, localized documentation change with direct-PR guidance.

The browser previews at `/?preview=pr`, `/?preview=unlabeled`, and `/?preview=claim` are fictional, read-only examples. Connected MCP tool calls perform the real workflow.
