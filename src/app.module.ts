import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IssuesModule } from './modules/issues/issues.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  // Use the documented legacy handshake for current NitroStudio/SDK v1 clients.
  // NITRO_MCP_PROTOCOL_VERSION can explicitly override this after compatibility testing.
  server: { name: 'issuesprint', version: '1.0.0', protocolVersion: 'legacy' },
  logging: { level: 'info' },
})
@Module({
  name: 'app',
  description: 'IssueSprint MCP application',
  imports: [ConfigModule.forRoot(), IssuesModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
