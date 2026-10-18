# IssueSprint

### Find a contribution. Understand the context. Plan your next step.

IssueSprint helps developers turn a public GitHub issue into an informed contribution plan. Tell it your skills, available time, and target repository. It finds candidates, checks existing work and contribution requirements, and helps you decide whether to implement, help an existing PR, or coordinate first.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Try the live assistant](https://nitrochat-issuesprint-assistant-6ad4f303-team-apex-oss-connect.app.nitrocloud.ai)** · **[Source code](https://github.com/AnsariTazeem/issuesprint)** · **[Deployment guide](docs/deployment.md)**

Built with TypeScript and NitroStack. Deployed on NitroCloud and tested through NitroChat and NitroStudio.

## Why IssueSprint?

Finding an issue is only the beginning. Before contributing, you still need to answer:

- Does this match my skills and the time I have?
- Has someone already opened a PR or said they are working on it?
- Does this repository expect assignment, discussion, or a direct PR?
- What should I do first, and how will I verify the result?

Those answers are often scattered across issue descriptions, comments, PRs, README files, and contributor guides. A good-first-issue label is useful, but it does not establish availability. A missing beginner label does not rule out a useful contribution.

IssueSprint brings that context into one MCP workflow, with source links and an explicit next action.

| Contributor task | How IssueSprint helps |
| --- | --- |
| Find work relevant to your skills | Ranks issue candidates using transparent keyword and scope signals |
| Check whether work is already underway | Inspects referenced PRs, review feedback, assignees, and possible work claims |
| Understand how the repository accepts contributions | Reads repository guidance and shows the relevant source excerpts |
| Decide how to contribute | Suggests implementation, reviewing existing work, coordination, or further investigation |
| Turn research into a first step | Saves an approved Markdown plan with steps, verification checks, and inspected context |

## What makes it useful

**Existing work changes the recommendation.** An open issue with an existing PR can become an opportunity to review, reproduce a problem, or help the author. A closed PR prompts a check of the previous outcome before another implementation begins.

**Repository rules stay repository-specific.** IssueSprint does not impose assignment as a universal requirement. It quotes guidance about direct PRs, discussion, and assignment, preserving conditions and conflicting instructions.

**Unlabeled issues remain discoverable.** Beginner-label and unassigned-only filters are optional and off by default. Help-wanted labels and assignees are signals to interpret in context.

**Time is a constraint, not a promise.** Tentative estimates help screen candidates. Broad or unclear work may have no estimate, and the assistant can say that none of the inspected issues is a good fit.

**Plans are reviewable and portable.** You approve the proposed approach before saving. The server refreshes the context, then returns Markdown containing the plan, source references, and evidence timestamp. You can retain it outside the chat.

## Try it

Open the [live IssueSprint Assistant](https://nitrochat-issuesprint-assistant-6ad4f303-team-apex-oss-connect.app.nitrocloud.ai) and try:

> I know TypeScript and documentation, and have 90 minutes. Find three candidate issues in microsoft/vscode. Check existing PRs and contribution rules before recommending one. Explain your recommendation briefly. Do not save a plan yet.

Then ask for a focused plan for a selected issue. Review its steps and verification checks before approving the save.

The live assistant uses real GitHub data for public repositories. Only the reserved `issuesprint-demo/demo-repo` pair returns clearly labeled fictional fixtures.

### What the workflow looks like

1. **Discover:** describe your skills, time budget, and repository.
2. **Inspect:** review the issue, related work, and contribution instructions.
3. **Choose:** decide whether to implement, help an existing PR, or coordinate.
4. **Approve and save:** retain a focused plan with observable verification checks.

For example, a documentation issue may look approachable and have no assignee. If inspection finds an open PR addressing it, IssueSprint can recommend reviewing that PR before starting a competing implementation.

## Connect your MCP client

**Streamable HTTP endpoint:**

```text
https://issuesprint-6ad4e570-team-apex-oss-connect.app.nitrocloud.ai/mcp
```

In NitroStudio, add **Other Project → HTTP (Streamable HTTP)** and use the endpoint above.

The server exposes standard MCP tools, a workflow resource, and a planning prompt. Interactive widgets render in NitroStudio and compatible widget hosts; clients without widget support can still use the tool responses.

| Tool | Purpose |
| --- | --- |
| `list_issues` | Find open candidates with skill matches, tentative scope estimates, optional filters, and scan limits |
| `get_contribution_context` | Inspect issue details, PRs, reviews, possible work claims, and repository contribution guidance |
| `save_work_plan` | Refresh the evidence and save an approved implementation, existing-PR review, or coordination plan |

The `plan_contribution` prompt guides the sequence. The `issuesprint://workflow` resource documents its rules and demo parameters.

### Why MCP is part of the product

The agent combines several sources of context and performs a bounded action after approval. MCP makes those capabilities discoverable and reusable across compatible clients, rather than tying them to one chat interface.

The client runs the language model and conversation. The server handles input validation, GitHub access, contribution evidence, and plan storage. Each tool also works through NitroStudio's manual executor without an AI conversation.

## Run locally

Requirements: Node.js **20.20+ within Node 20**, or **22.22+**, and npm **9+**. Development and deployment have been verified in WSL Ubuntu and on NitroCloud.

```bash
git clone https://github.com/AnsariTazeem/issuesprint.git
cd issuesprint
npm ci --include=dev
npm ci --prefix src/widgets --include=dev
cp -n .env.example .env
npm run build
```

The copy command preserves an existing `.env`. Public GitHub reads work without a token, subject to API limits. An optional server-side `GITHUB_TOKEN` increases the available allowance.

### Start a local HTTP server

```bash
NODE_ENV=production MCP_TRANSPORT_TYPE=http HOST=127.0.0.1 PORT=3000 npm start
```

Connect a compatible client to `http://localhost:3000/mcp`. The MCP endpoint is a protocol endpoint, not the browser demo page.

For STDIO, run the following from the project directory and configure your client to launch the same command with that working directory:

```bash
NODE_ENV=development MCP_TRANSPORT_TYPE=stdio node dist/index.js
```

Rebuild and reconnect after server changes. Startup runs compiled code and preserves the hosting platform's assigned port.

### Edit the widgets

```bash
npm run dev
```

Open [localhost:3001](http://localhost:3001) for the sample browser preview. It uses labeled fictional data; tool calls and saving require a connected MCP host.

The preview includes discovery, existing-PR, unlabeled-issue, and work-claim scenarios. Run the root `npm run build` to bundle the widget HTML used by NitroStudio and the hosted server.

## Test without GitHub access

Run `list_issues` through your MCP client with:

```json
{
  "owner": "issuesprint-demo",
  "repo": "demo-repo",
  "skills": ["TypeScript", "documentation"],
  "available_minutes": 90,
  "limit": 3
}
```

Inspect issue **102** for an existing PR, **103** for a possible work claim, or **106** for an unlabeled contribution with direct-PR guidance. Propose and approve a plan before saving.

Fixture URLs are illustrative. Failed live GitHub requests never silently fall back to demo data.

## Configuration and deployment

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | Optional secret for public GitHub API reads |
| `MCP_TRANSPORT_TYPE` | Select `stdio`, `http`, or `dual` |
| `HOST` / `PORT` | HTTP listener settings; preserve the platform-assigned port in hosting |
| `NITRO_MCP_PROTOCOL_VERSION` | Application default: `legacy`, verified with the deployed clients |
| `ISSUESPRINT_PLAN_DIR` | Optional writable plan directory; local default: `./data/plans`; production default: OS temporary directory plus `/issuesprint/plans` |
| `ISSUESPRINT_ALLOW_SAVE` | Set to `false` to disable plan storage |

See [.env.example](.env.example) and the [deployment guide](docs/deployment.md) for complete settings. The cloud build command is `npm run build:cloud`; production startup is `npm run start:prod`. Create a source ZIP with `npm run pack:deployment` when using an upload-based deployment.

Plans are stored on the server and returned as complete Markdown. **Keep a copy:** temporary cloud storage can reset on redeployment or scaling. Configure a writable persistent volume when durable storage is needed. Filenames are unique, existing plans are not overwritten, and storage is capped at 200 plans with 10 save requests per minute per process.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run smoke
npm run smoke:http
```

Regression tests cover ranking and filters, validation, GitHub pagination and errors, contribution rules, PR/review evidence, discussion claims, storage permissions, and safe Markdown rendering.

Smoke checks exercise the MCP workflow, widget resources, prompts, STDIO, and production HTTP startup. Hosted testing has also verified all three tools against real GitHub data and controlled fixture scenarios, including successful cloud plan saves.

## Scope and limitations

- **Public github.com repositories only.** Private repositories are not supported.
- Discovery scans at most **300 recently updated entries**, including PR entries that are excluded from results. It does not search every issue in a large repository.
- Skill matching and time estimates use heuristics, not semantic source-code analysis.
- Context inspection is bounded to **200 timeline entries, three referenced PRs, and 200 reviews per PR**. Unlinked, private, off-platform, or unscanned work can be missed.
- Policy detection uses English text signals and bounded document excerpts. Linked external handbooks are surfaced for review, not automatically read.
- A reference or review decision does not prove a PR fixes an issue. Code diffs and CI are not inspected.
- GitHub API limits and upstream availability affect live requests. Evidence can become outdated after inspection.
- Saving records proposed work. It does not execute commands, verify completed checks, reserve an issue, post comments, or change GitHub.
- This prototype has no user-account isolation for plan storage. Use it for public contribution plans, not private documents.

## Project structure

```text
src/
  modules/issues/     Tools, schemas, GitHub access, evidence, and planning
  widgets/            React/Next.js contribution workspace
  health/             Server health checks
scripts/              MCP smoke checks
tests/                Service and rendering regressions
docs/                 Deployment, evidence model, and demo guides
```

The original calculator module remains as an unregistered learning reference.

## Learn more

- [Contribution evidence and decision rules](docs/contribution-evidence.md)
- [Deploying IssueSprint](docs/deployment.md)
- [Demo recording guide](docs/demo-script.md)
- [NitroStack documentation](https://docs.nitrostack.ai/sdk/typescript/server)
- [GitHub REST API documentation](https://docs.github.com/en/rest)

## License

[MIT](LICENSE) © 2026 Tazeem Ansari. Third-party dependencies retain their respective licenses.
