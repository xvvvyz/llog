import type { PersistedOutbox } from '@/features/offline/types';

const OUTBOX_STORAGE_KEY = 'llog.offlineOutbox.v1';

export const getPersistedOutboxStorageKey = (ownerUserId?: string) =>
  ownerUserId
    ? `${OUTBOX_STORAGE_KEY}:${encodeURIComponent(ownerUserId)}`
    : OUTBOX_STORAGE_KEY;

export const emptyPersistedOutbox = (): PersistedOutbox => ({
  attachments: [],
  drafts: [],
  submissions: [],
  version: 1,
});

export const normalizePersistedOutbox = (
  value: Partial<PersistedOutbox> | null | undefined
): PersistedOutbox => {
  if (!value) return emptyPersistedOutbox();

  return {
    attachments: Array.isArray(value.attachments) ? value.attachments : [],
    drafts: Array.isArray(value.drafts) ? value.drafts : [],
    ownerUserId:
      typeof value.ownerUserId === 'string' && value.ownerUserId.trim()
        ? value.ownerUserId
        : undefined,
    submissions: Array.isArray(value.submissions) ? value.submissions : [],
    version: 1,
  };
};

export const parsePersistedOutbox = (value: string | null): PersistedOutbox => {
  if (!value) return emptyPersistedOutbox();

  try {
    return normalizePersistedOutbox(JSON.parse(value));
  } catch {
    return emptyPersistedOutbox();
  }
};
