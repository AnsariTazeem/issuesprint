# Deploy IssueSprint to NitroCloud

## Upload the current project

The buildathon guidebook supports deployment through NitroStudio, or through the NitroCloud dashboard with a source ZIP or GitHub connection. Its ZIP limit is 100 MB.

1. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run smoke:http`.
2. Run `npm run pack:deployment` from the project root.
3. In NitroStudio open IssueSprint and select **Deployments**, or open the NitroCloud dashboard at https://nitrocloud.ai/.
4. Create/select the app and choose its source-ZIP upload option. Upload `issuesprint-deployment.zip`.
5. Use the settings below if the dashboard asks for build or runtime configuration.
6. Deploy, then copy the generated app URL and MCP endpoint. Inspect the deployment logs if startup fails.

The ZIP packages the current working files, including uncommitted source changes. It excludes dependencies, build outputs, Git history, local environment files, and saved plans. It is a source upload; the cloud build must install dependencies and compile the widgets. Do not delete local node_modules to create it.

If using GitHub instead, commit and push the intended source changes first. A GitHub deployment cannot include uncommitted local files.

## Build and runtime settings

| Setting | Value |
| --- | --- |
| Project/root directory | Archive root, containing package.json |
| Node.js | 20.20.x or newer in Node 20; Node 22.22+ also supported |
| Build command | `npm run build:cloud` |
| Start command | `npm run start:prod` |
| MCP path | `/mcp` |

The locked CLI analytics dependency requires Node 20.20.0+ (or Node 22.22.0+). Check the build log if the platform uses an older Node 20 patch.

The cloud build explicitly installs root and widget development dependencies because TypeScript and the widget bundler are needed at build time. Startup runs the compiled entry point directly, preserving the platform's PORT variable; it does not invoke the CLI start command that defaults to port 3000.

Set environment variables in the dashboard:

```text
NODE_ENV=production
MCP_TRANSPORT_TYPE=http
HOST=0.0.0.0
NITRO_MCP_PROTOCOL_VERSION=legacy
ISSUESPRINT_ALLOW_SAVE=true
ISSUESPRINT_PLAN_DIR=/tmp/issuesprint/plans
```

Use the platform's assigned PORT; do not overwrite it with an arbitrary value. If a port field is mandatory and none is assigned, use its documented internal port and configure PORT to match.

GITHUB_TOKEN is optional for public repositories. If used, enter it only as a deployment secret. Never include it in the ZIP, README, or chat.

## Verify the hosted app

First connect NitroStudio using **Other Project → HTTP (Streamable HTTP)** and the generated MCP URL. If the dashboard provides only a base URL, the expected endpoint is that base URL followed by /mcp.

Run this offline workflow to separate server problems from GitHub API problems:

1. list_issues: owner issuesprint-demo, repo demo-repo, skills ["TypeScript"], limit 3.
2. get_contribution_context: the same owner/repo, issue_number 102. Expect the existing-PR recommendation and widget.
3. save_work_plan: approve a specific review/help plan. Verify saved=true and retain the returned Markdown.

Then inspect one real public GitHub issue. Check the widget, source links, and any rate-limit response.

Test NitroChat briefly and retain its working demo/share URL for submission. A raw MCP endpoint may return a protocol error in an ordinary browser; that alone does not mean deployment failed.

Plans are stored on the hosting server. Without a persistent volume, redeployment or scaling may discard them. The returned Markdown is the portable copy. This prototype has no account isolation; use it for public contribution plans rather than private documents.

## References

- Buildathon Guidebook, deployment section (pages 10–11).
- [Official cloud deployment guide](https://docs.nitrostack.ai/deployment/cloud.md).
- Installed CLI 1.1.2 supports the dashboard/source-ZIP path and nitrostack-pack. Its help does not expose the login/deploy commands advertised in the general cloud guide; do not rely on those commands for this version.
