import { Profile } from '@/features/account/types/profile';
import { FileItem } from '@/features/files/types/file';
import { type EntryMenuState } from '@/features/records/components/entry-menu';
import { Link } from '@/features/records/types/link';
import { Reaction } from '@/features/records/types/reaction';
import { Record } from '@/features/records/types/record';
import { Reply } from '@/features/records/types/reply';
import { Tag } from '@/features/tags/types/tag';

export type EntryRecord = Partial<
  (Record | Reply) & {
    author: Profile & { image?: FileItem };
    links: Link[];
    replies: Pick<Reply, 'id'>[];
    files: FileItem[];
    reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
    tags: Tag[];
  }
>;

export type EntrySharedProps = {
  accentColor?: string;
  audioMedia: FileItem[];
  canAnalyzeAudio: boolean;
  documentFiles: FileItem[];
  entryMenuState: EntryMenuState;
  links: Link[];
  logId?: string;
  numberOfLines?: number;
  onDoubleTapReaction: () => void;
  record: EntryRecord;
  recordId: string;
  replyId?: string;
  visualMedia: FileItem[];
};
