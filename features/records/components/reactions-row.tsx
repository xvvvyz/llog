import { REACTION_EMOJIS } from '@/domain/records/reactions';
import { EmojiPicker } from '@/features/records/components/emoji-picker';
import { ReactionZone } from '@/features/records/components/reaction-zone';
import { Reactions } from '@/features/records/components/reactions';
import type { EntryRecord } from '@/features/records/types/entry';
import { cn } from '@/lib/cn';
import * as React from 'react';
import { View } from 'react-native';

export const ReactionsRow = ({
  accentTextClassName,
  className,
  disabled,
  logId,
  onDoubleTapReaction,
  record,
  recordId,
  replyId,
  trailing,
}: {
  accentTextClassName?: string;
  className?: string;
  disabled?: boolean;
  logId?: string;
  onDoubleTapReaction: () => void;
  record: EntryRecord;
  recordId: string;
  replyId?: string;
  trailing?: React.ReactNode;
}) => {
  const usedEmojis = React.useMemo(
    () => new Set((record.reactions ?? []).map((reaction) => reaction.emoji)),
    [record.reactions]
  );

  const reactionPicker = REACTION_EMOJIS.some(
    (emoji) => !usedEmojis.has(emoji)
  ) && (
    <EmojiPicker
      colorClassName={accentTextClassName}
      disabled={disabled}
      logId={logId}
      reactions={record.reactions}
      recordId={recordId}
      replyId={replyId}
      teamId={record.teamId}
    />
  );

  const hasReactions = !!record.reactions?.length;

  return (
    <View className={cn('flex-row items-stretch', className)}>
      <View className="flex-row flex-wrap min-w-0 gap-1 items-center self-center shrink">
        {hasReactions ? (
          <Reactions
            colorClassName={accentTextClassName}
            disabled={disabled}
            leading={reactionPicker}
            logId={logId}
            reactions={record.reactions ?? []}
            recordId={recordId}
            replyId={replyId}
            teamId={record.teamId}
          />
        ) : (
          reactionPicker
        )}
      </View>
      <ReactionZone
        className="-mb-3 -mt-3 pb-3 pt-3 justify-center"
        disabled={disabled}
        onDoubleTap={onDoubleTapReaction}
      />
      {trailing}
    </View>
  );
};
