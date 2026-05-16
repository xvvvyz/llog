import type { FileKind } from '@/domain/files/file-kind';

export type LinkField = 'reply' | 'record';

export type MultipartFileKind = Exclude<FileKind, 'video'>;

export type R2MultipartFileKind = Extract<FileKind, 'audio' | 'document'>;
