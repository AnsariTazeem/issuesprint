import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const directory = await mkdtemp(join(tmpdir(), 'issuesprint-smoke-'));
const transport = new StdioClientTransport({
  command: process.execPath, args: ['dist/index.js'], cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio', ISSUESPRINT_PLAN_DIR: directory, ISSUESPRINT_ALLOW_SAVE: 'true' },
  stderr: 'pipe',
});
let serverErrors = '';
transport.stderr?.on('data', chunk => { serverErrors = (serverErrors + chunk.toString()).slice(-12000); });
const client = new Client({ name: 'issuesprint-smoke', version: '1.0.0' });
const parse = result => {
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  return result.structuredContent ?? JSON.parse(result.content.find(item => item.type === 'text').text);
};
try {
  await client.connect(transport);
  console.log('Connected to MCP server.');
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['get_contribution_context', 'list_issues', 'save_work_plan']);
  console.log('Discovered all three tools.');
  const args = { owner: 'issuesprint-demo', repo: 'demo-repo' };
  const list = parse(await client.callTool({ name: 'list_issues', arguments: { ...args, skills: ['TypeScript', 'documentation'], available_minutes: 90 } }));
  assert.equal(list.issues[0].number, 101);
  console.log('Issue listing passed.');
  const context = parse(await client.callTool({ name: 'get_contribution_context', arguments: { ...args, issue_number: 101 } }));
  assert.ok(context.documents.contributing.found);
  assert.equal(context.activity.status, 'inspected');
  const existing = parse(await client.callTool({ name: 'get_contribution_context', arguments: { ...args, issue_number: 102 } }));
  assert.equal(existing.recommendation.suggested_plan, 'review-existing-pr');
  assert.equal(existing.activity.pull_requests[0].review_status, 'changes-requested-observed');
  const unlabeled = parse(await client.callTool({ name: 'get_contribution_context', arguments: { ...args, issue_number: 106 } }));
  assert.equal(unlabeled.recommendation.suggested_plan, 'implementation');
  assert.equal(unlabeled.contribution_policy.assignment, 'not-required-mentioned');
  console.log('Contribution context, existing PR, and unlabeled workflows passed.');
  const saved = parse(await client.callTool({ name: 'save_work_plan', arguments: { ...args, issue_number: 101, available_minutes: 90, summary: 'Add a contributor setup guide grounded in the README.', steps: ['Read contribution instructions.', 'Document and verify the setup commands.'], acceptance_checks: ['The guide contains verified setup steps.'] } }));
  assert.equal(saved.saved, true);
  assert.equal((await readdir(directory)).length, 1);
  console.log('Plan persistence passed.');
  let rejected = false;
  try {
    const invalid = await client.callTool({ name: 'list_issues', arguments: { ...args, limit: 0 } });
    rejected = invalid.isError === true;
  } catch (error) { rejected = /MCP error|validation|invalid/i.test(error.message); }
  assert.equal(rejected, true, 'Invalid inputs must be rejected');
  const resources = await client.listResources();
  assert.ok(resources.resources.some(resource => resource.uri === 'issuesprint://workflow'));
  const widget = await client.readResource({ uri: 'ui://widget/next-issue-results.html' });
  assert.ok(widget.contents[0].text.includes('Find your next contribution.'));
  assert.equal(/<script[^>]+src=["']\/_next/.test(widget.contents[0].text), false);
  const prompts = await client.listPrompts();
  assert.ok(prompts.prompts.some(prompt => prompt.name === 'plan_contribution'));
  const prompt = await client.getPrompt({ name: 'plan_contribution', arguments: { ...args, skills: 'TypeScript', available_minutes: '90' } });
  assert.ok(prompt.messages.length > 0);
  console.log('PASS: MCP discovery, tool chain, validation, plan persistence, bundled widget, workflow resource, and prompt.');
} catch (error) {
  console.error(serverErrors);
  throw error;
} finally {
  await client.close();
  await rm(directory, { recursive: true, force: true });
}
