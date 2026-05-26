export const recordStatuses = ['draft', 'scheduled', 'published'] as const;

export type RecordStatus = (typeof recordStatuses)[number];

export type RecordStatusSource = { status: string | null | undefined };

export type OptionalRecordStatusSource = object | null | undefined;

const recordStatusSet = new Set<string>(recordStatuses);

export const isRecordStatus = (value?: string | null): value is RecordStatus =>
  !!value && recordStatusSet.has(value);

const getRecordStatusValue = (record: OptionalRecordStatusSource) => {
  if (!record || typeof record !== 'object' || !('status' in record)) return;
  const status = (record as { status?: unknown }).status;
  return typeof status === 'string' ? status : undefined;
};

export const getRecordStatus = (record: RecordStatusSource): RecordStatus => {
  const status = getRecordStatusValue(record);
  if (isRecordStatus(status)) return status;
  throw new Error('Invalid record status');
};

export const getOptionalRecordStatus = (
  record: OptionalRecordStatusSource
): RecordStatus | undefined => {
  const status = getRecordStatusValue(record);
  return isRecordStatus(status) ? status : undefined;
};

export const recordIsPublished = (record: OptionalRecordStatusSource) =>
  getOptionalRecordStatus(record) === 'published';

export const recordIsScheduled = (record: OptionalRecordStatusSource) =>
  getOptionalRecordStatus(record) === 'scheduled';

export const recordIsUnpublished = (record: OptionalRecordStatusSource) => {
  const status = getOptionalRecordStatus(record);
  return status === 'draft' || status === 'scheduled';
};
