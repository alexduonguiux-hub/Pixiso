export interface ServerEnv {
  /** Present only on the server. Never logged, never serialized. */
  anthropicApiKey: string | undefined;
  claudeModel: string;
  port: number;
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const key = source.ANTHROPIC_API_KEY?.trim();
  const port = Number(source.PORT ?? 8787);
  return {
    anthropicApiKey: key && key.length > 0 ? key : undefined,
    claudeModel: source.CLAUDE_MODEL?.trim() || 'claude-haiku-5-5',
    port: Number.isFinite(port) && port > 0 ? port : 8787,
  };
}
