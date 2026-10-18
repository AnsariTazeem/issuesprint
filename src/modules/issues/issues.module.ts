// Registers the tool class and service

import { Module } from '@nitrostack/core';
import { IssuesTools } from './issues.tools.js';
import { IssuesService } from './issues.service.js';

@Module({
    name: 'issues',
    description: 'Github issue discovery and contribution planning',
    controllers: [IssuesTools],
    providers: [IssuesService]
})
export class IssuesModule {}