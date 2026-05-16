import type { FileKind } from '@/domain/files/file-kind';
import type { FileItem, Link, Tag } from '@/domain/entities';

export type OutboxStatus =
  | 'pending'
  | 'syncing'
  | 'publishing'
  | 'complete'
  | 'error'
  | 'discarded';

export type QueuedAttachmentStatus =
  | 'persisting'
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'error';

export type QueuedParent =
  | { parentId: string; parentType: 'record'; recordId: string }
  | { parentId: string; parentType: 'reply'; recordId: string };

export type QueuedAttachment = QueuedParent & {
  duration?: number;
  error?: string;
  height?: number;
  id: string;
  isRecording?: boolean;
  localUri: string;
  mimeType?: string;
  name?: string;
  order: number;
  size?: number;
  status: QueuedAttachmentStatus;
  submissionId?: string;
  type: FileKind;
  width?: number;
};

export type QueuedLinkSnapshot = Pick<
  Link,
  'id' | 'label' | 'order' | 'teamId' | 'url'
> & { localStatus?: 'error' | 'pending' };

export type QueuedTagSnapshot = Pick<
  Tag,
  'color' | 'id' | 'name' | 'order' | 'teamId' | 'type'
>;

export type QueuedFileSnapshot = Partial<
  Pick<
    FileItem,
    | 'assetKey'
    | 'duration'
    | 'id'
    | 'isIdentifying'
    | 'isTranscribing'
    | 'mimeType'
    | 'name'
    | 'order'
    | 'size'
    | 'thumbnailUri'
    | 'tracks'
    | 'transcript'
    | 'type'
    | 'uri'
  >
> & { id: string; type: FileKind | string };

export type QueuedSubmission =
  | {
      authorId?: string;
      contentId: string;
      createdAt: string;
      error?: string;
      files: QueuedFileSnapshot[];
      id: string;
      isPinned?: boolean;
      links: QueuedLinkSnapshot[];
      logId: string;
      needsDraftReplay?: boolean;
      nextRetryAt?: string;
      retryCount?: number;
      status: OutboxStatus;
      tagIds: string[];
      tags: QueuedTagSnapshot[];
      teamId?: string;
      text: string;
      type: 'record';
      updatedAt: string;
    }
  | {
      authorId?: string;
      contentId: string;
      createdAt: string;
      error?: string;
      files: QueuedFileSnapshot[];
      id: string;
      links: QueuedLinkSnapshot[];
      needsDraftReplay?: boolean;
      nextRetryAt?: string;
      recordId: string;
      retryCount?: number;
      status: OutboxStatus;
      teamId?: string;
      text: string;
      type: 'reply';
      updatedAt: string;
    };

export type QueuedRecordPin = {
  id: string;
  isPinned: boolean;
  recordId: string;
  updatedAt: string;
};

export type PersistedOutbox = {
  attachments: QueuedAttachment[];
  drafts: QueuedDraft[];
  ownerUserId?: string;
  recordPins: QueuedRecordPin[];
  submissions: QueuedSubmission[];
  version: 1;
};

export type QueuedDraft =
  | {
      contentId: string;
      id: string;
      isPinned?: boolean;
      links: QueuedLinkSnapshot[];
      linksUpdated?: boolean;
      tagIds: string[];
      tags: QueuedTagSnapshot[];
      tagsUpdated?: boolean;
      type: 'record';
      updatedAt: string;
    }
  | {
      contentId: string;
      id: string;
      links: QueuedLinkSnapshot[];
      linksUpdated?: boolean;
      type: 'reply';
      updatedAt: string;
    };

export type QueueAttachmentInput = QueuedParent & {
  duration?: number;
  height?: number;
  id: string;
  isRecording?: boolean;
  localUri: string;
  mimeType?: string | null;
  name?: string | null;
  order: number;
  size?: number | null;
  status?: QueuedAttachmentStatus;
  type: FileKind;
  width?: number;
};

export type QueueSubmissionInput =
  | {
      authorId?: string;
      contentId: string;
      files?: QueuedFileSnapshot[];
      isPinned?: boolean;
      links?: QueuedLinkSnapshot[];
      logId: string;
      needsDraftReplay?: boolean;
      tags?: QueuedTagSnapshot[];
      teamId?: string;
      text: string;
      type: 'record';
    }
  | {
      authorId?: string;
      contentId: string;
      files?: QueuedFileSnapshot[];
      links?: QueuedLinkSnapshot[];
      needsDraftReplay?: boolean;
      recordId: string;
      teamId?: string;
      text: string;
      type: 'reply';
    };
