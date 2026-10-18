import type { Issue } from './issues.schemas.js';

export interface SourceDocument {
  found: boolean; path: string | null; url: string | null; text: string; truncated: boolean;
  notice?: string; error?: string; origin?: string;
}
export interface PolicyEvidence {
  topic: 'assignment' | 'direct-pr' | 'discussion';
  excerpt: string; document: string; url: string | null; conditional: boolean;
}
export interface ContributionPolicy {
  status: 'signals-found' | 'unclear' | 'conflicting-signals';
  assignment: 'not-required-mentioned' | 'required-mentioned' | 'conditional-or-unclear';
  process: 'direct-pr-mentioned' | 'discussion-first-mentioned' | 'conditional-or-unclear';
  documents_complete: boolean; evidence: PolicyEvidence[]; linked_guides: { title: string; url: string }[]; caveats: string[];
}
export interface DiscussionComment {
  author: string; association: string; body: string; url: string; updated_at: string;
}
export interface PullRequestEvidence {
  number: number; repository: string; title: string; url: string; state: 'open' | 'closed';
  merged: boolean; draft: boolean; author: string; updated_at: string;
  relationship: 'closing-reference-in-body' | 'timeline-reference';
  review_status: 'changes-requested-observed' | 'approval-observed' | 'no-decision-observed' | 'unknown';
  reviews: { author: string; association: string; state: string; body: string; url: string; submitted_at: string | null }[];
  reviews_complete: boolean; error?: string;
}
export interface ActivityAssessment {
  status: 'inspected' | 'partial' | 'unknown';
  checked_at: string; timeline_entries_scanned: number; timeline_complete: boolean;
  referenced_prs_found: number; prs_complete: boolean; pull_requests: PullRequestEvidence[];
  comments: DiscussionComment[]; possible_claims: DiscussionComment[];
  notices: string[];
}
export interface Recommendation {
  action: 'inspect-existing-pr' | 'coordinate-existing-work' | 'review-closed-pr-history' | 'follow-repository-process' | 'confirm-before-starting' | 'investigate-unknown' | 'choose-another-issue';
  title: string; reason: string; suggested_plan: 'implementation' | 'review-existing-pr' | 'coordination';
  confidence: 'limited-evidence'; availability: string;
}

export function parseGitHubApiReference(raw: string, kind: 'pulls' | 'contents') {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.hostname !== 'api.github.com' || url.username || url.password || url.port || url.search || url.hash) return null;
    const match = url.pathname.match(/^\/repos\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/(pulls|contents)\/(.+)$/);
    if (!match || match[3] !== kind || match[2] === '.' || match[2] === '..') return null;
    if (kind === 'pulls' && !/^[1-9]\d*$/.test(match[4])) return null;
    return { owner: match[1], repo: match[2], tail: match[4], path: url.pathname };
  } catch { return null; }
}

