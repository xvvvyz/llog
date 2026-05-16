import { Profile } from '@/features/account/types/profile';
import { FileItem } from '@/features/files/types/file';
import { type EntryMenuState } from '@/features/records/components/entry-menu';
import { Link } from '@/features/records/types/link';
import { Log } from '@/features/logs/types/log';
import { Reaction } from '@/features/records/types/reaction';
import { Record } from '@/features/records/types/record';
import { Reply } from '@/features/records/types/reply';
import { Tag } from '@/features/tags/types/tag';
import type { OutboxStatus } from '@/features/offline/types';

export type EntryRecord = Partial<
  (Record | Reply) & {
    author: Profile & { image?: FileItem };
    links: Link[];
    log: Partial<Pick<Log, 'color' | 'id' | 'name'>>;
    localNeedsDraftReplay: boolean;
    localOutboxStatus: OutboxStatus;
    localStatus: 'pending' | 'error';
    replies: EntryRecord[];
    files: FileItem[];
    reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
    syncError: string;
    tags: Tag[];
  }
>;

export type EntrySharedProps = {
  accentColor?: string;
  audioMedia: FileItem[];
  canAnalyzeAudio: boolean;
  canOpenReply?: boolean;
  documentFiles: FileItem[];
  entryMenuState: EntryMenuState;
  links: Link[];
  logId?: string;
  logName?: string;
  numberOfLines?: number;
  onDoubleTapReaction: () => void;
  record: EntryRecord;
  recordId: string;
  replyId?: string;
  syncStatus?: 'queued' | 'uploading';
  visualMedia: FileItem[];
};
