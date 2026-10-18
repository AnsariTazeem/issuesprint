import { Module } from '@nitrostack/core';
import { IssuesTools } from './issues.tools.js';
import { IssuesGuidance } from './issues.guidance.js';
import { IssuesService } from './issues.service.js';

@Module({
  name: 'issues',
  description: 'Find suitable GitHub issues, inspect contribution context, and save focused work plans',
  controllers: [IssuesTools, IssuesGuidance],
  providers: [IssuesService],
})
export class IssuesModule {}
