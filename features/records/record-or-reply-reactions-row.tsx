import { EmojiPicker } from '@/features/records/emoji-picker';
import { Reactions } from '@/features/records/reactions';
import { RecordOrReplyDoubleTapReactionZone } from '@/features/records/record-or-reply-double-tap-reaction-zone';
import type { RecordOrReplyRecord } from '@/features/records/record-or-reply.types';
import { cn } from '@/lib/cn';
import * as React from 'react';
import { View } from 'react-native';

export const RecordOrReplyReactionsRow = ({
  accentColor,
  className,
  logId,
  onDoubleTapReaction,
  record,
  recordId,
  replyId,
  trailing,
}: {
  accentColor?: string;
  className?: string;
  logId?: string;
  onDoubleTapReaction: () => void;
  record: RecordOrReplyRecord;
  recordId: string;
  replyId?: string;
  trailing?: React.ReactNode;
}) => {
  return (
    <View className={cn('flex-row items-stretch', className)}>
      <View className="flex-row flex-wrap items-center gap-1.5 self-center">
        <EmojiPicker
          color={accentColor}
          logId={logId}
          reactions={record.reactions}
          recordId={recordId}
          replyId={replyId}
          teamId={record.teamId}
        />
        {!!record.reactions?.length && (
          <View className="flex-row items-center gap-2">
            <Reactions
              color={accentColor}
              logId={logId}
              reactions={record.reactions}
              recordId={recordId}
              replyId={replyId}
              teamId={record.teamId}
            />
          </View>
        )}
      </View>
      <RecordOrReplyDoubleTapReactionZone
        className="-mt-3 -mb-3 pt-3 pb-3"
        onDoubleTap={onDoubleTapReaction}
      />
      {trailing}
    </View>
  );
};
