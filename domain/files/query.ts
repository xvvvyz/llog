const visibleFileFields = [
  'assetKey',
  'duration',
  'id',
  'isIdentifying',
  'isTranscribing',
  'mimeType',
  'name',
  'order',
  'size',
  'thumbnailUri',
  'tracks',
  'transcript',
  'type',
  'uri',
] as const;

export const visibleFileQuery = {
  $: {
    fields: [...visibleFileFields] as Array<(typeof visibleFileFields)[number]>,
  },
};

const copyFileFields = [...visibleFileFields, 'audd'] as const;

export const copyFileQuery = {
  $: { fields: [...copyFileFields] as Array<(typeof copyFileFields)[number]> },
};

const fileAssetFields = ['assetKey', 'id', 'uri'] as const;

export const fileAssetQuery = {
  $: {
    fields: [...fileAssetFields] as Array<(typeof fileAssetFields)[number]>,
  },
};
