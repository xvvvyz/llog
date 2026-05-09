export const tagFields = [
  'color' as const,
  'id' as const,
  'name' as const,
  'order' as const,
  'teamId' as const,
  'type' as const,
];

export const logTagFields = tagFields;

export const recordTagFields = tagFields;

export const recordTagLogsQuery = {
  $: { fields: ['id' as const, 'name' as const] },
};

export const logTagsQuery = {
  $: { fields: logTagFields, where: { type: 'log' as const } },
};

export const recordTagsQuery = {
  $: { fields: recordTagFields, where: { type: 'record' as const } },
};
