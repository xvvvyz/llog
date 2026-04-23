import { clipboardToAssets } from '@/features/media/lib/clipboard-to-assets';
import type { PickedMediaAsset } from '@/features/media/lib/picked-media';
import * as React from 'react';
import { Platform } from 'react-native';

export const useClipboardMediaPaste = ({
  enabled,
  onUploadAssets,
}: {
  enabled: boolean;
  onUploadAssets: (assets: PickedMediaAsset[]) => void;
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
