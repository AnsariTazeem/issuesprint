import { assessIssue, extractPolicy, recommendContribution } from '../../modules/issues/issues.context';
import { demoActivity, demoContributing, demoIssues, demoReadme } from '../../modules/issues/issues.demo';

/** Browser-only examples. These do not call tools or imply real GitHub activity. */
export function contributionPreview(number: number) {
  const issue = demoIssues.find(issue => issue.number === number)!;
  const documents = {
    readme: { found: true, path: 'README.md', url: null, text: demoReadme, truncated: false },
    contributing: { found: true, path: 'CONTRIBUTING.md', url: null, text: demoContributing, truncated: false },
  };
  const activity = demoActivity(number);
  const contribution_policy = extractPolicy(Object.values(documents));
  return {
    kind: 'contribution-context', source: 'demo',
    repository: { owner: 'issuesprint-demo', repo: 'demo-repo' }, issue, documents, activity, contribution_policy,
    recommendation: recommendContribution(issue, activity, contribution_policy),
    notices: ['Fictional offline browser scenario. Read-only preview; saving and tool actions require an MCP host.'],
  };
}
export const discoveryPreview = {
  kind: 'issue-list', source: 'demo', repository: { owner: 'issuesprint-demo', repo: 'demo-repo' },
  filters: { skills: ['TypeScript', 'documentation'], available_minutes: 90 },
  matching_count: demoIssues.length, scanned_entries: demoIssues.length,
  issues: demoIssues.map(issue => assessIssue(issue, ['TypeScript', 'documentation'], 90)).sort((a, b) => b.score - a.score || a.number - b.number),
  notices: ['Fictional browser fixtures. All candidates have unchecked availability until context is inspected. Unlabeled and assigned issues are included.'],
};
