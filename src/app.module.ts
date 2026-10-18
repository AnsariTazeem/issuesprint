import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IssuesModule } from './modules/issues/issues.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'issuesprint',
    version: '1.0.0',
    protocolVersion: 'auto',  // 'auto (default: 2026-07-28 + legacy fallback)' | '2026-07-28' | 'legacy'
  },
  logging: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    IssuesModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

