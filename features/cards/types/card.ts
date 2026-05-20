import type { Card as EntityCard, Tag } from '@/domain/entities';
import type { CardOutput } from '@/domain/cards/output';

export type LogCard = Omit<EntityCard, 'output' | 'tags'> & {
  output?: CardOutput | null;
  tags?: Tag[];
};

export type CardWritePayload = { prompt: string; tagIds: string[] };

export type CardCreatePayload = CardWritePayload & { logId: string };

export type CardPromptSuggestionPayload = {
  cardId?: string;
  logId: string;
  tagIds: string[];
};
