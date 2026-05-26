import * as openrouter from '@/api/lib/openrouter';
import { requireEnvString } from '@/api/lib/env';
import * as schemas from './schemas';
import type { JsonResponseSchema } from './schemas';
import type { CardChatMessage } from './types';
import { asArray, asRecord, getString } from './utils';

import {
  generateObject,
  jsonSchema,
  NoObjectGeneratedError,
  type JSONSchema7,
} from 'ai';

const OPENROUTER_JSON_PARSE_ATTEMPTS = 2;

const getOpenRouterRefusal = (error: unknown) => {
  if (!NoObjectGeneratedError.isInstance(error)) return undefined;
  const response = error.response as { body?: unknown } | undefined;
  const choices = asArray(asRecord(response?.body).choices);
  const message = asRecord(asRecord(choices[0]).message);
  return getString(message.refusal);
};

const shouldRetryObjectGeneration = (error: unknown) =>
  NoObjectGeneratedError.isInstance(error) && error.text !== undefined;

const splitSystemMessage = (messages: CardChatMessage[]) => {
  const [firstMessage, ...remainingMessages] = messages;

  const system =
    firstMessage?.role === 'system'
      ? getString(firstMessage.content)
      : undefined;

  return system ? { messages: remainingMessages, system } : { messages };
};

export const requestOpenRouterJson = async ({
  env,
  messages,
  operation,
  responseSchema,
}: {
  env: CloudflareEnv;
  messages: CardChatMessage[];
  operation: string;
  responseSchema: JsonResponseSchema;
}) => {
  const client = openrouter.createOpenRouter(env);
  const model = requireEnvString(env, 'OPENROUTER_CARD_MODEL');
  const prompt = splitSystemMessage(messages);
  let parseError: unknown;

  for (
    let attempt = 1;
    attempt <= OPENROUTER_JSON_PARSE_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const result = await generateObject({
        maxRetries: 0,
        ...prompt,
        model: client.chat(model),
        schema: jsonSchema<unknown>(
          schemas.responseJsonSchemaForModel({
            model,
            responseSchema,
          }) as JSONSchema7
        ),
        schemaDescription: responseSchema.description,
        schemaName: responseSchema.name,
      });

      return result.object;
    } catch (error) {
      const refusal = getOpenRouterRefusal(error);

      if (refusal) {
        throw new Error(`OpenRouter ${operation} refused: ${refusal}`);
      }

      if (shouldRetryObjectGeneration(error)) {
        parseError = error;
        continue;
      }

      throw new Error(
        `OpenRouter ${operation} failed: ${openrouter.describeOpenRouterError(error)}`
      );
    }
  }

  throw new Error(
    `OpenRouter ${operation} returned invalid JSON: ${openrouter.describeOpenRouterError(parseError)}`
  );
};
