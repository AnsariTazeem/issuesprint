'use client';

import { useEffect, useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import RepositoryMarkdown from './repository-markdown';
import ContributionEvidence from './contribution-evidence';
import { contributionPreview, discoveryPreview } from './contribution-preview';
import type { ActivityAssessment, ContributionPolicy, Recommendation } from '../../modules/issues/issues.context';

interface IssueCard {
  number: number; title: string; body: string; labels: string[]; url: string; assignees: string[];
  state?: string; matched_skills?: string[]; reasons?: string[]; budget_fit?: string;
  estimated_minutes?: { min: number; max: number } | null;
  availability?: { status: string; summary: string }; suitability?: { scope: string; confidence: string };
}
interface DocumentData { found: boolean; text: string; truncated: boolean; url?: string | null }
interface Result {
  kind: string; source: string; repository: { owner: string; repo: string };
  issues?: IssueCard[]; issue?: IssueCard; notices?: string[];
  filters?: { available_minutes: number; skills: string[] };
  matching_count?: number; scanned_entries?: number; scan_capped?: boolean;
  documents?: { readme: DocumentData; contributing: DocumentData; pull_request_template?: DocumentData; issue_template?: DocumentData };
  activity?: ActivityAssessment; contribution_policy?: ContributionPolicy; recommendation?: Recommendation; strategy?: string;
  markdown?: string; filename?: string;
}

const preview: Result = discoveryPreview;
const css = `
*{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit}
.sprint{--bg:#0d121b;--panel:#161e2b;--ink:#edf3fc;--muted:#9eacc0;--line:#2b3749;--accent:#9be7c4;background:var(--bg);color:var(--ink);font:14px/1.6 system-ui,sans-serif;padding:28px;min-height:360px}
.sprint.light{--bg:#f4f7fb;--panel:#fff;--ink:#172436;--muted:#586b82;--line:#d6e0ec;--accent:#087b58}
.wrap{max-width:980px;margin:auto}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid var(--line);padding-bottom:22px;margin-bottom:26px}.brand{font-weight:800;letter-spacing:-.8px;font-size:24px}.brand b{color:var(--accent)}.eyebrow{color:var(--accent);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700}.pill{border:1px solid var(--line);border-radius:30px;padding:4px 11px;font-size:11px;font-weight:600}.demo{color:#edba74}.muted{color:var(--muted)}h1{font-size:30px;line-height:1.2;letter-spacing:-1px;margin:8px 0 12px}h2{font-size:19px;line-height:1.4;margin:8px 0 12px}p{margin:8px 0 15px}.grid{display:grid;gap:16px}.card{background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:22px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.tags{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}.tag{font-size:11px;background:var(--bg);border-radius:5px;padding:3px 8px;color:var(--muted)}.reason{font-size:12px;color:var(--muted);margin:4px 0}.action{background:var(--accent);color:#102c22;border:0;border-radius:7px;padding:10px 15px;font-weight:700;cursor:pointer}.light .action{color:white}.secondary{background:transparent;color:var(--ink);border:1px solid var(--line)}button:disabled{opacity:.5;cursor:default}.note{padding:12px 16px;border-left:2px solid var(--line);font-size:12px;color:var(--muted);margin:18px 0}.error{color:#ef9c9c;border:1px solid #6b3030;padding:14px;border-radius:8px;margin:12px 0}.docs{display:grid;grid-template-columns:1fr 1fr;gap:15px}pre{font:12px/1.7 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto}details summary{cursor:pointer;font-weight:650}label{display:block;font-size:12px;font-weight:650;margin:14px 0 6px}input,textarea,select{width:100%;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:10px}textarea{min-height:85px}a{color:var(--accent)}.footer{margin-top:26px;color:var(--muted);font-size:11px;border-top:1px solid var(--line);padding-top:15px}@media(max-width:600px){.sprint{padding:17px}.docs{grid-template-columns:1fr}h1{font-size:25px}.card{padding:17px}}

.repository-markdown{color:var(--ink);line-height:1.75;overflow-wrap:anywhere;min-width:0;font-size:14px}
.repository-markdown>:first-child{margin-top:0}.repository-markdown>:last-child{margin-bottom:0}
.repository-markdown h1,.repository-markdown h2,.repository-markdown h3,.repository-markdown h4{line-height:1.35;letter-spacing:normal;margin:22px 0 10px}
.repository-markdown h1{font-size:24px}.repository-markdown h2{font-size:20px;border-bottom:1px solid var(--line);padding-bottom:8px}.repository-markdown h3{font-size:17px}
.repository-markdown p{margin:10px 0}.repository-markdown ul,.repository-markdown ol{padding-left:24px;margin:12px 0}.repository-markdown li{margin:6px 0}
.repository-markdown blockquote{margin:14px 0;padding:2px 16px;border-left:3px solid var(--accent);color:var(--muted)}
.repository-markdown code{font:12px/1.65 ui-monospace,monospace;background:var(--bg);border:1px solid var(--line);padding:2px 5px;border-radius:4px;overflow-wrap:anywhere}
.repository-markdown pre{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:14px;max-height:300px;overflow:auto;white-space:pre;overflow-wrap:normal}
.repository-markdown pre code{background:transparent;border:0;padding:0;white-space:pre}
.repository-markdown table{border-collapse:collapse;display:block;max-width:100%;overflow:auto;margin:14px 0;font-size:12px}.repository-markdown th,.repository-markdown td{border:1px solid var(--line);padding:8px 11px;text-align:left}.repository-markdown th{background:var(--bg)}
.repository-markdown img{display:block;max-width:100%;max-height:180px;object-fit:contain;margin:14px 0}.repository-markdown a{overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:3px}
.repository-markdown input[type=checkbox]{width:auto;margin:0 8px 0 0;accent-color:var(--accent)}
.repository-markdown hr{border:0;border-top:1px solid var(--line);margin:20px 0}.repository-markdown.compact{font-size:13px;color:var(--muted);max-height:250px;overflow:auto;margin:12px 0}.repository-markdown.compact h1,.repository-markdown.compact h2,.repository-markdown.compact h3{font-size:15px;margin:12px 0 8px}
.document-body{max-height:480px;overflow:auto;margin-top:18px;padding-right:8px;min-width:0}.docs>.card{min-width:0}.document-source{display:block;font-size:12px;margin-top:14px}
.evidence-workspace{margin-top:16px}.evidence-recommendation{border-color:var(--accent)}.evidence-item{padding:18px 0;border-top:1px solid var(--line)}.evidence-quote{border-left:2px solid var(--line);padding:5px 14px;margin:16px 0;font-size:12px}.evidence-quote blockquote{margin:6px 0;white-space:pre-wrap}.evidence-item h3{font-size:15px;line-height:1.5}.availability-unchecked{display:inline-block;color:#edba74;margin-bottom:8px}.evidence-workspace a{font-size:12px}
.demo-scenarios{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:24px}.demo-scenarios button{font-size:11px;padding:7px 10px}
`;

function unpack(value: unknown): Result {
  const response = value as { structuredContent?: Result; content?: { type: string; text?: string }[]; isError?: boolean };
  if (response.isError) throw new Error(response.content?.find(c => c.type === 'text')?.text || 'Tool execution failed.');
  if (response.structuredContent) return response.structuredContent;
  const text = response.content?.find(c => c.type === 'text')?.text;
  if (text) return JSON.parse(text) as Result;
  return value as Result;
}

export default function IssueResults({ browserPreview = false }: { browserPreview?: boolean }) {
  const sdk = useWidgetSDK();
  const theme = useTheme();
  const hostData = sdk.getToolOutput<Result>();
  const [screen, setScreen] = useState<Result | null>(null);
  const [previewMode, setPreviewMode] = useState(browserPreview);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [steps, setSteps] = useState('Read the issue acceptance criteria and contribution instructions.\nReproduce the problem or identify the documentation gap.\nMake the smallest focused change and add relevant regression coverage.\nRun the checks documented by the repository and review the diff.');
  const [checks, setChecks] = useState('The issue acceptance criteria are satisfied.\nThe repository documented checks pass.');
  const [minutes, setMinutes] = useState(90);
  const [strategy, setStrategy] = useState('follow-recommendation');
  const [coordinationNote, setCoordinationNote] = useState('');

  useEffect(() => {
    const scenario = new URLSearchParams(window.location.search).get('preview');
    if (scenario) setPreviewMode(true);
    if (scenario === 'pr') setScreen(contributionPreview(102));
    if (scenario === 'unlabeled') setScreen(contributionPreview(106));
    if (scenario === 'claim') setScreen(contributionPreview(103));
  }, []);
  useEffect(() => { if (hostData?.kind) { setScreen(hostData); setPreviewMode(false); } }, [hostData]);
  const data = screen || (previewMode ? preview : null);
  const connected = sdk.isReady && !previewMode;
  useEffect(() => {
    if (data?.kind === 'contribution-context') {
      setStrategy('follow-recommendation'); setCoordinationNote(''); setSummary('');
    }
  }, [data?.kind, data?.repository.owner, data?.repository.repo, data?.issue?.number]);
  useEffect(() => {
    if (data?.kind !== 'contribution-context') return;
    const effectiveStrategy = strategy === 'follow-recommendation' ? data.recommendation?.suggested_plan : strategy;
    if (effectiveStrategy === 'review-existing-pr') {
      setSteps('Read the referenced PR scope, discussion, and review feedback.\nCoordinate with the PR author before proposing changes or duplicate implementation.\nReproduce a review concern or inspect the relevant tests.\nShare concrete findings or propose agreed changes; report only checks actually run.');
      setChecks('The proposed help addresses specific PR feedback.\nThe existing author and repository process are respected.');
    } else if (effectiveStrategy === 'coordination') {
      setSteps('Read the repository guidance and existing-work evidence.\nClarify whether the proposed contribution is wanted and whether someone is already working on it.\nCoordinate a focused scope with the relevant contributor or maintainer when appropriate.\nRecord implementation or review steps after the scope is agreed.');
      setChecks('The next action follows applicable repository guidance.\nExisting work is not duplicated without coordination.');
    } else {
      setSteps('Read the issue criteria and applicable contribution guidance.\nVerify that no competing work has appeared since inspection.\nMake a focused implementation and add relevant regression coverage.\nRun the repository documented checks and review the diff.');
      setChecks('The issue acceptance criteria are satisfied.\nOnly checks actually performed are reported.');
    }
  }, [data?.kind, data?.repository.owner, data?.repository.repo, data?.issue?.number, data?.recommendation?.suggested_plan, strategy]);
  async function call(name: string, args: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      const next = unpack(await sdk.callTool(name, args));
      if (!next?.kind) throw new Error('The tool returned an unexpected response.');
      setScreen(next);
    } catch (err) { setError(err instanceof Error ? err.message : 'Tool failed.'); }
    finally { setBusy(false); }
  }
  function readContext(issue: IssueCard) {
    if (!data) return;
    setSummary(''); setMinutes(data.filters?.available_minutes || 90);
    return call('get_contribution_context', { ...data.repository, issue_number: issue.number });
  }
  return <main className={'sprint ' + (theme === 'light' ? 'light' : '')}>
    {/* Static application CSS only; repository HTML is sanitized separately. */}
    <style dangerouslySetInnerHTML={{ __html: css }} />
    <div className="wrap">
      <header className="top"><div className="brand">Issue<b>Sprint</b><div className="eyebrow">From open issue to first step</div></div><span className={'pill ' + (data?.source === 'demo' ? 'demo' : '')}>{data ? (data.source === 'demo' ? 'DEMO DATA' : 'GITHUB LIVE') : 'MCP WORKSPACE'}</span></header>
      {previewMode && <nav className="demo-scenarios" aria-label="Fictional demo scenarios"><span className="muted">Preview scenarios:</span><button className="action secondary" onClick={() => setScreen(null)}>Discovery</button><button className="action secondary" onClick={() => setScreen(contributionPreview(102))}>Existing PR</button><button className="action secondary" onClick={() => setScreen(contributionPreview(106))}>Unlabeled issue</button><button className="action secondary" onClick={() => setScreen(contributionPreview(103))}>Work claim</button></nav>}
      {!data ? <section className="card"><h1>Ready when your tools are.</h1><p className="muted">Run list_issues in NitroStudio to receive repository results. This standalone page has no host tool output.</p><button className="action" onClick={() => setPreviewMode(true)}>Explore sample preview</button></section> : <>
        <div className="eyebrow">{data.repository.owner} / {data.repository.repo}</div>
        <h1>{data.kind === 'issue-list' ? 'Find your next contribution.' : data.kind === 'contribution-context' ? 'Understand before you start.' : 'Your next steps, saved.'}</h1>
        {error && <div role="alert" className="error">{error}</div>}
        {data.kind === 'issue-list' && <>
          <p className="muted">{data.filters?.available_minutes} minute budget · {data.filters?.skills.join(', ') || 'All skills'} · {data.matching_count} matches in {data.scanned_entries} scanned entries</p>
          <div className="grid">{data.issues?.map(issue => <article className="card" key={issue.number}>
            <div className="row"><span className="muted">ISSUE #{issue.number}</span><span className="pill">{issue.estimated_minutes ? `${issue.estimated_minutes.min}-${issue.estimated_minutes.max} min · tentative` : 'Scope not estimated'}</span></div>
            <h2>{issue.title}</h2><span className="pill availability-unchecked">Availability unchecked</span><RepositoryMarkdown text={issue.body} baseUrl={"https://github.com/" + data.repository.owner + "/" + data.repository.repo + "/blob/HEAD/"} compact />
            <div className="tags">{issue.labels.map(label => <span className="tag" key={label}>{label}</span>)}</div>
            {issue.reasons?.map(reason => <p className="reason" key={reason}>{reason}</p>)}
            <div className="row" style={{ marginTop: 18 }}><span className="muted">{issue.budget_fit?.replace(/-/g, ' ')}</span><button className="action" disabled={!connected || busy} onClick={() => readContext(issue)}>{busy ? 'Inspecting…' : 'Check activity and contribution process'}</button></div>
          </article>)}</div>
          {!data.issues?.length && <div className="card"><h2>No matching issues</h2><p className="muted">Relax the beginner or assignee filter and try again. The repository may also have no open issues.</p></div>}
        </>}
        {data.kind === 'contribution-context' && data.issue && <>
          <section className="card"><div className="row"><span className="pill">#{data.issue.number} · {data.issue.state || 'issue'}</span>{data.source !== 'demo' && /^https:\/\/github\.com\//.test(data.issue.url) && <a href={data.issue.url} target="_blank" rel="noreferrer">Open source issue ↗</a>}</div><h2>{data.issue.title}</h2><RepositoryMarkdown text={data.issue.body} baseUrl={"https://github.com/" + data.repository.owner + "/" + data.repository.repo + "/blob/HEAD/"} /></section>
          {data.activity && data.contribution_policy && data.recommendation && <ContributionEvidence activity={data.activity} policy={data.contribution_policy} recommendation={data.recommendation} />}
          <div className="docs" style={{ marginTop: 16 }}>{(['readme', 'contributing', 'pull_request_template', 'issue_template'] as const).map(key => <details className="card" key={key}><summary>{{ readme: 'Repository README', contributing: 'Contribution instructions', pull_request_template: 'Pull request template', issue_template: 'Issue template / configuration' }[key]}</summary><div className="document-body"><RepositoryMarkdown text={data.documents?.[key]?.found ? data.documents[key]!.text : 'Document not found. Ask the maintainer for guidance.'} baseUrl={data.documents?.[key]?.url || "https://github.com/" + data.repository.owner + "/" + data.repository.repo + "/blob/HEAD/"} /></div>{data.documents?.[key]?.url && <a className="document-source" href={data.documents[key]!.url!} target="_blank" rel="noopener noreferrer">Open full source document ↗</a>}{data.documents?.[key]?.truncated && <p className="muted">Excerpt truncated; consult the source document.</p>}</details>)}</div>
          <section className="card" style={{ marginTop: 16 }}><h2>Prepare the appropriate contribution plan</h2><p className="muted">Choose implementation, helping an existing PR, or coordination based on the inspected evidence. Saving does not reserve an issue or make GitHub changes.</p>
            <label htmlFor="strategy">Contribution strategy</label><select id="strategy" value={strategy} onChange={e => setStrategy(e.target.value)}><option value="follow-recommendation">Follow recommendation ({data.recommendation?.suggested_plan || 'coordination'})</option><option value="implementation">New implementation</option><option value="review-existing-pr">Help or review an existing PR</option><option value="coordination">Clarify scope / coordinate first</option></select>
            {strategy === 'implementation' && data.recommendation?.suggested_plan !== 'implementation' && <><p className="note">Existing work or uncertainty was found. Explain why you intentionally plan implementation. This note is not proof of maintainer approval.</p><label htmlFor="coordination-note">Coordination or scope explanation</label><textarea id="coordination-note" value={coordinationNote} onChange={e => setCoordinationNote(e.target.value)} maxLength={1000} /></>}
            <label htmlFor="summary">Your proposed approach</label><textarea id="summary" value={summary} onChange={e => setSummary(e.target.value)} maxLength={1500} placeholder="Describe a specific approach grounded in the issue and repository instructions." />
            <label htmlFor="minutes">Available minutes</label><input id="minutes" type="number" min={15} max={480} value={minutes} onChange={e => setMinutes(Number(e.target.value))} />
            <label htmlFor="steps">Steps, one per line</label><textarea id="steps" value={steps} onChange={e => setSteps(e.target.value)} />
            <label htmlFor="checks">Acceptance checks, one per line</label><textarea id="checks" value={checks} onChange={e => setChecks(e.target.value)} />
            <button className="action" style={{ marginTop: 18 }} disabled={!connected || busy || summary.trim().length < 10 || steps.split('\n').filter(v => v.trim()).length < 2 || !checks.trim() || minutes < 15 || minutes > 480 || (strategy === 'implementation' && data.recommendation?.suggested_plan !== 'implementation' && coordinationNote.trim().length < 10)} onClick={() => call('save_work_plan', { ...data.repository, issue_number: data.issue!.number, available_minutes: minutes, strategy, ...(coordinationNote.trim().length >= 10 ? { coordination_note: coordinationNote.trim() } : {}), summary, steps: steps.split('\n').map(v => v.trim()).filter(Boolean), acceptance_checks: checks.split('\n').map(v => v.trim()).filter(Boolean) })}>{busy ? 'Saving…' : 'Approve and save work plan'}</button>
          </section>
        </>}
        {data.kind === 'work-plan' && <section className="card"><span className="pill">SAVED · {data.filename}</span><h2>{data.issue?.title}</h2><p className="muted">Keep a copy of this Markdown. Hosted filesystem storage can be temporary.</p><RepositoryMarkdown text={data.markdown || ''} baseUrl={"https://github.com/" + data.repository.owner + "/" + data.repository.repo + "/blob/HEAD/"} /><details style={{ margin: '18px 0' }}><summary>View raw Markdown</summary><pre tabIndex={0}>{data.markdown}</pre></details><button className="action secondary" onClick={async () => { try { await navigator.clipboard.writeText(data.markdown || ''); } catch { setError('Clipboard unavailable. Select and copy the Markdown above.'); } }}>Copy Markdown</button></section>}
        {data.notices?.map(notice => <div className="note" key={notice}>{notice}</div>)}
        {previewMode && <p className="muted">Preview only. Context and save actions become available when connected through NitroStudio.</p>}
      </>}
      <footer className="footer">Discover → inspect context → approve a plan · Rankings are explainable heuristics, never guarantees.</footer>
    </div>
  </main>;
}
