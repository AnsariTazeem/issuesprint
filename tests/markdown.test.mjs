import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const directory = await mkdtemp(join(tmpdir(), 'issuesprint-markdown-'));
const bundle = join(directory, 'renderer.cjs');
await build({
  stdin: {
    contents: `import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RepositoryMarkdown, { resolveContentUrl } from './components/repository-markdown';
import IssueResults, { IssueOverview, unpackToolResult } from './components/issue-results';
import ContributionEvidence from './components/contribution-evidence';
import { contributionPreview } from './components/contribution-preview';
export { resolveContentUrl, unpackToolResult };
export function renderOverview() {
  const context = contributionPreview(102);
  return renderToStaticMarkup(React.createElement(IssueOverview, { issue: context.issue, repository: context.repository, source: context.source }));
}
export function renderEvidence(partial = false) {
  const context = contributionPreview(102);
  if (partial) {
    context.activity = { ...context.activity, status: 'partial', timeline_complete: false };
    context.contribution_policy = { ...context.contribution_policy, status: 'conflicting-signals' };
  }
  return renderToStaticMarkup(React.createElement(ContributionEvidence, {
    activity: context.activity, policy: context.contribution_policy, recommendation: context.recommendation
  }));
}
export function renderPreview() { return renderToStaticMarkup(React.createElement(IssueResults, { browserPreview: true })); }
export function render(text, baseUrl) { return renderToStaticMarkup(React.createElement(RepositoryMarkdown, { text, baseUrl })); }`,
    resolveDir: resolve('src/widgets'), loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
  outfile: bundle, logLevel: 'silent',
});
const { render, resolveContentUrl, renderPreview, renderEvidence, renderOverview, unpackToolResult } = createRequire(import.meta.url)(bundle);
after(() => rm(directory, { recursive: true, force: true }));
const source = 'https://github.com/example/repo/blob/main/docs/README.md';

test('Markdown renders headings, emphasis, fenced code, and GitHub tables', () => {
  const html = render('# Setup\n\n**Important:** use `npm ci`.\n\n```sh\nnpm test\n```\n\n| Check | Command |\n| --- | --- |\n| Tests | npm test |', source);
  assert.match(html, /<h1>Setup<\/h1>/);
  assert.match(html, /<strong>Important:<\/strong>/);
  assert.match(html, /<code>npm ci<\/code>/);
  assert.match(html, /<pre><code class="language-sh">npm test/);
  assert.match(html, /<table>/);
});

test('README embedded HTML renders readable structure without displaying raw tags', () => {
  const html = render('<div align="center">\n<h1>Example project</h1>\n<p><strong>Contributor guide</strong></p>\n</div>', source);
  assert.match(html, /<h1>Example project<\/h1>/);
  assert.match(html, /<strong>Contributor guide<\/strong>/);
  assert.doesNotMatch(html, /&lt;div|&lt;h1/);
});

test('untrusted HTML cannot add scripts, frames, event handlers, or executable links', () => {
  const html = render('<script>alert("unsafe")</script>\n<iframe src="https://example.com"></iframe>\n<img src="logo.png" onerror="alert(1)">\n<a href="javascript:alert(1)">unsafe</a>\n\n[also unsafe](javascript:alert%281%29)', source);
  assert.doesNotMatch(html, /<script|<iframe|onerror|javascript:/i);
  assert.match(html, /unsafe/);
});

test('repository-relative links and images resolve to GitHub source URLs', () => {
  const html = render('[Setup](./setup.md)\n\n![Logo](../logo.png)', source);
  assert.match(html, /href="https:\/\/github.com\/example\/repo\/blob\/main\/docs\/setup.md"/);
  assert.match(html, /src="https:\/\/raw.githubusercontent.com\/example\/repo\/main\/logo.png"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.equal(resolveContentUrl('javascript:alert(1)', source), '');
  assert.equal(resolveContentUrl('data:text/html,unsafe', source), '');
  assert.equal(resolveContentUrl('file:///etc/passwd', source), '');
  assert.equal(resolveContentUrl('mailto:maintainer@example.com', source, true), '');
});

test('GitHub task lists render disabled checkboxes', () => {
  const html = render('- [x] Read the guide\n- [ ] Run checks', source);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /checked=""/);
});


test('browser preview emits literal static CSS without escaped hydration differences', () => {
  const html = renderPreview();
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  assert.ok(style);
  assert.ok(style.includes('.repository-markdown>:first-child'));
  assert.doesNotMatch(style, /&gt;|&lt;/);
});

test('incomplete checks and conflicting guidance remain visible', () => {
  const html = renderEvidence(true);
  const visible = html.replace(/<details[\s\S]*?<\/details>/g, '');
  assert.match(visible, /Checks are incomplete/);
  assert.match(visible, /Contribution instructions conflict/);
  assert.match(visible, /Changes requested/);
  assert.match(visible, /Fix issue-filter keyboard navigation/);
});

test('supporting sources remain available without exposing internal status names', () => {
  const html = renderEvidence();
  assert.doesNotMatch(html, /<details|<summary/);
  assert.match(html, /Please preserve focus/);
  assert.match(html, /You may submit a pull request directly/);
  assert.doesNotMatch(html, /changes-requested-observed|direct-pr-mentioned|not-required-mentioned/);
});

test('the issue overview shows the full description without an expansion control', () => {
  const html = renderOverview();
  assert.match(html, /The filter dropdown cannot be reached reliably by keyboard/);
  assert.match(html, /read its review feedback before starting another implementation/);
  assert.match(html, /Issue properties/);
  assert.doesNotMatch(html, /<details|<summary/);
});

test('tool errors remain readable instead of becoming JSON parse errors', () => {
  const message = 'Plan storage is not writable. Configure ISSUESPRINT_PLAN_DIR.';
  assert.throws(() => unpackToolResult({ content: [{ type: 'text', text: message }] }), { message });
  assert.throws(() => unpackToolResult({ isError: true, content: [{ type: 'text', text: message }] }), { message });
  assert.equal(unpackToolResult({ structuredContent: { kind: 'work-plan', saved: true } }).saved, true);
});
