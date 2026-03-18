import { ImagePickerAsset } from 'expo-image-picker';

export const clipboardToAssets = (items: DataTransferItemList) => {
  const files: File[] = [];

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  return Promise.all(
    files.map(
      (file) =>
        new Promise<ImagePickerAsset>((resolve) => {
          const url = URL.createObjectURL(file);
          const img = new window.Image();

          img.onload = () => {
            resolve({
              height: img.naturalHeight,
              mimeType: file.type,
              uri: url,
              width: img.naturalWidth,
            });
          };

          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null as unknown as ImagePickerAsset);
          };

          img.src = url;
        })
    )
  );
};
