export const recordTagFields = [
  'id' as const,
  'name' as const,
  'order' as const,
  'teamId' as const,
  'type' as const,
];

export const recordTagLogsQuery = {
  $: { fields: ['id' as const, 'name' as const] },
};

export const recordTagsQuery = {
  $: { fields: recordTagFields, where: { type: 'record' as const } },
};
