import { useEffect, useState } from 'react';
import { Image } from 'react-native';

const dimensionsCache = new Map<
  string,
  { aspectRatio: number; height: number; width: number }
>();

export const useImageDimensions = (src: string) => {
  const [dimensions, setDimensions] = useState<{
    aspectRatio: number;
    height: number;
    width: number;
  }>({ aspectRatio: 1, height: 0, width: 0 });

  useEffect(() => {
    if (dimensionsCache.has(src)) {
      setDimensions(dimensionsCache.get(src)!);
      return;
    }

    Image.getSize(
      src,
      (width, height) => {
        const aspectRatio = width / height;
        dimensionsCache.set(src, { aspectRatio, height, width });
        setDimensions({ aspectRatio, height, width });
      },
      console.log
    );
  }, [src]);

  return dimensions;
};
