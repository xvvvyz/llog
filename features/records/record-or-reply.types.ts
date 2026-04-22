import { Media } from '@/types/media';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { Record as RecordType } from '@/types/record';
import { Reply } from '@/types/reply';

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
