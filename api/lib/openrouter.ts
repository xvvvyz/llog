import { OpenRouter } from '@openrouter/sdk';
import { OpenRouterError } from '@openrouter/sdk/models/errors';

export const createOpenRouter = (env: CloudflareEnv) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');

  return new OpenRouter({
    apiKey,
    appTitle: 'llog',
    ...(env.APP_URL ? { httpReferer: env.APP_URL } : {}),
  });
};

export const describeOpenRouterError = (error: unknown) => {
  if (error instanceof OpenRouterError) {
    return `${error.statusCode}: ${error.body || error.message}`;
  }

  if (error instanceof Error) return error.message;
  return JSON.stringify(error);
};
