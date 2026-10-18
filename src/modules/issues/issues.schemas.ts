import { z } from '@nitrostack/core';

export const repositoryFields = {
  owner: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, 'Use a GitHub owner name, not a URL').describe('GitHub owner or organization; use issuesprint-demo with demo-repo for the offline demo'),
  repo: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/).refine(v => v !== '.' && v !== '..', 'Invalid repository name').describe('Repository name without owner or URL'),
};
export const listIssuesSchema = z.object({
  ...repositoryFields,
  limit: z.number().int().min(1).max(20).default(5).describe('Maximum matching issues to return'),
  skills: z.array(z.string().trim().min(1).max(40)).max(10).default([]).describe('Skills used for transparent keyword matching, such as TypeScript or documentation'),
  available_minutes: z.number().int().min(15).max(480).default(90).describe('Time budget in minutes; effort estimates are rough heuristics, not promises'),
  beginner_only: z.boolean().default(false).describe('Optional labeled-only filter. Off by default: unlabeled issues can be approachable; help wanted alone does not establish beginner suitability'),
  unassigned_only: z.boolean().default(false).describe('Optional assignee filter, not an availability or permission check. Repository processes differ'),
});
export const issueReferenceSchema = z.object({
  ...repositoryFields,
  issue_number: z.number().int().positive().max(2147483647).describe('Issue number returned by list_issues'),
});
export const savePlanSchema = issueReferenceSchema.extend({
  available_minutes: z.number().int().min(15).max(480).describe('Time budget agreed with the user'),
  strategy: z.enum(['follow-recommendation', 'implementation', 'review-existing-pr', 'coordination']).default('follow-recommendation').describe('Follow the inspected recommendation, or explicitly choose a contribution approach'),
  coordination_note: z.string().trim().min(10).max(1000).optional().describe('Explain coordination or permission when intentionally choosing implementation despite existing work or uncertainty; does not prove maintainer approval'),
  summary: z.string().trim().min(10).max(1500).describe('Brief proposed approach grounded in the issue and contribution instructions'),
  steps: z.array(z.string().trim().min(3).max(800)).min(2).max(12).describe('Concrete implementation and verification steps, approved by the user'),
  acceptance_checks: z.array(z.string().trim().min(3).max(500)).min(1).max(8).describe('Observable checks that demonstrate completion'),
});
export type ListIssuesInput = z.infer<typeof listIssuesSchema>;
export type IssueReferenceInput = z.infer<typeof issueReferenceSchema>;
export type SavePlanInput = z.infer<typeof savePlanSchema>;

export interface Issue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  url: string;
  assignees: string[];
  updated_at: string;
  state: string;
}
