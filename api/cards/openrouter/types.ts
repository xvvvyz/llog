import type { ChatMessages } from '@openrouter/sdk/models';
import type * as instantEntities from '@/instant.entities';

export type CardLlmRecord = Pick<instantEntities.Record, 'id'> &
  Partial<Pick<instantEntities.Record, 'date' | 'text'>> & {
    author?: Pick<instantEntities.Profile, 'name'> | null;
    tags?: Partial<Pick<instantEntities.Tag, 'id' | 'name'>>[];
  };

export type CardContextCard = Pick<instantEntities.Card, 'id'> &
  Partial<Pick<instantEntities.Card, 'output' | 'prompt' | 'title'>> & {
    tags?: Partial<Pick<instantEntities.Tag, 'name'>>[];
  };

export type CardChatMessage = Extract<
  ChatMessages,
  { role: 'system' | 'user' }
>;

export type JsonSchema = Record<string, unknown>;
