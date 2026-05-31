import type { PickedFileAsset } from '@/features/files/lib/picked';

export type RecordTemplateAttachment =
  | { asset: PickedFileAsset; type: 'file' }
  | { label: string; type: 'link'; url: string }
  | { duration?: number; type: 'recording'; uri: string };
