import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IssuesService } from '../dist/modules/issues/issues.service.js';
import { assessIssue, extractPolicy, recommendContribution, detectPossibleClaims, parseGitHubApiReference } from '../dist/modules/issues/issues.context.js';
import { inspectIssueActivity } from '../dist/modules/issues/issues.activity.js';
import { demoActivity, demoIssues } from '../dist/modules/issues/issues.demo.js';

const issue = { ...demoIssues.find(issue => issue.number === 106), url: 'https://github.com/example/repo/issues/8', number: 8 };
const input = { owner: 'example', repo: 'repo', issue_number: 8 };
const document = text => ({ found: true, path: 'CONTRIBUTING.md', url: 'https://github.com/example/repo/blob/main/CONTRIBUTING.md', text, truncated: false });
const service = settings => new IssuesService({ get: (key, fallback) => settings?.[key] ?? fallback });
const reference = { owner: 'issuesprint-demo', repo: 'demo-repo' };
const pull = (extra = {}) => ({ number: 42, title: 'Improve documentation', html_url: 'https://github.com/example/repo/pull/42', body: 'Fixes #8', state: 'open', merged: false, draft: false, updated_at: '2026-10-18T00:00:00Z', user: { login: 'author' }, ...extra });
const event = { event: 'cross-referenced', source: { issue: { pull_request: { url: 'https://api.github.com/repos/example/repo/pulls/42' } } } };
const review = (state, author = 'reviewer') => ({ user: { login: author }, state, body: 'Please check the setup instructions.', html_url: 'https://github.com/example/repo/pull/42#review', submitted_at: '2026-10-18T00:00:00Z', author_association: 'COLLABORATOR' });

test('unlabeled and assigned issues are discoverable by default without availability claims', async () => {
  const result = await service().listIssues({ ...reference, limit: 20 });
  assert.ok(result.issues.some(issue => issue.number === 106));
  assert.ok(result.issues.some(issue => issue.number === 105));
  assert.equal(result.filters.beginner_only, false);
  assert.equal(result.filters.unassigned_only, false);
  assert.ok(result.issues.every(issue => issue.availability.status === 'unchecked'));
});

test('an unlabeled localized documentation task can be tentatively approachable', () => {
  const assessed = assessIssue(issue, ['TypeScript', 'documentation'], 90);
  assert.equal(assessed.suitability.beginner_label_present, false);
  assert.equal(assessed.suitability.scope, 'potentially-approachable');
  assert.ok(assessed.estimated_minutes);
});

test('sensitive broad tasks are not called easy even when they carry a beginner label', () => {
  const assessed = assessIssue({ ...issue, title: 'Redesign distributed authentication', labels: ['good first issue'] }, ['TypeScript'], 90);
  assert.equal(assessed.suitability.scope, 'needs-deeper-review');
  assert.equal(assessed.estimated_minutes, null);
});

test('direct PR policy and optional assignment are recognized with source evidence', () => {
  const policy = extractPolicy([document('You may submit a pull request directly. Assignment is not required.')]);
  assert.equal(policy.process, 'direct-pr-mentioned');
  assert.equal(policy.assignment, 'not-required-mentioned');
  assert.ok(policy.evidence.every(item => item.url));
  const recommendation = recommendContribution(issue, demoActivity(106), policy);
  assert.equal(recommendation.suggested_plan, 'implementation');
  assert.match(recommendation.availability, /inspected-evidence/);
});

test('conditional assignment guidance is not promoted to a universal rule', () => {
  const policy = extractPolicy([document('If an issue is assigned, ask the maintainer before starting.')]);
  assert.equal(policy.assignment, 'conditional-or-unclear');
  assert.ok(policy.evidence.some(item => item.conditional));
});

test('conflicting direct-PR and discussion-first instructions preserve uncertainty', () => {
  const policy = extractPolicy([document('You may submit a pull request directly. You must discuss the change before opening a pull request.')]);
  assert.equal(policy.status, 'conflicting-signals');
  assert.equal(recommendContribution(issue, demoActivity(106), policy).action, 'investigate-unknown');
});

test('work-claim detection ignores quoted and explicitly withdrawn claims', () => {
  const comment = { author: 'person', association: 'NONE', url: 'https://github.com/example/repo/issues/8#comment', updated_at: '2026-10-18T00:00:00Z' };
  assert.equal(detectPossibleClaims([{ ...comment, body: 'I am working on this.' }]).length, 1);
  assert.equal(detectPossibleClaims([{ ...comment, body: '> I am working on this.\nThis is a quote.' }]).length, 0);
  assert.equal(detectPossibleClaims([{ ...comment, body: 'I am no longer working on this.' }]).length, 0);
});

test('PR and content references reject non-GitHub hosts and executable/invalid paths', () => {
  assert.equal(parseGitHubApiReference('https://evil.example/repos/example/repo/pulls/42', 'pulls'), null);
  assert.equal(parseGitHubApiReference('https://api.github.com/repos/example/repo/pulls/42/anything', 'pulls'), null);
  assert.equal(parseGitHubApiReference('https://api.github.com/repos/example/repo/pulls/42?token=x', 'pulls'), null);
  assert.ok(parseGitHubApiReference('https://api.github.com/repos/example/repo/pulls/42', 'pulls'));
});

