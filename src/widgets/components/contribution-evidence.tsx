'use client';

import type { ActivityAssessment, ContributionPolicy, Recommendation } from '../../modules/issues/issues.context';
import RepositoryMarkdown from './repository-markdown';

const isGitHub = (url: string | null | undefined) => Boolean(url && /^https:\/\/github\.com\//.test(url));
const words = (text: string) => text.replace(/-/g, ' ');

export default function ContributionEvidence({ activity, policy, recommendation }: {
  activity: ActivityAssessment; policy: ContributionPolicy; recommendation: Recommendation;
}) {
  return <section className="evidence-workspace" aria-label="Contribution availability and repository guidance">
    <article className="card evidence-recommendation">
      <div className="row"><span className="eyebrow">Evidence before investment</span><span className="pill">{words(activity.status)} coverage</span></div>
      <h2>{recommendation.title}</h2>
      <p>{recommendation.reason}</p>
      <div className="row"><span className="tag">Suggested plan: {words(recommendation.suggested_plan)}</span><span className="muted">Inspected {new Date(activity.checked_at).toLocaleString()}</span></div>
      <p className="reason">This is a limited-evidence recommendation, not a reservation or a guarantee that work is available.</p>
    </article>

    <div className="docs" style={{ marginTop: 16 }}>
      <section className="card">
        <h2>Existing PR evidence</h2>
        <p className="muted">{activity.pull_requests.length} inspected of {activity.referenced_prs_found} references found · {activity.timeline_entries_scanned} timeline events scanned</p>
        {!activity.pull_requests.length && <p className="reason">{activity.status === 'inspected' && activity.prs_complete ? 'No referenced PR was found in the inspected evidence. Unlinked or private work may still exist.' : 'PR evidence is missing or incomplete. Do not interpret this as no existing work.'}</p>}
        {activity.pull_requests.map(pr => <article className="evidence-item" key={pr.repository + pr.number}>
          <div className="row"><span className="pill">PR #{pr.number} · {pr.merged ? 'merged' : pr.state}{pr.draft ? ' · draft' : ''}</span><span className="tag">{words(pr.review_status)}</span></div>
          <h3>{pr.title}</h3>
          <p className="reason">{pr.repository} · by {pr.author} · updated {new Date(pr.updated_at).toLocaleDateString()}</p>
          <p className="reason">{pr.relationship === 'closing-reference-in-body' ? 'A closing reference was observed in the PR body; correctness and completeness are not verified.' : 'This PR references the issue. That alone does not establish that it addresses the same scope.'}</p>
          {isGitHub(pr.url) && <a href={pr.url} target="_blank" rel="noopener noreferrer">Inspect PR on GitHub ↗</a>}
          {pr.error && <p className="note">Some review data could not be retrieved: {pr.error}</p>}
          {pr.reviews.length > 0 && <details style={{ marginTop: 12 }}><summary>Review feedback ({pr.reviews.length} excerpts)</summary>{pr.reviews.map((review, i) => <div className="evidence-quote" key={review.url + i}>
            <p className="reason">{review.author} · {review.association} · {review.state}{review.submitted_at ? ' · ' + new Date(review.submitted_at).toLocaleDateString() : ''}</p>
            <RepositoryMarkdown text={review.body || 'No written feedback.'} baseUrl={pr.url} />
            {isGitHub(review.url) && <a href={review.url} target="_blank" rel="noopener noreferrer">Review source ↗</a>}
          </div>)}</details>}
          <p className="reason">Review states are evidence, not an automatic judgment of code quality, AI authorship, or abandonment. CI and code diffs were not inspected.</p>
        </article>)}
      </section>

      <section className="card">
        <h2>Repository-specific process</h2>
        <p className="muted">{words(policy.status)} · interpret source excerpts in context</p>
        <div className="tags"><span className="tag">Assignment: {words(policy.assignment)}</span><span className="tag">PR process: {words(policy.process)}</span></div>
        {!policy.evidence.length && <p className="reason">No explicit process signals were detected in the inspected text. This does not mean no rules exist. Read the full guidance and linked documents.</p>}
        {policy.evidence.map((item, i) => <div className="evidence-quote" key={item.document + i}>
          <p className="reason">{item.document} · {words(item.topic)}{item.conditional ? ' · conditional wording' : ''}</p>
          <blockquote>{item.excerpt}</blockquote>
          {isGitHub(item.url) && <a href={item.url!} target="_blank" rel="noopener noreferrer">Read guidance source ↗</a>}
        </div>)}
        {policy.linked_guides.length > 0 && <details><summary>Linked guides to review</summary><ul>{policy.linked_guides.map(guide => <li key={guide.url}><a href={guide.url} target="_blank" rel="noopener noreferrer">{guide.title} ↗</a></li>)}</ul><p className="reason">These links were discovered, not fetched or fully interpreted.</p></details>}
      </section>
    </div>

    {activity.possible_claims.length > 0 && <section className="card" style={{ marginTop: 16 }}>
      <h2>Possible work claims in discussion</h2><p className="muted">These may be old statements or requests, not confirmed ownership. Check the source and coordinate.</p>
      {activity.possible_claims.map((comment, i) => <div className="evidence-quote" key={comment.url + i}>
        <p className="reason">{comment.author} · {comment.association} · updated {comment.updated_at ? new Date(comment.updated_at).toLocaleDateString() : 'unknown'}</p>
        <RepositoryMarkdown text={comment.body} baseUrl={comment.url} />
        {isGitHub(comment.url) && <a href={comment.url} target="_blank" rel="noopener noreferrer">Discussion source ↗</a>}
      </div>)}
    </section>}

    <details className="card" style={{ marginTop: 16 }}><summary>Coverage limits and uncertainty</summary>
      {[...activity.notices, ...policy.caveats].map((notice, i) => <p className="reason" key={i}>{notice}</p>)}
      {!activity.timeline_complete && <p className="note">Timeline inspection is incomplete. Later or unread events may change the recommendation.</p>}
      {!activity.prs_complete && <p className="note">Some referenced PRs or review histories were not fully inspected.</p>}
    </details>
  </section>;
}
