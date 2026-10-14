import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { readEnv } from './env.js';

describe('readEnv', () => {
  it('treats an empty key as missing and applies defaults', () => {
    const env = readEnv({ ANTHROPIC_API_KEY: '  ' });
    expect(env.anthropicApiKey).toBeUndefined();
    expect(env.claudeModel).toBe('claude-haiku-5-5');
    expect(env.port).toBe(8787);
  });
  it('reads overrides', () => {
    const env = readEnv({
      ANTHROPIC_API_KEY: 'sk-test',
      CLAUDE_MODEL: 'claude-sonnet-5-5',
      PORT: '9000',
    });
    expect(env.anthropicApiKey).toBe('sk-test');
    expect(env.claudeModel).toBe('claude-sonnet-5-5');
    expect(env.port).toBe(9000);
  });
});

describe('app without API key', () => {
  const app = createApp(readEnv({}));
  it('reports describe as disabled', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, describeEnabled: false });
  });
  it('returns 503 describe_disabled', async () => {
    const res = await app.request('/api/describe', { method: 'POST', body: '{}' });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'describe_disabled' });
  });
  it('never leaks the key through health', async () => {
    const withKey = createApp(readEnv({ ANTHROPIC_API_KEY: 'sk-secret-123' }));
    const text = await (await withKey.request('/api/health')).text();
    expect(text).not.toContain('sk-secret');
  });
});
