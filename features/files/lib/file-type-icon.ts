import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import type * as React from 'react';

import {
  FileArchive,
  FileCode,
  FileCss,
  FileCsv,
  FileDoc,
  FileHtml,
  FileJs,
  FileJsx,
  FilePdf,
  FilePpt,
  FileSql,
  FileText,
  FileTs,
  FileTsx,
  FileTxt,
  FileXls,
  FileZip,
} from 'phosphor-react-native';

type FileIcon = React.ComponentType<PhosphorIconProps>;

const EXTENSION_ICONS = new Map<string, FileIcon>([
  ['7z', FileArchive],
  ['bz2', FileArchive],
  ['c', FileCode],
  ['cc', FileCode],
  ['cpp', FileCode],
  ['cs', FileCode],
  ['css', FileCss],
  ['csv', FileCsv],
  ['doc', FileDoc],
  ['docx', FileDoc],
  ['go', FileCode],
  ['gz', FileArchive],
  ['h', FileCode],
  ['html', FileHtml],
  ['java', FileCode],
  ['js', FileJs],
  ['json', FileCode],
  ['jsx', FileJsx],
  ['kt', FileCode],
  ['log', FileTxt],
  ['md', FileText],
  ['odp', FilePpt],
  ['ods', FileXls],
  ['odt', FileDoc],
  ['pdf', FilePdf],
  ['php', FileCode],
  ['ppt', FilePpt],
  ['pptx', FilePpt],
  ['py', FileCode],
  ['rar', FileArchive],
  ['rb', FileCode],
  ['rs', FileCode],
  ['rtf', FileText],
  ['sh', FileCode],
  ['sql', FileSql],
  ['swift', FileCode],
  ['tar', FileArchive],
  ['tgz', FileArchive],
  ['ts', FileTs],
  ['tsx', FileTsx],
  ['txt', FileTxt],
  ['xls', FileXls],
  ['xlsx', FileXls],
  ['xml', FileCode],
  ['yaml', FileCode],
  ['yml', FileCode],
  ['zip', FileZip],
]);

const MIME_ICONS = new Map<string, FileIcon>([
  ['application/gzip', FileArchive],
  ['application/javascript', FileJs],
  ['application/json', FileCode],
  ['application/msword', FileDoc],
  ['application/pdf', FilePdf],
  ['application/rtf', FileText],
  ['application/sql', FileSql],
  ['application/typescript', FileTs],
  ['application/vnd.ms-excel', FileXls],
  ['application/vnd.ms-powerpoint', FilePpt],
  [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    FilePpt,
  ],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    FileXls,
  ],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    FileDoc,
  ],
  ['application/x-7z-compressed', FileArchive],
  ['application/x-bzip2', FileArchive],
  ['application/x-javascript', FileJs],
  ['application/x-rar-compressed', FileArchive],
  ['application/x-sh', FileCode],
  ['application/x-sql', FileSql],
  ['application/x-tar', FileArchive],
  ['application/zip', FileZip],
  ['text/css', FileCss],
  ['text/csv', FileCsv],
  ['text/html', FileHtml],
  ['text/javascript', FileJs],
  ['text/jsx', FileJsx],
  ['text/markdown', FileText],
  ['text/plain', FileTxt],
  ['text/tsx', FileTsx],
  ['text/typescript', FileTs],
  ['text/xml', FileCode],
]);

const getFileExtension = (name?: string | null) => {
  const trimmedName = name?.trim();
  if (!trimmedName) return null;
  const match = trimmedName.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/);
  return match?.[1] ?? null;
};

export const getFileTypeIcon = ({
  mimeType,
  name,
}: {
  mimeType?: string | null;
  name?: string | null;
}): FileIcon => {
  const normalizedMimeType = mimeType?.trim().toLowerCase().split(';')[0];

  const mimeIcon = normalizedMimeType
    ? MIME_ICONS.get(normalizedMimeType)
    : undefined;

  if (mimeIcon) return mimeIcon;
  const extension = getFileExtension(name);
  return (extension ? EXTENSION_ICONS.get(extension) : undefined) ?? FileText;
};
