import { PickedMediaAsset } from '@/lib/picked-media';

export const clipboardToAssets = (items: DataTransferItemList) => {
  const files: File[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  return Promise.all(
    files.map(
      (file) =>
        new Promise<PickedMediaAsset | null>((resolve) => {
          const url = URL.createObjectURL(file);
          const img = new window.Image();

          img.onload = () => {
            resolve({
              file,
              fileName: file.name,
              height: img.naturalHeight,
              mimeType: file.type,
              type: 'image',
              uri: url,
              width: img.naturalWidth,
            });
          };

          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };

          img.src = url;
        })
    )
  ).then((assets) =>
    assets.filter((asset): asset is PickedMediaAsset => !!asset)
  );
};
