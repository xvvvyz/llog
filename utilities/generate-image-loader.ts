const generateImageLoader =
  ({ aspectRatio }: { aspectRatio?: string } = {}) =>
  ({
    quality = 100,
    src,
    width,
  }: {
    quality?: number;
    src: string;
    width: number;
  }) => {
    const divider = src.includes('?') ? '&' : '?';
    const url = `${src}${divider}width=${width}&quality=${quality}`;
    if (!aspectRatio) return url;
    const [w, h] = aspectRatio.split(':').map(Number);
    const height = Math.round((width * h) / w);
    return `${url}&height=${height}`;
  };

export default generateImageLoader;