test('open referenced PRs produce review/coordination guidance, not competing implementation', async () => {
  const activity = await inspectIssueActivity(input, issue, async path => {
    if (path.includes('/timeline?')) return [event];
    if (path.includes('/reviews?')) return [review('CHANGES_REQUESTED'), review('COMMENTED')];
    return pull();
  }, async () => ({}));
  assert.equal(activity.pull_requests[0].review_status, 'changes-requested-observed');
  assert.equal(activity.pull_requests[0].relationship, 'closing-reference-in-body');
  const recommendation = recommendContribution(issue, activity, extractPolicy([]));
  assert.equal(recommendation.action, 'inspect-existing-pr');
  assert.equal(recommendation.suggested_plan, 'review-existing-pr');
});

test('later approval supersedes the same reviewer earlier change request', async () => {
  const activity = await inspectIssueActivity(input, issue, async path => path.includes('/timeline?') ? [event] : path.includes('/reviews?') ? [review('CHANGES_REQUESTED'), review('APPROVED')] : pull(), async () => ({}));
  assert.equal(activity.pull_requests[0].review_status, 'approval-observed');
});

test('an unrelated fixes word does not imply the PR closes the target issue', async () => {
  const activity = await inspectIssueActivity(input, issue, async path => path.includes('/timeline?') ? [event] : path.includes('/reviews?') ? [] : pull({ body: 'Fixes #99. Related background: #8.' }), async () => ({}));
  assert.equal(activity.pull_requests[0].relationship, 'timeline-reference');
});

test('failed timeline requests and truncated scans never imply availability', async () => {
  const failed = await inspectIssueActivity(input, issue, async () => { throw new Error('GitHub rate limited this request.'); }, async () => ({}));
  assert.equal(failed.status, 'unknown');
  assert.equal(recommendContribution(issue, failed, extractPolicy([])).action, 'investigate-unknown');
  const capped = await inspectIssueActivity(input, issue, async () => Array.from({ length: 100 }, () => ({ event: 'labeled' })), async () => ({}));
  assert.equal(capped.timeline_entries_scanned, 200);
  assert.equal(capped.timeline_complete, false);
  assert.equal(recommendContribution(issue, capped, extractPolicy([])).action, 'investigate-unknown');
});

test('PR review failures remain visible without hiding the observed open PR', async () => {
  const activity = await inspectIssueActivity(input, issue, async path => {
    if (path.includes('/timeline?')) return [event];
    if (path.includes('/reviews?')) throw new Error('Review data unavailable');
    return pull();
  }, async () => ({}));
  assert.equal(activity.pull_requests.length, 1);
  assert.equal(activity.pull_requests[0].review_status, 'unknown');
  assert.equal(activity.status, 'partial');
  assert.equal(recommendContribution(issue, activity, extractPolicy([])).action, 'inspect-existing-pr');
});

test('demo distinguishes existing PR, work claim, closed PR, and unlabeled contribution paths', async () => {
  const instance = service();
  const open = await instance.getContributionContext({ ...reference, issue_number: 102 });
  assert.equal(open.recommendation.action, 'inspect-existing-pr');
  assert.equal(open.activity.pull_requests[0].review_status, 'changes-requested-observed');
  assert.equal((await instance.getContributionContext({ ...reference, issue_number: 103 })).recommendation.action, 'coordinate-existing-work');
  assert.equal((await instance.getContributionContext({ ...reference, issue_number: 104 })).recommendation.action, 'review-closed-pr-history');
  assert.equal((await instance.getContributionContext({ ...reference, issue_number: 106 })).recommendation.suggested_plan, 'implementation');
});

test('saving refreshes context and follows the recommended strategy; implementation override needs a note', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'issuesprint-context-'));
  try {
    const instance = service({ ISSUESPRINT_PLAN_DIR: directory });
    const plan = { ...reference, issue_number: 102, available_minutes: 90, summary: 'Coordinate with the author and inspect requested keyboard-navigation changes.', steps: ['Read the current PR review.', 'Offer agreed testing help to the author.'], acceptance_checks: ['The plan avoids duplicate work.'] };
    const saved = await instance.saveWorkPlan(plan);
    assert.equal(saved.strategy, 'review-existing-pr');
    assert.match(saved.markdown, /pull\/202/);
    await assert.rejects(instance.saveWorkPlan({ ...plan, strategy: 'implementation' }), /coordination_note/);
    assert.equal((await readdir(directory)).length, 1);
    const explicit = await instance.saveWorkPlan({ ...plan, strategy: 'implementation', coordination_note: 'The intended scope is a separate documentation fix; verify agreement before coding.' });
    assert.match(explicit.markdown, /not independently verified/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('negative policy wording never becomes permission to submit directly or skip assignment', () => {
  const policy = extractPolicy([document('Do not submit a pull request directly. You must not work without assignment.')]);
  assert.notEqual(policy.process, 'direct-pr-mentioned');
  assert.notEqual(policy.assignment, 'not-required-mentioned');
});

test('missing or truncated guidance cannot promote a direct-PR signal into implementation advice', () => {
  const policy = extractPolicy([{ ...document('You may submit a pull request directly.'), truncated: true }]);
  assert.equal(policy.documents_complete, false);
  assert.equal(recommendContribution(issue, demoActivity(106), policy).suggested_plan, 'coordination');
});
