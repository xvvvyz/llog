import { apiOrThrow } from '@/lib/api';
import type * as card from '@/features/cards/types/card';

const jsonHeaders = { 'Content-Type': 'application/json' };

const postJson = async <T>(path: string, payload?: unknown) => {
  const response = await apiOrThrow(path, {
    body: payload == null ? undefined : JSON.stringify(payload),
    headers: payload == null ? undefined : jsonHeaders,
    method: 'POST',
  });

  return (await response.json()) as T;
};

export const createCard = (payload: card.CardCreatePayload) =>
  postJson<{ id: string; queued: boolean; success: boolean }>(
    '/cards',
    payload
  );

export const suggestCardPrompt = (payload: card.CardPromptSuggestionPayload) =>
  postJson<{ prompt: string }>('/cards/suggest-prompt', payload);

export const tweakCard = ({ id, prompt }: { id: string; prompt: string }) =>
  postJson<{ queued: boolean; success: boolean }>(`/cards/${id}/tweak`, {
    prompt,
  });

export const refreshCard = (id: string) =>
  postJson<{ queued: boolean; success: boolean }>(`/cards/${id}/refresh`);

export const reorderCards = ({
  logId,
  orderedIds,
}: {
  logId?: string;
  orderedIds: string[];
}) => {
  if (!logId) return;

  return postJson<{ success: boolean }>('/cards/reorder', {
    logId,
    orderedIds,
  });
};

export const refreshRecordCards = ({
  recordId,
  tagIds,
}: {
  recordId?: string;
  tagIds: string[];
}) => {
  if (!recordId || !tagIds.length) return;

  return postJson<{ success: boolean }>('/cards/refresh-record', {
    recordId,
    tagIds,
  });
};

export const updateCard = async ({
  id,
  ...payload
}: card.CardWritePayload & { id: string }) => {
  const response = await apiOrThrow(`/cards/${id}`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders,
    method: 'PUT',
  });

  return response.json() as Promise<{
    id: string;
    queued: boolean;
    success: boolean;
  }>;
};

export const deleteCard = (id: string) =>
  apiOrThrow(`/cards/${id}`, { method: 'DELETE' });
