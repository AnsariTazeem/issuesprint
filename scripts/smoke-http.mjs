import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn('npm', ['run', 'start:prod'], {
  detached: process.platform !== 'win32',
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'production', MCP_TRANSPORT_TYPE: 'http', PORT: String(port), HOST: '127.0.0.1', ISSUESPRINT_ALLOW_SAVE: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let errors = '';
child.stderr.on('data', chunk => { errors = (errors + chunk.toString()).slice(-6000); });
child.stdout.resume();
const client = new Client({ name: 'issuesprint-http-smoke', version: '1.0.0' });
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('HTTP server exited before startup: ' + errors);
    try {
      await fetch('http://127.0.0.1:' + port + '/mcp', { signal: AbortSignal.timeout(500) });
      ready = true; break;
    } catch { await delay(250); }
  }
  assert.ok(ready, 'HTTP server should start within ten seconds');
  await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp')));
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 3);
  const result = await client.callTool({ name: 'list_issues', arguments: { owner: 'issuesprint-demo', repo: 'demo-repo', skills: ['documentation'], limit: 1 } });
  assert.notEqual(result.isError, true);
  const data = result.structuredContent ?? JSON.parse(result.content.find(item => item.type === 'text').text);
  assert.equal(data.issues[0].number, 101);
  console.log('PASS: production start script honors PORT; HTTP discovery and issue-list execution succeed.');
} catch (error) {
  console.error(errors);
  throw error;
} finally {
  await client.close();
  if (child.exitCode === null) {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(2000)]);
    if (process.platform === 'win32') { if (child.exitCode === null) child.kill('SIGKILL'); }
    else { try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
  }
}
