import { Profile } from '@/features/account/types/profile';
import { FileItem } from '@/features/files/types/file';
import { Link } from '@/features/records/types/link';
import { Reaction } from '@/features/records/types/reaction';
import { Record } from '@/features/records/types/record';
import { Reply } from '@/features/records/types/reply';

export type EntryRecord = Partial<
  (Record | Reply) & {
    author: Profile & { image?: FileItem };
    links: Link[];
    replies: Pick<Reply, 'id'>[];
    files: FileItem[];
    reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  }
>;

export type EntrySharedProps = {
  accentColor?: string;
  audioMedia: FileItem[];
  documentFiles: FileItem[];
  links: Link[];
  logId?: string;
  numberOfLines?: number;
  onDoubleTapReaction: () => void;
  record: EntryRecord;
  recordId: string;
  replyId?: string;
  visualMedia: FileItem[];
};
