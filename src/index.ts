import 'reflect-metadata';
import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/** Start the MCP server. The framework reads transport settings from the environment. */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error: unknown) => {
  console.error('IssueSprint failed to start:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
