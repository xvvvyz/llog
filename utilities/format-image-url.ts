const formatImageUrl = (file?: string | File | null) => {
  if (!file) {
    return undefined;
  }

  if (typeof file === 'string') {
    const pathPart = process.env.NEXT_PUBLIC_SUPABASE_PRO
      ? 'render/image'
      : 'object';

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/${pathPart}/public/${file}`;
  }

  if (file instanceof File) {
    return URL.createObjectURL(file);
  }
};

export default formatImageUrl;
