'use client';

import type { ActivityAssessment, ContributionPolicy, Recommendation } from '../../modules/issues/issues.context';
import RepositoryMarkdown from './repository-markdown';

const isGitHub = (url: string | null | undefined) => Boolean(url && /^https:\/\/github\.com\//.test(url));
const date = (value: string) => new Date(value).toLocaleDateString();
const reviewLabels = { 'changes-requested-observed': 'Changes requested', 'approval-observed': 'Approved', 'no-decision-observed': 'No review decision found', unknown: 'Reviews unavailable' };
const stateLabels: Record<string, string> = { APPROVED: 'Approved', CHANGES_REQUESTED: 'Changes requested', COMMENTED: 'Commented', DISMISSED: 'Dismissed' };
const nextSteps: Record<Recommendation['action'], { title: string; text: string }> = {
  'inspect-existing-pr': { title: 'Review the existing PR first', text: 'Check its scope and feedback before starting another implementation.' },
  'coordinate-existing-work': { title: 'Coordinate before starting', text: 'Someone may already be working on this issue. Check whether their plans are still current.' },
  'review-closed-pr-history': { title: 'Check the previous PR outcome', text: 'Read why it closed and confirm what work remains.' },
  'follow-repository-process': { title: 'Follow the repository’s contribution process', text: 'No competing work was found in the checked activity. Confirm the guidance applies to your change.' },
  'confirm-before-starting': { title: 'Confirm the contribution process', text: 'Read the repository instructions before starting.' },
  'investigate-unknown': { title: 'Check the missing information first', text: 'Activity or contribution rules could not be fully confirmed.' },
  'choose-another-issue': { title: 'Choose an open issue', text: 'This issue is closed. Check with a maintainer if you believe work remains.' },
};

export default function ContributionEvidence({ activity, policy, recommendation }: {
  activity: ActivityAssessment; policy: ContributionPolicy; recommendation: Recommendation;
}) {
  const incomplete = activity.status !== 'inspected' || !activity.timeline_complete || !activity.prs_complete || !policy.documents_complete;
  const next = nextSteps[recommendation.action];
  const guidance = policy.evidence.filter((item, index, all) => all.findIndex(other => other.excerpt === item.excerpt && other.document === item.document) === index);
  return <section className="evidence-workspace" aria-label="Contribution availability and repository guidance">
    <article className="next-step">
      <div><span className="eyebrow">Next step</span><h2>{next.title}</h2><p>{next.text}</p></div>
      <a className="action" href="#contribution-plan">Prepare a plan ↓</a>
    </article>
    {incomplete && <p className="note">Checks are incomplete. Missing information does not mean the issue is available.</p>}
    {policy.status === 'conflicting-signals' && <p className="note">Contribution instructions conflict. Confirm which rule applies before starting.</p>}

    <div className="context-columns">
      <section className="card">
        <h2>Related pull requests</h2>
        {!activity.pull_requests.length && <p className="muted">{activity.status === 'inspected' && activity.prs_complete ? 'No linked PR found. Unlinked work may still exist.' : 'PR activity could not be fully checked.'}</p>}
        {activity.pull_requests.map(pr => <article className="pr-item" key={pr.repository + pr.number}>
          <div className="row"><span className="pill">{pr.merged ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed'}{pr.draft ? ' · Draft' : ''}</span><span className="tag">{reviewLabels[pr.review_status]}</span></div>
          <h3>{isGitHub(pr.url) ? <a href={pr.url} target="_blank" rel="noopener noreferrer">#{pr.number} {pr.title} ↗</a> : <>#{pr.number} {pr.title}</>}</h3>
          <p className="reason">{pr.author} · Updated {date(pr.updated_at)}</p>
          {pr.reviews.slice(-2).map((review, i) => <div className="review-feedback" key={review.url + i}>
            <p className="reason">{review.author} · {stateLabels[review.state] || 'Review'}{review.submitted_at ? ' · ' + date(review.submitted_at) : ''}{isGitHub(review.url) && <> · <a href={review.url} target="_blank" rel="noopener noreferrer">Source ↗</a></>}</p>
            <RepositoryMarkdown text={review.body || 'No written feedback.'} baseUrl={pr.url} />
          </div>)}
          {pr.reviews.length > 2 && isGitHub(pr.url) && <a className="reason" href={pr.url} target="_blank" rel="noopener noreferrer">Read all feedback on GitHub ↗</a>}
          {pr.error && <p className="note">Some review information is unavailable.</p>}
        </article>)}
        {activity.possible_claims.length > 0 && <section className="work-claims">
          <h3>Work mentioned in discussion</h3>
          {activity.possible_claims.slice(0, 3).map((comment, i) => <div className="review-feedback" key={comment.url + i}>
            <p className="reason">{comment.author}{comment.updated_at ? ' · ' + date(comment.updated_at) : ''}{isGitHub(comment.url) && <> · <a href={comment.url} target="_blank" rel="noopener noreferrer">Discussion ↗</a></>}</p>
            <RepositoryMarkdown text={comment.body} baseUrl={comment.url} />
          </div>)}
          <p className="reason">Confirm whether these comments are still current.</p>
          {activity.possible_claims.length > 3 && <p className="reason">More work claims were found; review the full issue discussion.</p>}
        </section>}
      </section>
      <aside className="card">
        <h2>Contribution requirements</h2>
        {!guidance.length && <p className="muted">No clear process found. Check CONTRIBUTING or the README before starting.</p>}
        {guidance.map((item, i) => <div className="guidance-item" key={item.document + i}>
          <blockquote>{item.excerpt}</blockquote>
          <p className="reason">{isGitHub(item.url) ? <a href={item.url!} target="_blank" rel="noopener noreferrer">{item.document} ↗</a> : item.document}{item.conditional ? ' · Applies under specific conditions' : ''}</p>
        </div>)}
        {policy.linked_guides.length > 0 && <div className="source-links">{policy.linked_guides.map(guide => <a href={guide.url} key={guide.url} target="_blank" rel="noopener noreferrer">{guide.title} ↗</a>)}<p className="reason">Additional guides were linked but not checked.</p></div>}
      </aside>
    </div>
    <p className="check-summary">Checked {date(activity.checked_at)}. PR references and reviews do not verify a fix; unlinked work may exist.</p>
  </section>;
}
