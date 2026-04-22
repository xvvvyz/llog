import { Profile } from '@/features/account/types/profile';
import { Media } from '@/features/media/types/media';
import { Reaction } from '@/features/records/types/reaction';
import { Record as RecordType } from '@/features/records/types/record';
import { Reply } from '@/features/records/types/reply';

export type RecordOrReplyRecord = Partial<
  (RecordType | Reply) & {
    author: Profile & { image?: Media };
    replies: Pick<Reply, 'id'>[];
    media: Media[];
    reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
  }
>;

export type RecordOrReplySharedProps = {
  accentColor?: string;
  audioMedia: Media[];
  logId?: string;
  numberOfLines?: number;
  onDoubleTapReaction: () => void;
  record: RecordOrReplyRecord;
  recordId: string;
  replyId?: string;
  visualMedia: Media[];
};