export function extractPolicy(documents: SourceDocument[]): ContributionPolicy {
  const evidence: PolicyEvidence[] = [];
  const links = new Map<string, { title: string; url: string }>();
  let requiresAssignment = false;
  let noAssignment = false;
  let directPr = false;
  let discussFirst = false;
  for (const document of documents.filter(doc => doc.found)) {
    const clean = document.text.replace(/<[^>]*>/g, ' ').replace(/[`*_]/g, '');
    for (const part of clean.split(/\n+|(?<=[.!?])\s+/)) {
      const sentence = part.trim().slice(0, 800);
      if (!sentence) continue;
      const conditional = /\b(if|when|unless|for (?:large|small|major|minor|documentation|assigned)|assigned issue|significant|complex)\b/i.test(sentence);
      const assignmentMentioned = /\bassign(?:ed|ment|ing)?\b/i.test(sentence);
      const assignmentNotRequired = assignmentMentioned && /assignment.{0,25}(?:not required|optional|not necessary)|(?:no|not) (?:prior )?assignment.{0,25}(?:required|needed)|(?:no need|do not need|don't need).{0,40}assign|(?:can|may).{0,40}without.{0,30}assign/i.test(sentence);
      const assignmentRequired = assignmentMentioned && !assignmentNotRequired && /must|required|need to|before (?:you |starting|working)/i.test(sentence);
      const directForbidden = /(?:do not|don't|never|must not|cannot|can't).{0,40}(?:submit|open|send).{0,40}(?:pull request|\bpr\b)|(?:direct|unsolicited) (?:pull requests|prs).{0,30}(?:not|never|disallow|reject)/i.test(sentence);
      const isDirect = !directForbidden && /(?:submit|open|send).{0,50}(?:pull request|\bpr\b).{0,35}(?:directly|without (?:an? )?(?:issue|assignment|approval))|(?:direct|unsolicited) (?:pull requests|prs).{0,30}(?:welcome|accept|encourag)|no (?:prior )?issue.{0,30}required/i.test(sentence);
      const isDiscuss = /(?:discuss|approval|contact (?:a |the )?maintainer|ask (?:a |the )?maintainer).{0,70}before|before.{0,70}(?:discuss|approval|contact (?:a |the )?maintainer)/i.test(sentence);
      for (const topic of [assignmentMentioned ? 'assignment' : null, isDirect ? 'direct-pr' : null, isDiscuss ? 'discussion' : null] as const) {
        if (topic && evidence.length < 16) evidence.push({ topic, excerpt: sentence, document: document.path || 'Repository document', url: document.url, conditional });
      }
      if (!conditional) {
        noAssignment ||= assignmentNotRequired; requiresAssignment ||= assignmentRequired;
        directPr ||= isDirect; discussFirst ||= isDiscuss;
      }
    }
    for (const match of document.text.matchAll(/\[([^\]]{1,120})\]\(([^\s)]+)\)/g)) {
      if (!/contribut|develop|guideline|handbook|workflow/i.test(match[1])) continue;
      try {
        const url = new URL(match[2], document.url || undefined);
        if (url.protocol === 'https:' && links.size < 8) links.set(url.href, { title: match[1], url: url.href });
      } catch { /* Relative links without a source URL cannot be resolved. */ }
    }
  }
  const conflict = (requiresAssignment && noAssignment) || (directPr && discussFirst);
  return {
    status: conflict ? 'conflicting-signals' : evidence.length ? 'signals-found' : 'unclear',
    assignment: requiresAssignment && !noAssignment ? 'required-mentioned' : noAssignment && !requiresAssignment ? 'not-required-mentioned' : 'conditional-or-unclear',
    process: directPr && !discussFirst ? 'direct-pr-mentioned' : discussFirst && !directPr ? 'discussion-first-mentioned' : 'conditional-or-unclear',
    documents_complete: !documents.some(doc => doc.error || doc.truncated), evidence, linked_guides: [...links.values()],
    caveats: [
      'These are English keyword signals and source excerpts, not authoritative policy interpretation. Read the full instructions and any conditions.',
      'No universal assignment requirement is assumed. Missing labels or assignees do not establish availability.',
      ...(documents.some(doc => doc.truncated) ? ['Some documents are truncated; additional rules may be outside the inspected excerpts.'] : []),
      ...(documents.some(doc => doc.error) ? ['Some guidance could not be retrieved; repository policy is only partially inspected.'] : []),
      ...(links.size ? ['Linked contributor guides are shown for review but are not automatically fetched.'] : []),
    ],
  };
}

export function detectPossibleClaims(comments: DiscussionComment[]) {
  return comments.filter(comment => {
    const text = comment.body.replace(/^>.*$/gm, '').replace(/```[\s\S]*?```/g, '');
    if (/\b(not working on|no longer working|not going to work|stopped working|unassign me|anyone can take)\b/i.test(text)) return false;
    return /\b(i(?:'m| am) working on|i(?:'ll| will) (?:work on|take|handle|fix)|working on (?:this|it)|please assign (?:this to )?me|can i (?:work on|take)|let me (?:work on|take))\b/i.test(text);
  });
}

export function recommendContribution(issue: Issue, activity: ActivityAssessment, policy: ContributionPolicy): Recommendation {
  const base = { confidence: 'limited-evidence' as const };
  if (issue.state !== 'open') return { ...base, action: 'choose-another-issue', title: 'Issue is closed', reason: 'Choose an open issue or ask the maintainer about remaining work.', suggested_plan: 'coordination', availability: 'closed' };
  const open = activity.pull_requests.filter(pr => pr.state === 'open');
  if (open.length) return {
    ...base, action: 'inspect-existing-pr', title: 'Inspect existing work before implementing',
    reason: 'An open PR references this issue. A reference alone does not prove it fixes the issue. Read its scope and review feedback; coordinate before duplicating work.',
    suggested_plan: 'review-existing-pr', availability: 'referenced-open-pr',
  };
  if (issue.assignees.length || activity.possible_claims.length) return {
    ...base, action: 'coordinate-existing-work', title: 'Coordinate with existing contributors',
    reason: issue.assignees.length ? 'An assignee is listed; follow this repository process rather than assuming assignment always reserves an issue.' : 'Discussion contains possible work claims. Quotes may be outdated or requests rather than ownership; confirm the current situation.',
    suggested_plan: 'coordination', availability: 'existing-work-signal',
  };
  if (activity.pull_requests.some(pr => pr.state === 'closed')) return {
    ...base, action: 'review-closed-pr-history', title: 'Read the previous PR outcome',
    reason: 'A referenced PR is closed or merged. Inspect why it closed and whether it actually addressed this issue before proposing another implementation.',
    suggested_plan: 'coordination', availability: 'previous-pr-found',
  };
  if (activity.status !== 'inspected' || !activity.timeline_complete || !activity.prs_complete || policy.status === 'conflicting-signals' || !policy.documents_complete) return {
    ...base, action: 'investigate-unknown', title: 'Availability needs further investigation',
    reason: 'Activity coverage is incomplete or repository guidance conflicts. Do not interpret missing evidence as permission or availability.',
    suggested_plan: 'coordination', availability: 'unknown',
  };
  if (policy.process === 'direct-pr-mentioned' && policy.assignment !== 'required-mentioned') return {
    ...base, action: 'follow-repository-process', title: 'Follow the documented direct-PR process',
    reason: 'Inspected guidance mentions direct PRs. No competing work was found in the inspected evidence, but unlinked or private work may exist. Verify that the guidance applies to this change.',
    suggested_plan: 'implementation', availability: 'no-competing-work-found-in-inspected-evidence',
  };
  return {
    ...base, action: 'confirm-before-starting', title: 'Review the repository process before starting',
    reason: policy.assignment === 'required-mentioned' || policy.process === 'discussion-first-mentioned'
      ? 'Inspected guidance mentions assignment or discussion first. Read its conditions and complete that step when applicable.'
      : 'No competing work was found in the inspected evidence. Contribution requirements remain unclear; check the source guidance or ask the maintainer.',
    suggested_plan: 'coordination', availability: 'no-competing-work-found-in-inspected-evidence',
  };
}

/** Discovery is a suitability screen, never an availability or code-complexity guarantee. */
export function assessIssue(issue: Issue, skills: string[], minutes: number) {
  const text = (issue.title + ' ' + issue.body + ' ' + issue.labels.join(' ')).toLowerCase();
  const matched = [...new Set(skills.filter(skill => text.includes(skill.toLowerCase())))];
  const titleAndLabels = issue.title + ' ' + issue.labels.join(' ');
  const broad = /architect|distributed|authentication|security|migration|breaking change|rewrite|redesign/i.test(titleAndLabels);
  const documentation = !broad && /\b(documentation|docs|readme|typo|spelling|jsdoc)\b/i.test(titleAndLabels);
  const tests = !broad && !documentation && /\b(tests?|testing|coverage)\b/i.test(titleAndLabels);
  const labeled = issue.labels.some(label => ['good first issue', 'beginner', 'beginner friendly', 'first timers only'].includes(label.toLowerCase().replace(/[-_]/g, ' ')));
  const helpWanted = issue.labels.some(label => label.toLowerCase().replace(/[-_]/g, ' ') === 'help wanted');
  const range = documentation ? [30, 90] : tests ? [60, 120] : labeled && !broad ? [90, 180] : null;
  const fit = range ? minutes >= range[1] ? 'may-fit-budget' : minutes >= range[0] ? 'uncertain-fit' : 'likely-over-budget' : 'scope-not-estimated';
  const scope = broad ? 'needs-deeper-review' : documentation || tests ? 'potentially-approachable' : labeled ? 'maintainer-beginner-signal' : 'unknown';
  return {
    ...issue, body: issue.body.slice(0, 1200), body_truncated: issue.body.length > 1200,
    matched_skills: matched, score: matched.length * 10 + (documentation ? 4 : tests ? 2 : 0) + (labeled ? 1 : 0),
    estimated_minutes: range ? { min: range[0], max: range[1], basis: 'content/label heuristic; not a guarantee' } : null,
    budget_fit: fit,
    suitability: { scope, confidence: 'heuristic-only', beginner_label_present: labeled, help_wanted_label_present: helpWanted },
    availability: { status: 'unchecked', summary: 'Skill fit is not availability. Inspect PRs, discussion, and repository policy before starting.' },
    reasons: [
      ...(matched.length ? ['Keyword matches: ' + matched.join(', ') + '.'] : ['No supplied skill keywords matched; relevance needs manual review.']),
      ...(labeled ? ['A maintainer-applied beginner label is present; it is one signal, not an availability guarantee.'] : ['No beginner label is required. Suitability is assessed from the available content.']),
      ...(helpWanted ? ['Help wanted is a collaboration signal, not proof that the task is beginner friendly.'] : []),
      ...(broad ? ['Title or labels suggest broad or sensitive work; a short description does not make it easy.'] : []),
      ...(range ? ['Tentative scope estimate: ' + range[0] + '-' + range[1] + ' minutes. No source-code or dependency analysis was performed.'] : ['Insufficient evidence for a useful time estimate.']),
      ...(issue.assignees.length ? ['Assignee(s): ' + issue.assignees.join(', ') + '. Follow the repository process; assignment is not a universal reservation rule.'] : ['No assignee is listed. This does not prove nobody is working on the issue.']),
    ],
  };
}
