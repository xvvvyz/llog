import type { SheetPayload } from '@/lib/sheet-names';

type RecordCreateSheetPayload = SheetPayload<'record-create'>;

export const getCopyTargetLogIds = (payload?: RecordCreateSheetPayload) => {
  const logIds = payload?.logIds;
  if (!Array.isArray(logIds)) return [];

  return [
    ...new Set(
      logIds
        .filter((logId): logId is string => typeof logId === 'string')
        .map((logId) => logId.trim())
        .filter(Boolean)
    ),
  ];
};

export const getPayloadTeamId = (payload?: RecordCreateSheetPayload) => {
  const teamId = payload?.teamId;
  return typeof teamId === 'string' && teamId.trim() ? teamId : undefined;
};

export const getRecordIsPinned = (value: unknown) =>
  !!(
    value &&
    typeof value === 'object' &&
    'isPinned' in value &&
    (value as { isPinned?: unknown }).isPinned
  );
