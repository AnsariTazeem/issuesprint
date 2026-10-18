import type { Issue } from './issues.schemas.js';
import type { ActivityAssessment } from './issues.context.js';

export const DEMO_OWNER = 'issuesprint-demo';
export const DEMO_REPO = 'demo-repo';
export const demoIssues: Issue[] = [
  { number: 101, title: 'Document TypeScript setup for new contributors', body: 'The README does not explain how to install dependencies, run the type checker, or run tests. Add a short TypeScript contributor quick start and verify every command. Acceptance: a new contributor can run the documented setup.', labels: ['good first issue', 'documentation', 'TypeScript'], assignees: [], state: 'open' },
  { number: 102, title: 'Fix keyboard navigation in the React issue filter', body: 'The filter dropdown cannot be reached reliably by keyboard. A contributor has already opened a PR; read its review feedback before starting another implementation.', labels: ['good first issue', 'React', 'accessibility', 'bug'], assignees: [], state: 'open' },
  { number: 103, title: 'Add boundary tests for API pagination', body: 'The Node.js API client lacks tests for empty pages and pagination boundaries. Check discussion activity before starting.', labels: ['help wanted', 'TypeScript', 'testing'], assignees: [], state: 'open' },
  { number: 104, title: 'Replace the distributed authentication architecture', body: 'Redesign database migrations, authentication, and deployment across services. A previous PR closed without merging. Requires a design discussion; this is not a small change.', labels: ['architecture', 'backend'], assignees: [], state: 'open' },
  { number: 105, title: 'Update installation screenshots', body: 'Refresh the contributor installation screenshots. This issue has an assignee; the repository may welcome coordinated help.', labels: ['good first issue', 'documentation'], assignees: ['demo-contributor'], state: 'open' },
  { number: 106, title: 'Fix a typo in the TypeScript README setup section', body: 'Correct the documented TypeScript command spelling in one README paragraph. This documentation issue has no beginner label. Verify the command against the package scripts.', labels: [], assignees: [], state: 'open' },
].map(issue => ({ ...issue, url: 'https://github.com/' + DEMO_OWNER + '/' + DEMO_REPO + '/issues/' + issue.number, updated_at: '2026-10-18T00:00:00Z' }));

export const demoReadme = '# Demo repository\n\nThis is a fictional repository used by IssueSprint fixtures.\n\nRequirements: Node.js 22 and npm.\n\nSetup: npm ci\nType check: npm run typecheck\nTests: npm test\nBuild: npm run build\n';
export const demoContributing = '# Contributing\n\nYou may submit a pull request directly. Assignment is not required.\n\nFor large architecture changes, discuss the design with maintainers before coding. If an issue has an assignee or an existing PR, coordinate with the contributor before duplicating work.\n\nCreate a focused branch, add a regression test when fixing behavior, run the documented checks, and submit a small pull request referencing the issue. Do not invent commands that are not in the repository README.\n';

export function demoActivity(number: number): ActivityAssessment {
  const result: ActivityAssessment = {
    status: 'inspected', checked_at: new Date().toISOString(), timeline_entries_scanned: 0,
    timeline_complete: true, referenced_prs_found: 0, prs_complete: true,
    pull_requests: [], comments: [], possible_claims: [],
    notices: ['Fictional, deterministic activity fixtures. Real results never guarantee the absence of unlinked or private work.', 'No AI-authorship, code-correctness, or CI judgment is made.'],
  };
  if (number === 102 || number === 104) {
    result.timeline_entries_scanned = 2; result.referenced_prs_found = 1;
    result.pull_requests.push({
      number: number === 102 ? 202 : 204, repository: DEMO_OWNER + '/' + DEMO_REPO,
      title: number === 102 ? 'Fix issue-filter keyboard navigation' : 'Earlier authentication redesign',
      url: 'https://github.com/' + DEMO_OWNER + '/' + DEMO_REPO + '/pull/' + (number === 102 ? 202 : 204),
      state: number === 102 ? 'open' : 'closed', merged: false, draft: false, author: 'demo-author',
      updated_at: '2026-10-17T18:00:00Z', relationship: 'closing-reference-in-body',
      review_status: number === 102 ? 'changes-requested-observed' : 'no-decision-observed',
      reviews_complete: true,
      reviews: number === 102 ? [{
        author: 'demo-maintainer', association: 'COLLABORATOR', state: 'CHANGES_REQUESTED',
        body: 'Please preserve focus when the menu closes and add a keyboard-navigation regression test. Coordinate with the author if you want to help.',
        url: 'https://github.com/' + DEMO_OWNER + '/' + DEMO_REPO + '/pull/202#pullrequestreview-demo', submitted_at: '2026-10-17T18:00:00Z',
      }] : [],
    });
  }
  if (number === 103) {
    const comment = { author: 'demo-volunteer', association: 'CONTRIBUTOR', body: 'I am working on this and plan to submit a draft. Please coordinate before starting duplicate work.', url: 'https://github.com/' + DEMO_OWNER + '/' + DEMO_REPO + '/issues/103#issuecomment-demo', updated_at: '2026-10-18T00:00:00Z' };
    result.comments.push(comment); result.possible_claims.push(comment); result.timeline_entries_scanned = 1;
  }
  return result;
}
