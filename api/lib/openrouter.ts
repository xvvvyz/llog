import { createOpenRouter as createOpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { APICallError, NoObjectGeneratedError } from 'ai';

export const createOpenRouter = (env: CloudflareEnv) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');

  return createOpenRouterProvider({
    apiKey,
    compatibility: 'strict',
    ...(env.APP_URL ? { appUrl: env.APP_URL } : {}),
  });
};

export const describeOpenRouterError = (error: unknown) => {
  if (APICallError.isInstance(error)) {
    const details =
      error.responseBody ||
      (error.data ? JSON.stringify(error.data) : undefined) ||
      error.message;

    return error.statusCode ? `${error.statusCode}: ${details}` : details;
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    return error.cause instanceof Error
      ? `${error.message}: ${error.cause.message}`
      : error.message;
  }

  if (error instanceof Error) return error.message;
  return JSON.stringify(error);
};
