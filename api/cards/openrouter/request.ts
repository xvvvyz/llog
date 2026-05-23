import * as openrouter from '@/api/lib/openrouter';
import { requireEnvString } from '@/api/lib/env';
import type { ChatResult } from '@openrouter/sdk/models';
import type { JsonResponseSchema } from './schemas';
import type { CardChatMessage } from './types';
import { getString } from './utils';

const OPENROUTER_JSON_PARSE_ATTEMPTS = 2;

const supportsJsonSchemaResponseFormat = (model: string) =>
  !model.startsWith('google/gemini-');

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
  let parseError: unknown;

  for (
    let attempt = 1;
    attempt <= OPENROUTER_JSON_PARSE_ATTEMPTS;
    attempt += 1
  ) {
    let result: ChatResult;

    const responseFormat = supportsJsonSchemaResponseFormat(model)
      ? ({ jsonSchema: responseSchema, type: 'json_schema' } as const)
      : ({ type: 'json_object' } as const);

    try {
      result = await client.chat.send({
        chatRequest: { messages, model, responseFormat },
      });
    } catch (error) {
      throw new Error(
        `OpenRouter ${operation} failed: ${openrouter.describeOpenRouterError(error)}`
      );
    }

    const message = result.choices[0]?.message;
    const refusal = getString(message?.refusal);
    if (refusal) throw new Error(`OpenRouter ${operation} refused: ${refusal}`);
    const content = getString(message?.content);

    if (!content) {
      throw new Error(`OpenRouter ${operation} returned no content`);
    }

    try {
      return JSON.parse(content) as unknown;
    } catch (error) {
      parseError = error;
    }
  }

  throw new Error(
    `OpenRouter ${operation} returned invalid JSON: ${openrouter.describeOpenRouterError(parseError)}`
  );
};
