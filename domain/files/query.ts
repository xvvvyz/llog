const visibleFileFields = [
  'assetKey',
  'duration',
  'id',
  'identificationRequestedAt',
  'isIdentifying',
  'isTranscribing',
  'mimeType',
  'name',
  'order',
  'size',
  'thumbnailUri',
  'tracks',
  'transcriptionRequestedAt',
  'transcript',
  'type',
  'uri',
] as const;

export const visibleFileQuery = {
  $: { fields: [...visibleFileFields] as (typeof visibleFileFields)[number][] },
};

const copyFileFields = [...visibleFileFields, 'audd'] as const;

export const copyFileQuery = {
  $: { fields: [...copyFileFields] as (typeof copyFileFields)[number][] },
};

const fileAssetFields = ['assetKey', 'id', 'uri'] as const;

export const fileAssetQuery = {
  $: { fields: [...fileAssetFields] as (typeof fileAssetFields)[number][] },
};
