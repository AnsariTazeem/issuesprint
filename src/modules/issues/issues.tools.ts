// Defines MCP names, schemas and handler

import { Injectable, ToolDecorator as Tool, z } from '@nitrostack/core';
import { IssuesService } from './issues.service.js';



@Injectable({ deps: [IssuesService] })
export class IssuesTools{
    constructor(private readonly issuesService: IssuesService){}

    @Tool({
        name: 'list_issues',
        description: 'List sample Github issues. Currently returns an empty list.',
        inputSchema: z.object({})
    })

    async listIssues(){
        return this.issuesService.listIssues();
    }
}