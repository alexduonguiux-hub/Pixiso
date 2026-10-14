import { Hono } from 'hono';
import type { ServerEnv } from './env.js';

export function createApp(env: ServerEnv) {
  const app = new Hono();

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      describeEnabled: env.anthropicApiKey !== undefined,
      model: env.claudeModel,
    }),
  );

  // Phase 5 fills this in. Until then the contract for "no key" already holds.
  app.post('/api/describe', (c) => {
    if (env.anthropicApiKey === undefined) {
      return c.json({ error: 'describe_disabled' }, 503);
    }
    return c.json({ error: 'not_implemented' }, 501);
  });

  return app;
}
