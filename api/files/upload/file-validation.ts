import type { FileKind } from '@/domain/files/file-kind';
import { fileLike } from '@/domain/files/file-like';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const inferFileKind = (file: File) => {
  if (file.type.startsWith('image/')) return 'image' as const;
  if (file.type.startsWith('audio/')) return 'audio' as const;
  if (file.type.startsWith('video/')) return 'video' as const;
  return 'document' as const;
};

export const requireUploadedFile = (file: z.infer<typeof fileLike>) => {
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'Invalid upload' });
  }

  return file;
};

export const validateUpload = (file: File, allowed: FileKind[]) => {
  const kind = inferFileKind(file);

  if (!allowed.includes(kind)) {
    throw new HTTPException(400, { message: 'Invalid upload format' });
  }

  return kind;
};
