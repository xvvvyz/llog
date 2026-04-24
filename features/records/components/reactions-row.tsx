import { EmojiPicker } from '@/features/records/components/emoji-picker';
import { ReactionZone } from '@/features/records/components/reaction-zone';
import { Reactions } from '@/features/records/components/reactions';
import type { EntryRecord } from '@/features/records/types/entry';
import { cn } from '@/lib/cn';
import * as React from 'react';
import { View } from 'react-native';

export const ReactionsRow = ({
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
  record: EntryRecord;
  recordId: string;
  replyId?: string;
  trailing?: React.ReactNode;
}) => {
  return (
    <View className={cn('flex-row items-stretch', className)}>
      <View className="flex-row flex-wrap gap-1.5 items-center self-center">
        <EmojiPicker
          color={accentColor}
          logId={logId}
          reactions={record.reactions}
          recordId={recordId}
          replyId={replyId}
          teamId={record.teamId}
        />
        {!!record.reactions?.length && (
          <View className="flex-row gap-2 items-center">
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
      <ReactionZone
        className="-mb-3 -mt-3 pb-3 pt-3"
        onDoubleTap={onDoubleTapReaction}
      />
      {trailing}
    </View>
  );
};
