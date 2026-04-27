import { clipboardToAssets } from '@/features/files/lib/clipboard-to-assets';
import type { PickedFileAsset } from '@/features/files/lib/picked';
import * as React from 'react';
import { Platform } from 'react-native';

export const useClipboardFilePaste = ({
  enabled,
  onUploadAssets,
}: {
  enabled: boolean;
  onUploadAssets: (assets: PickedFileAsset[]) => void;
}) => {
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handler = async (event: ClipboardEvent) => {
      if (!event.clipboardData?.items.length) return;
      const assets = await clipboardToAssets(event.clipboardData.items);
      if (!assets.length) return;
      event.preventDefault();
      onUploadAssets(assets);
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [enabled, onUploadAssets]);
};
