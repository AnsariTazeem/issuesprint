# IssueSprint

**Choose a contribution you can actually start.**

IssueSprint reimagines GitHub issue discovery as an MCP workflow: combine a developer's skills and time budget with open issues and repository contribution instructions, then save an approved work plan.

## The problem

Finding an approachable issue often means switching between issue lists, labels, assignees, README files, and contribution guidelines. A label alone does not establish skill fit, scope, availability, or permission. Existing PRs, contributor discussion, and repository-specific processes matter too.

## The workflow

1. **Discover:** `list_issues` lists open issues, excludes pull requests, includes unlabeled and assigned candidates by default, offers optional filters, and explains content/keyword signals. Discovery does not establish availability.
2. **Inspect:** `get_contribution_context` reads the selected issue, referenced PR/review activity, discussion claims, README, contribution instructions, and templates. It returns evidence, coverage limits, and a suggested contribution strategy.
3. **Plan:** after user approval, `save_work_plan` refreshes contribution context, chooses implementation, existing-PR review, or coordination, writes an immutable Markdown plan, and returns its complete contents.

The AI lives in the MCP client, not in this server. A client discovers the tool schemas and coordinates the workflow. Each tool also works through NitroStudio's manual executor without model tokens.

**Status:** locally implemented and testable. A hosted URL and demo video must be supplied separately; neither is claimed here.

## Tools

| Tool | Main inputs | Output |
| --- | --- | --- |
| `list_issues` | `owner`, `repo`, optional `skills`, `available_minutes`, `limit`, `beginner_only`, `unassigned_only` | Ranked issues, reasons, estimates, source and scan limits |
| `get_contribution_context` | `owner`, `repo`, `issue_number` | Issue body and bounded excerpts of repository documents |
| `save_work_plan` | Issue reference, time budget, summary, steps, acceptance checks | Saved filename, complete Markdown, storage notice |

A `plan_contribution` prompt guides the sequence. The `issuesprint://workflow` resource describes tool order, constraints, and demo parameters.

## Stack

TypeScript, Node.js, NitroStack, Zod, React/Next.js widgets, NitroStudio, and GitHub REST API. NitroCloud is the intended deployment platform.

## Local setup

Use Node.js 22 and npm 9 or later. The project was developed in WSL Ubuntu.

```bash
npm ci
npm --prefix src/widgets ci
cp .env.example .env
npm run build
```

Public GitHub reads work without a token, subject to GitHub rate limits. An optional `GITHUB_TOKEN` increases the available API allowance. Store it only in the local environment or deployment secret settings.

Do not overwrite an existing `.env` when repeating setup.

### Connect NitroStudio on Windows to WSL

Add **Other Project > STDIO** with this command (adjust user and Node version for your machine):

```text
wsl.exe --cd /home/dell/Projects/NitroStack-Hackathon/issuesprint --exec /home/dell/.nvm/versions/node/v22.22.3/bin/node dist/index.js
```

Environment: `NODE_ENV=development`, `MCP_TRANSPORT_TYPE=stdio`. The application defaults to the documented `legacy` protocol mode for NitroStudio and standard MCP SDK v1 compatibility. If you set `NITRO_MCP_PROTOCOL_VERSION` explicitly, use `legacy`; an old `auto` value overrides the application default.

After a server change, rebuild and restart/reconnect the Studio server process. Widget changes also need the root `npm run build` to create self-contained HTML for Studio.

### Browser preview

```bash
npm run dev
```

