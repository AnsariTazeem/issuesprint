import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IssuesService } from '../dist/modules/issues/issues.service.js';
import { listIssuesSchema, issueReferenceSchema } from '../dist/modules/issues/issues.schemas.js';

function service(settings = {}) {
  return new IssuesService({ get: (key, fallback) => settings[key] ?? fallback });
}
const reference = { owner: 'issuesprint-demo', repo: 'demo-repo', issue_number: 101 };
const plan = { ...reference, available_minutes: 90, summary: 'Document the contributor setup based on the repository README.', steps: ['Read repository instructions.', 'Update the setup section.', 'Verify the documented commands.'], acceptance_checks: ['A new contributor can follow the documented setup.'] };
const issue = (number, extra = {}) => ({ number, title: 'Improve TypeScript setup', body: 'Update documentation', labels: [{ name: 'good first issue' }, { name: 'documentation' }], html_url: 'https://github.com/example/repo/issues/' + number, assignees: [], updated_at: '2026-10-18T00:00:00Z', state: 'open', ...extra });

test('schemas reject invalid repository identifiers and out-of-range limits', () => {
  for (const value of [{ owner: '../x', repo: 'repo' }, { owner: 'ok', repo: '..' }, { owner: 'ok', repo: 'repo', limit: 0 }, { owner: 'ok', repo: 'repo', limit: 21 }]) {
    assert.equal(listIssuesSchema.safeParse(value).success, false);
  }
  assert.equal(issueReferenceSchema.safeParse({ ...reference, issue_number: 0 }).success, false);
});

test('demo ranks skill matches, excludes assigned and advanced issues, and respects limit', async () => {
  const result = await service().listIssues({ ...reference, skills: ['TypeScript', 'documentation'], limit: 1, beginner_only: true, unassigned_only: true });
  assert.equal(result.source, 'demo');
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].number, 101);
  assert.deepEqual(result.issues[0].matched_skills, ['TypeScript', 'documentation']);
  assert.equal(result.matching_count, 3);
  assert.equal(result.issues[0].estimated_minutes.basis, 'content/label heuristic; not a guarantee');
});

test('demo filters can include assigned and non-beginner issues when explicitly relaxed', async () => {
  const result = await service().listIssues({ ...reference, beginner_only: false, unassigned_only: false, limit: 20 });
  assert.equal(result.issues.length, 6);
  assert.ok(result.issues.some(issue => issue.number === 105));
});

test('context includes contribution requirements and rejects nonexistent demo issues', async () => {
  const result = await service().getContributionContext(reference);
  assert.equal(result.issue.number, 101);
  assert.match(result.documents.contributing.text, /regression test/);
  await assert.rejects(service().getContributionContext({ ...reference, issue_number: 999 }), /Demo issue not found/);
});

test('work plans persist as unique files and return complete Markdown', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'issuesprint-test-'));
  try {
    const instance = service({ ISSUESPRINT_PLAN_DIR: directory });
    const first = await instance.saveWorkPlan(plan);
    const second = await instance.saveWorkPlan(plan);
    assert.notEqual(first.filename, second.filename);
    assert.equal(await readFile(join(directory, first.filename), 'utf8'), first.markdown);
    assert.match(first.markdown, /fictional offline demo/);
    assert.match(first.markdown, /not reserve or claim/);
    assert.equal((await readdir(directory)).length, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('disabled plan storage rejects writes', async () => {
  await assert.rejects(service({ ISSUESPRINT_ALLOW_SAVE: 'false' }).saveWorkPlan(plan), /disabled/);
});

test('GitHub list excludes pull requests and assigned issues', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async url => new Response(JSON.stringify(String(url).includes('/issues?') ? [
      issue(1), issue(2, { pull_request: { url: 'https://api.github.com/pulls/2' } }),
      issue(3, { assignees: [{ login: 'someone' }] }),
    ] : { private: false, default_branch: 'main', html_url: 'https://github.com/example/repo' }), { status: 200 });
    const result = await service().listIssues({ owner: 'example', repo: 'repo', unassigned_only: true });
    assert.deepEqual(result.issues.map(item => item.number), [1]);
    assert.equal(result.scanned_entries, 3);
  } finally { globalThis.fetch = original; }
});

test('GitHub pagination advances through pages of pull requests and reports scan limits', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  try {
    globalThis.fetch = async url => {
      const target = new URL(url);
      if (!target.pathname.endsWith('/issues')) return new Response(JSON.stringify({ private: false, default_branch: 'main', html_url: 'https://github.com/example/repo' }));
      requests++;
      const page = Number(target.searchParams.get('page'));
      return new Response(JSON.stringify(page === 1 ? Array.from({ length: 100 }, (_, i) => issue(i + 1, { pull_request: {} })) : [issue(201)]));
    };
    const result = await service().listIssues({ owner: 'example', repo: 'repo' });
    assert.equal(requests, 2);
    assert.equal(result.issues[0].number, 201);
    assert.equal(result.scan_capped, false);
  } finally { globalThis.fetch = original; }
});

test('private repositories and GitHub rate limits return actionable errors', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ private: true, default_branch: 'main', html_url: 'https://github.com/example/repo' }));
    await assert.rejects(service().listIssues({ owner: 'example', repo: 'repo' }), /only supports public/);
    globalThis.fetch = async () => new Response('{}', { status: 429, headers: { 'retry-after': '60' } });
    await assert.rejects(service().listIssues({ owner: 'example', repo: 'repo' }), /Retry after 60/);
  } finally { globalThis.fetch = original; }
});

test('missing contribution files are reported and README base64 is decoded', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      const path = new URL(url).pathname;
      if (path.endsWith('/issues/8')) return new Response(JSON.stringify(issue(8)));
      if (path.endsWith('/readme')) return new Response(JSON.stringify({ type: 'file', encoding: 'base64', content: Buffer.from('Run npm test').toString('base64'), size: 12, html_url: 'https://github.com/example/repo/blob/main/README.md' }));
      if (path.includes('/contents/')) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({ private: false, default_branch: 'main', html_url: 'https://github.com/example/repo' }));
    };
    const result = await service().getContributionContext({ owner: 'example', repo: 'repo', issue_number: 8 });
    assert.equal(result.documents.readme.text, 'Run npm test');
    assert.equal(result.documents.contributing.found, false);
    assert.ok(result.notices.some(notice => notice.includes('No CONTRIBUTING')));
  } finally { globalThis.fetch = original; }
});

test('production plan storage defaults to the writable OS temporary directory', async () => {
  const result = await service({ NODE_ENV: 'production' }).saveWorkPlan(plan);
  const filename = join(tmpdir(), 'issuesprint', 'plans', result.filename);
  try { assert.equal(await readFile(filename, 'utf8'), result.markdown); }
  finally { await rm(filename, { force: true }); }
});

test('an unwritable explicit directory returns an actionable storage error', { skip: process.platform === 'win32' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'issuesprint-readonly-'));
  try {
    await chmod(directory, 0o500);
    await assert.rejects(
      service({ ISSUESPRINT_PLAN_DIR: join(directory, 'plans') }).saveWorkPlan(plan),
      /Plan storage is not writable.*ISSUESPRINT_PLAN_DIR/
    );
  } finally { await chmod(directory, 0o700); await rm(directory, { recursive: true, force: true }); }
});
