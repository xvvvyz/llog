import * as mediaMetadata from '@/domain/files/media-metadata';
import type * as instantEntities from '@/instant.entities';

export const CARD_SOURCE_ASSEMBLY_VERSION = 'folded-v1';

type SourceProfile = Pick<instantEntities.Profile, 'name'> | null;

type SourceTag = Pick<instantEntities.Tag, 'id'> &
  Partial<Pick<instantEntities.Tag, 'name'>>;

type SourceFile = Partial<
  Pick<instantEntities.FileItem, 'order' | 'transcript' | 'type'>
>;

type SourceReply = Pick<instantEntities.Reply, 'id'> &
  Partial<Pick<instantEntities.Reply, 'date' | 'isDraft' | 'text'>> & {
    author?: SourceProfile;
    files?: SourceFile[];
  };

export type CardSourceAssemblyRecord = Pick<instantEntities.Record, 'id'> &
  Partial<
    Pick<instantEntities.Record, 'date' | 'isDraft' | 'logId' | 'text'>
  > & {
    author?: SourceProfile;
    files?: SourceFile[];
    replies?: SourceReply[];
    tags?: SourceTag[];
  };

export type CardSourceItemKind = 'record' | 'reply';

export type CardSourceItem = {
  author: string | null;
  kind: CardSourceItemKind;
  text: string;
  timestamp: string | null;
};

export type AssembledCardSourceRecord = Pick<
  CardSourceAssemblyRecord,
  'author' | 'date' | 'id' | 'isDraft' | 'logId' | 'tags'
> & {
  sourceAssemblyVersion: typeof CARD_SOURCE_ASSEMBLY_VERSION;
  text: string;
};

const cleanText = (value?: string | null) => value?.trim() || '';
const authorName = (author?: SourceProfile) => author?.name?.trim() || null;

const isoTimestamp = (value?: Date | number | string | null) => {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const sortedFiles = (files?: SourceFile[]) =>
  [...(files ?? [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0)
  );

const transcriptLabel = (file: SourceFile) =>
  file.type === 'video' ? 'Video transcript' : 'Audio transcript';

const transcriptBlocks = (files?: SourceFile[]) =>
  sortedFiles(files).flatMap((file) => {
    const text = mediaMetadata
      .parseStoredTranscriptSegments(file.transcript)
      .map((segment) => segment.text)
      .join('\n')
      .trim();

    return text ? [`${transcriptLabel(file)}:\n${text}`] : [];
  });

const sourceText = ({
  files,
  text,
}: {
  files?: SourceFile[];
  text?: string | null;
}) =>
  [cleanText(text), ...transcriptBlocks(files)].filter(Boolean).join('\n\n');

export const assembleCardSourceItems = (
  record: CardSourceAssemblyRecord
): CardSourceItem[] => {
  const recordAuthor = authorName(record.author);
  const recordTimestamp = isoTimestamp(record.date);
  const items: CardSourceItem[] = [];

  const foldedRecordText = sourceText({
    files: record.files,
    text: record.text,
  });

  if (foldedRecordText) {
    items.push({
      author: recordAuthor,
      kind: 'record',
      text: foldedRecordText,
      timestamp: recordTimestamp,
    });
  }

  for (const reply of record.replies ?? []) {
    if (reply.isDraft === true) continue;
    const replyAuthor = authorName(reply.author);
    const replyTimestamp = isoTimestamp(reply.date);

    const foldedReplyText = sourceText({
      files: reply.files,
      text: reply.text,
    });

    if (foldedReplyText) {
      items.push({
        author: replyAuthor,
        kind: 'reply',
        text: foldedReplyText,
        timestamp: replyTimestamp,
      });
    }
  }

  return items;
};

const sourceItemLabel = (item: CardSourceItem) =>
  [
    item.kind,
    `author: ${item.author ?? 'unknown'}`,
    `time: ${item.timestamp ?? 'unknown'}`,
  ]
    .filter(Boolean)
    .join(' | ');

export const foldCardSourceItems = (items: CardSourceItem[]) =>
  items.map((item) => `[${sourceItemLabel(item)}]\n${item.text}`).join('\n\n');

export const assembleCardLlmRecord = (
  record: CardSourceAssemblyRecord
): AssembledCardSourceRecord | undefined => {
  const text = foldCardSourceItems(assembleCardSourceItems(record));
  if (!text) return;

  return {
    author: record.author,
    date: record.date,
    id: record.id,
    isDraft: record.isDraft,
    logId: record.logId,
    sourceAssemblyVersion: CARD_SOURCE_ASSEMBLY_VERSION,
    tags: record.tags,
    text,
  };
};

export const assembleCardLlmRecords = (records: CardSourceAssemblyRecord[]) =>
  records
    .map(assembleCardLlmRecord)
    .filter((record): record is AssembledCardSourceRecord => !!record);
