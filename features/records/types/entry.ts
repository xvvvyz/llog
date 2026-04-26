import { Profile } from '@/features/account/types/profile';
import { Media } from '@/features/media/types/media';
import { Reaction } from '@/features/records/types/reaction';
import { Record } from '@/features/records/types/record';
import { Reply } from '@/features/records/types/reply';

export type EntryRecord = Partial<
  (Record | Reply) & {
    author: Profile & { image?: Media };
    replies: Pick<Reply, 'id'>[];
    media: Media[];
    reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  }
>;

export type EntrySharedProps = {
  accentColor?: string;
  audioMedia: Media[];
  documentMedia: Media[];
  logId?: string;
  numberOfLines?: number;
  onDoubleTapReaction: () => void;
  record: EntryRecord;
  recordId: string;
  replyId?: string;
  visualMedia: Media[];
};
