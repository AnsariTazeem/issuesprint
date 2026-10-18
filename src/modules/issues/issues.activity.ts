import { z } from '@nitrostack/core';
import type { Issue, IssueReferenceInput } from './issues.schemas.js';
import { detectPossibleClaims, parseGitHubApiReference } from './issues.context.js';
import type { ActivityAssessment, DiscussionComment, PullRequestEvidence } from './issues.context.js';

type Request = (path: string, signal?: AbortSignal) => Promise<unknown>;
type PublicRepository = (owner: string, repo: string, signal?: AbortSignal) => Promise<unknown>;
const person = z.object({ login: z.string() }).nullable().optional();
const referencedIssue = z.object({
  pull_request: z.object({ url: z.string() }).nullable().optional(),
}).passthrough();
const eventSchema = z.object({
  event: z.string(), created_at: z.string().optional(), updated_at: z.string().optional(),
  body: z.string().nullable().optional(), html_url: z.string().optional(), user: person, actor: person,
  author_association: z.string().optional(), source: z.object({ issue: referencedIssue.nullable().optional() }).nullable().optional(),
});
const pullSchema = z.object({
  number: z.number().int(), title: z.string(), html_url: z.string().url(), body: z.string().nullable(),
  state: z.enum(['open', 'closed']), merged: z.boolean(), draft: z.boolean().optional().default(false),
  updated_at: z.string(), user: person,
});
const reviewSchema = z.object({
  user: person, author_association: z.string().optional(), state: z.string(),
  body: z.string().nullable().optional(), html_url: z.string(), submitted_at: z.string().nullable().optional(),
});
const safeMessage = (error: unknown) => error instanceof Error ? error.message.slice(0, 400) : 'Activity request failed.';

