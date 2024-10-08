const getFormCacheKey = {
  eventType: ({ id, subjectId }: { id?: string; subjectId: string }) =>
    `subject-${subjectId}-event-type-${id ?? 'create'}`,
  eventTypeTemplate: ({
    id,
    isDuplicate,
  }: { id?: string; isDuplicate?: boolean } = {}) =>
    `event-type-template-${id ?? 'create'}${isDuplicate ? '-duplicate' : ''}`,
  input: ({ id, isDuplicate }: { id?: string; isDuplicate?: boolean } = {}) =>
    `input-${id ?? 'create'}${isDuplicate ? '-duplicate' : ''}`,
  insight: ({ id, subjectId }: { id?: string; subjectId: string }) =>
    `subject-${subjectId}-insight-${id ?? 'create'}`,
  moduleTemplate: ({
    id,
    isDuplicate,
  }: { id?: string; isDuplicate?: boolean } = {}) =>
    `module-template-${id ?? 'create'}}${isDuplicate ? '-duplicate' : ''}`,
  protocolTemplate: ({
    id,
    isDuplicate,
  }: { id?: string; isDuplicate?: boolean } = {}) =>
    `protocol-template-${id ?? 'create'}${isDuplicate ? '-duplicate' : ''}`,
  session: ({
    id,
    isDuplicate,
    protocolId,
    subjectId,
  }: {
    id?: string;
    isDuplicate?: boolean;
    subjectId: string;
    protocolId: string;
  }) =>
    `subject-${subjectId}-protocol-${protocolId}-session-${id ?? 'create'}${isDuplicate ? '-duplicate' : ''}`,
  sessionTemplate: ({
    id,
    isDuplicate,
  }: { id?: string; isDuplicate?: boolean } = {}) =>
    `session-template-${id ?? 'create'}${isDuplicate ? '-duplicate' : ''}`,
};

export default getFormCacheKey;
