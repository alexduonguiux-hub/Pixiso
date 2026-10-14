import { serve } from '@hono/node-server';
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readEnv } from './env.js';

// .env lives at the repo root; it is read only here, on the server.
loadDotenv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const env = readEnv();
const app = createApp(env);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(
    `[server] listening on http://localhost:${info.port} (describe: ${env.anthropicApiKey ? 'enabled' : 'disabled, no ANTHROPIC_API_KEY'}, model: ${env.claudeModel})`,
  );
});
