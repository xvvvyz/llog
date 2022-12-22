const generateImageLoader = ({ aspectRatio }: { aspectRatio?: string } = {}) =>
  process.env.NEXT_PUBLIC_SUPABASE_PRO
    ? ({
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
      }
    : undefined;

export default generateImageLoader;