export async function inspectIssueActivity(
  input: IssueReferenceInput, issue: Issue, request: Request, publicRepository: PublicRepository, signal?: AbortSignal,
): Promise<ActivityAssessment> {
  const result: ActivityAssessment = {
    status: 'inspected', checked_at: new Date().toISOString(),
    timeline_entries_scanned: 0, timeline_complete: true, referenced_prs_found: 0, prs_complete: true,
    pull_requests: [], comments: [], possible_claims: [], notices: [
      'Coverage: at most 200 issue timeline events and 3 referenced PRs; at most 200 reviews per PR. Unlinked, private, inaccessible, or newly started work may not be visible.',
      'A timeline reference does not prove that a PR fixes this issue. No automatic code-quality, AI-authorship, CI, or abandonment judgment is made.',
    ],
  };
  const base = '/repos/' + encodeURIComponent(input.owner) + '/' + encodeURIComponent(input.repo);
  const references = new Set<string>();
  const comments: DiscussionComment[] = [];
  try {
    for (let page = 1; page <= 2; page++) {
      const events = z.array(eventSchema).parse(await request(base + '/issues/' + input.issue_number + '/timeline?per_page=100&page=' + page, signal));
      result.timeline_entries_scanned += events.length;
      for (const event of events) {
        const reference = event.source?.issue?.pull_request?.url;
        if (reference && parseGitHubApiReference(reference, 'pulls')) references.add(reference);
        if (event.event === 'commented' && event.body && event.html_url) comments.push({
          author: event.user?.login || event.actor?.login || 'unknown', association: event.author_association || 'UNKNOWN',
          body: event.body.slice(0, 2000), url: event.html_url,
          updated_at: event.updated_at || event.created_at || '',
        });
        if (event.event === 'connected' && !reference) {
          result.status = 'partial';
          result.notices.push('A connected-work event was observed without readable PR details. Inspect the issue Development panel on GitHub.');
        }
      }
      if (events.length < 100) break;
      if (page === 2) {
        result.timeline_complete = false; result.status = 'partial';
        result.notices.push('Timeline scan stopped at 200 events. More recent events may exist beyond the inspected pages.');
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    result.status = 'unknown'; result.timeline_complete = false;
    result.notices.push('Timeline could not be fully inspected: ' + safeMessage(error));
  }
  // Explicit PR URLs in the public issue/discussion are additional references, not proof of ownership.
  for (const text of [issue.body, ...comments.map(comment => comment.body)]) {
    for (const match of text.matchAll(/https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/g)) {
      const url = 'https://api.github.com/repos/' + match[1] + '/' + match[2] + '/pulls/' + match[3];
      if (parseGitHubApiReference(url, 'pulls')) references.add(url);
    }
    for (const match of text.matchAll(/\b(?:PR|pull request)\s*#([1-9]\d*)\b/gi)) references.add('https://api.github.com' + base + '/pulls/' + match[1]);
  }
  result.comments = comments.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 20);
  result.possible_claims = detectPossibleClaims(comments).slice(0, 10);
  if (comments.length > 20) result.notices.push('Only 20 discussion excerpts are displayed; work-claim signals were checked across all scanned comments.');
  result.referenced_prs_found = references.size;
  if (references.size > 3) { result.prs_complete = false; result.status = result.status === 'unknown' ? 'unknown' : 'partial'; }
  for (const reference of [...references].slice(0, 3)) {
    const parsed = parseGitHubApiReference(reference, 'pulls')!;
    try {
      if (parsed.owner.toLowerCase() !== input.owner.toLowerCase() || parsed.repo.toLowerCase() !== input.repo.toLowerCase()) await publicRepository(parsed.owner, parsed.repo, signal);
      const pull = pullSchema.parse(await request(parsed.path, signal));
      const record: PullRequestEvidence = {
        number: pull.number, repository: parsed.owner + '/' + parsed.repo, title: pull.title,
        url: pull.html_url, state: pull.state, merged: pull.merged, draft: pull.draft,
        author: pull.user?.login || 'unknown', updated_at: pull.updated_at,
        relationship: 'timeline-reference', review_status: 'no-decision-observed', reviews: [], reviews_complete: true,
      };
      const body = pull.body || '';
      const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sameRepository = parsed.owner.toLowerCase() === input.owner.toLowerCase() && parsed.repo.toLowerCase() === input.repo.toLowerCase();
      const targets = [escape(input.owner + '/' + input.repo + '#' + input.issue_number) + '(?![0-9])', escape(issue.url) + '(?![0-9])'];
      if (sameRepository) targets.push('#' + input.issue_number + '(?![0-9])');
      const closingReference = new RegExp('\\b(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?)\\s+(?:' + targets.join('|') + ')', 'i');
      if (closingReference.test(body)) record.relationship = 'closing-reference-in-body';
      try {
        const reviews: z.infer<typeof reviewSchema>[] = [];
        for (let page = 1; page <= 2; page++) {
          const batch = z.array(reviewSchema).parse(await request(parsed.path + '/reviews?per_page=100&page=' + page, signal));
          reviews.push(...batch);
          if (batch.length < 100) break;
          if (page === 2) record.reviews_complete = false;
        }
        const decisions = new Map<string, string>();
        for (const review of reviews) {
          if (review.user && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) decisions.set(review.user.login, review.state);
        }
        record.review_status = !record.reviews_complete ? 'unknown' : [...decisions.values()].includes('CHANGES_REQUESTED')
          ? 'changes-requested-observed' : [...decisions.values()].includes('APPROVED') ? 'approval-observed' : 'no-decision-observed';
        record.reviews = reviews.slice(-12).map(review => ({
          author: review.user?.login || 'unknown', association: review.author_association || 'UNKNOWN',
          state: review.state, body: (review.body || '').slice(0, 1800), url: review.html_url, submitted_at: review.submitted_at || null,
        }));
        if (!record.reviews_complete) { result.prs_complete = false; if (result.status !== 'unknown') result.status = 'partial'; }
      } catch (error) {
        if (signal?.aborted) throw error;
        record.review_status = 'unknown'; record.reviews_complete = false; record.error = safeMessage(error);
        result.prs_complete = false; if (result.status !== 'unknown') result.status = 'partial';
      }
      result.pull_requests.push(record);
    } catch (error) {
      if (signal?.aborted) throw error;
      result.prs_complete = false; if (result.status !== 'unknown') result.status = 'partial';
      result.notices.push('A referenced PR could not be inspected under the public-only access policy: ' + safeMessage(error));
    }
  }
  if (result.possible_claims.length) result.notices.push('Work-claim detection is an English text heuristic. A request to work is not an assignment, and an old statement is not proof of current ownership.');
  return result;
}