Open [localhost:3001](http://localhost:3001). The homepage shows **clearly labeled fictional sample data**. Open `/issue-results?preview=1` for the same sample widget. Browser previews cannot call tools without a connected MCP host. The Studio widget uses real tool results and exposes context and plan-saving actions.

`npm run dev` serves pages for editing; `npm run build` bundles Studio-compatible widget HTML and compiles the MCP server. The widget web server is separate from the STDIO MCP process.

## Repeatable offline demo

No GitHub token, network requests, or AI calls are needed for manual tool execution.

**1. Find an issue**

```json
{
  "owner": "issuesprint-demo",
  "repo": "demo-repo",
  "skills": ["TypeScript", "documentation"],
  "available_minutes": 90,
  "limit": 3
}
```

Run `list_issues`. Issue **101** should rank first. Fixture URLs are illustrative; this is not a real GitHub repository.

**2. Inspect context**

```json
{
  "owner": "issuesprint-demo",
  "repo": "demo-repo",
  "issue_number": 101
}
```

Run `get_contribution_context`, or click **Read contribution context** on the issue card.

**3. Review and save**

```json
{
  "owner": "issuesprint-demo",
  "repo": "demo-repo",
  "issue_number": 101,
  "available_minutes": 90,
  "summary": "Add a concise TypeScript contributor setup guide grounded in the README.",
  "steps": [
    "Read the issue acceptance criteria and contribution instructions.",
    "Document dependency installation, type checking, tests, and build commands from the README.",
    "Verify the documented commands and review the diff."
  ],
  "acceptance_checks": [
    "A new contributor can follow the setup instructions.",
    "The documented checks pass when the contributor runs them."
  ]
}
```

Run `save_work_plan` after reviewing the proposed plan. It does not execute these steps or claim the checks have passed.

For AI Chat, try: "I know TypeScript and documentation and have 90 minutes. Find a suitable issue in issuesprint-demo/demo-repo. Read its contribution context and propose a plan. Ask before saving."

## Real GitHub usage

Use an actual public repository instead of the demo pair. Only the exact demo owner/repository selects fixtures. There is no silent fallback from failed live requests to demo data.

Both `beginner_only` and `unassigned_only` default to `false`. Set them to `true` only when you explicitly want labeled-only or unassigned-only discovery. A help-wanted label is not proof that work is beginner friendly, and an assignee is not a universal reservation rule.

Issue cards show **Availability unchecked**. Run contribution context before investing time. The context may recommend implementation under the documented process, inspection/help for an existing PR, coordination, reading previous PR outcomes, or further investigation. These are limited-evidence recommendations, never a guarantee that nobody else is working.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run smoke
npm run smoke:http
```

Service tests cover input validation, inclusive ranking/filtering, pagination, upstream errors, missing documents, policy conditions/conflicts, PR and review evidence, discussion claims, incomplete coverage, and evidence-aware plan persistence. The smoke test launches a separate MCP server and exercises discovery, the full offline tool chain, error responses, widgets, resources, and prompts. The smoke tests use the application default protocol configuration, without a test-only protocol override. Tests use temporary plan directories and remove their own test files.

The test runner uses `--test-force-exit` because the installed SDK creates a referenced cleanup interval on import. The smoke test explicitly closes its child transport. A separate HTTP smoke test verifies production transport startup and a real MCP request over localhost.

## Storage and configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `GITHUB_TOKEN` | empty | Optional server-side credential for public GitHub reads |
| `ISSUESPRINT_PLAN_DIR` | `./data/plans` | Dedicated server-side plan directory |
| `ISSUESPRINT_ALLOW_SAVE` | `true` | Set to `false` to disable filesystem writes |
| `NITRO_MCP_PROTOCOL_VERSION` | application: `legacy` | Documented compatibility mode; environment overrides the app setting |
| `MCP_TRANSPORT_TYPE` | framework default | `stdio`, `http`, or `dual` |
| `PORT` | framework default | HTTP listener port |
| `HOST` | framework default | HTTP interface; use `0.0.0.0` for hosting |

Plan files use generated UUID filenames, are never overwritten, and are excluded from Git. Storage is capped at 200 plans, with plan writes limited to 10 per minute per process. Saved plans are **on the server**, not automatically downloaded to the client. Hosted filesystems may be ephemeral; retain the returned Markdown or mount persistent storage. There is no user-account isolation in this hackathon prototype: do not use it as a multi-user private document store.

## Deployment preparation

1. Run the checks above and confirm local tools work.
2. Configure NitroCloud through its dashboard or supported deployment workflow. Keep credentials in deployment secret settings.
3. Set `NODE_ENV=production`, `MCP_TRANSPORT_TYPE=http`, `HOST=0.0.0.0`, and the platform-assigned `PORT`. The application defaults to `legacy` protocol mode, verified with standard MCP SDK v1 clients. Set `NITRO_MCP_PROTOCOL_VERSION=legacy` if you provide an explicit environment override.
4. Build with `npm run build`; run the compiled server with `npm run start:prod`.
5. Test the hosted MCP endpoint at `/mcp` with a compatible client.
6. Re-run the offline workflow against the deployed server, then capture a short end-to-end demo.

A ZIP upload should exclude `node_modules`, widget dependencies, caches, `.git`, real `.env` files, and saved plans. Check the platform's size limit.

## Limits

- Public github.com repositories only.
- At most 300 recently updated issue-endpoint entries are scanned; results are not exhaustive.
- Skill and scope matching uses content/keyword/label heuristics, not semantic source-code understanding. Missing labels never exclude candidates unless requested.
- Tentative content/label-based time ranges cannot predict repository complexity. Broad or unknown work may have no time estimate.
- Documentation excerpts are bounded and may be incomplete. Commands are not inferred or executed by the server.
- Contribution instructions are checked in common locations, GitHub community-profile metadata, and public owner-level `.github` defaults where readable. Linked external handbooks are surfaced but not automatically fetched. English policy signals require manual interpretation.
- Issue data can change after retrieval; saving a plan does not assign or reserve an issue.
- Upstream repository text is untrusted data. The server and prompt explicitly distinguish it from agent instructions.
- The original calculator source remains as an unregistered learning reference.

## References

- [NitroStack server concepts](https://docs.nitrostack.ai/sdk/typescript/server)
- [NitroStack tools](https://docs.nitrostack.ai/sdk/typescript/tools)
- [GitHub issue endpoints](https://docs.github.com/en/rest/issues/issues#list-repository-issues)
- [GitHub repository contents](https://docs.github.com/en/rest/repos/contents#get-repository-content)

## Availability and contribution-process checks

See [contribution evidence](docs/contribution-evidence.md) for inspected sources, decision rules, limits, and demo scenarios.

- Discovery fits skills; it does not declare an issue free to take.
- Context inspects up to 200 timeline events, 3 referenced PRs, and 200 reviews per PR. Unlinked/private work and newer events beyond limits may be missed.
- A PR reference may be incidental. Its relationship to the issue and correctness need human review.
- Review states and timestamps are shown as evidence. The server does not label code as AI-generated, low quality, or abandoned; CI and diffs are not inspected.
- Repository guidance is quoted with source links. Conditional wording, conflicts, missing files, failed requests, and truncated excerpts preserve uncertainty.
- Saving defaults to `strategy: "follow-recommendation"`. An explicit `implementation` choice against a coordination/review recommendation requires a `coordination_note`; this note is user-provided, not proof of maintainer approval.
- The `review-existing-pr` strategy plans coordination, investigation, or agreed help. It does not authorize editing another contributor branch.

Offline scenarios: issue 102 has an open PR with requested changes; 103 has a possible discussion claim; 104 has closed PR history; 105 is assigned; 106 is an unlabeled documentation candidate. The browser preview has read-only scenario buttons.
