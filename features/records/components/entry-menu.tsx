import { canDeleteOwnOrManagedResource } from '@/domain/teams/permissions';
import { useProfile } from '@/features/account/queries/use-profile';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { detectEntryMusic } from '@/features/records/mutations/detect-music';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { transcribeEntryAudio } from '@/features/records/mutations/transcribe-audio';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import { useRecordCopyTargets } from '@/features/records/queries/use-record-copy-targets';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

import {
  CopySimple,
  DotsThreeVertical,
  MusicNotes,
  NotePencil,
  PushPin,
  Tag,
  TextT,
  Trash,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';

type EntryMenuProps = {
  accentColor?: string;
  authorId?: string;
  className?: string;
  replyId?: string;
  isDetail?: boolean;
  isPinned?: boolean;
  logId?: string;
  recordId: string;
  hasDetectableAudio?: boolean;
  hasTranscribableAudio?: boolean;
  isIdentifyingAudio?: boolean;
  isTranscribingAudio?: boolean;
  teamId?: string;
};

export const useEntryMenuState = ({
  authorId,
  hasDetectableAudio,
  hasTranscribableAudio,
  isIdentifyingAudio,
  isTranscribingAudio,
  logId,
  replyId,
  teamId,
}: Pick<
  EntryMenuProps,
  | 'authorId'
  | 'hasDetectableAudio'
  | 'hasTranscribableAudio'
  | 'isIdentifyingAudio'
  | 'isTranscribingAudio'
  | 'logId'
  | 'replyId'
  | 'teamId'
>) => {
  const myRole = useMyRole({ teamId });
  const profile = useProfile();
  const isAuthor = !!profile.id && profile.id === authorId;

  const canDelete = canDeleteOwnOrManagedResource({
    actorRole: myRole.role,
    isAuthor,
  });

  const canEdit = isAuthor;

  const recordTags = useHasRecordTagsForLog({
    enabled: !replyId && isAuthor && !myRole.canManage,
    logId,
    teamId,
  });

  const canTag =
    !replyId && (myRole.canManage || (isAuthor && recordTags.hasRecordTags));

  const canCopyToAnotherLog = !replyId && isAuthor;

  const copyTargets = useRecordCopyTargets({
    enabled: canCopyToAnotherLog && !!logId,
    sourceLogId: logId,
  });

  const canCopy = canCopyToAnotherLog && !!logId && copyTargets.logs.length > 0;
  const canPin = !replyId && myRole.canPinRecords;
  const canDetectMusic = !!hasDetectableAudio || !!isIdentifyingAudio;
  const canTranscribe = !!hasTranscribableAudio || !!isTranscribingAudio;

  const hasActionsAboveDelete =
    canEdit || canTag || canCopy || canPin || canDetectMusic || canTranscribe;

  const hasMenu =
    canDelete || canCopy || canTag || canDetectMusic || canTranscribe;

  return {
    canCopy,
    canDelete,
    canDetectMusic,
    canEdit,
    canPin,
    canTag,
    canTranscribe,
    hasActionsAboveDelete,
    hasMenu,
    isIdentifyingAudio: !!isIdentifyingAudio,
    isTranscribingAudio: !!isTranscribingAudio,
  };
};

export type EntryMenuState = ReturnType<typeof useEntryMenuState>;

const PendingMenuIcon = ({
  icon,
  isPending,
}: {
  icon: React.ComponentType<PhosphorIconProps>;
  isPending: boolean;
}) => {
  const colorScheme = useColorScheme();

  if (isPending) {
    return (
      <View className="size-5 items-center justify-center">
        <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
      </View>
    );
  }

  return <Icon className="text-placeholder" icon={icon} />;
};

const AudioAnalysisMenuItem = ({
  icon,
  isPending,
  label,
  onPress,
}: {
  icon: React.ComponentType<PhosphorIconProps>;
  isPending: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Menu.Item closeOnPress={false} disabled={isPending} onPress={onPress}>
    <PendingMenuIcon icon={icon} isPending={isPending} />
    <Text className={isPending ? 'text-placeholder' : ''}>{label}</Text>
  </Menu.Item>
);

const EntryMenuDropdownContent = ({
  accentColor,
  logId,
  replyId,
  isDetail,
  isPinned,
  recordId,
  state,
}: Omit<EntryMenuProps, 'className'> & { state: EntryMenuState }) => {
  const sheetManager = useSheetManager();
  const { onOpenChange } = Menu.useContext();
  const [isIdentifying, setIsIdentifying] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);

  const {
    canCopy,
    canDelete,
    canDetectMusic,
    canEdit,
    canPin,
    canTag,
    canTranscribe,
    hasActionsAboveDelete,
    hasMenu,
    isIdentifyingAudio,
    isTranscribingAudio,
  } = state;

  const isIdentifyPending = isIdentifying || isIdentifyingAudio;
  const isTranscribePending = isTranscribing || isTranscribingAudio;

  const runAudioAnalysisAction = React.useCallback(
    ({
      action,
      fallbackMessage,
      isPending,
      setIsPending,
    }: {
      action: () => Promise<unknown>;
      fallbackMessage: string;
      isPending: boolean;
      setIsPending: React.Dispatch<React.SetStateAction<boolean>>;
    }) => {
      if (isPending) return;
      setIsPending(true);

      void action()
        .catch((error) => {
          alert({
            message: error instanceof Error ? error.message : fallbackMessage,
            title: 'Error',
          });
        })
        .finally(() => {
          setIsPending(false);
          onOpenChange(false);
        });
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    if (!canDetectMusic) setIsIdentifying(false);
  }, [canDetectMusic]);

  React.useEffect(() => {
    if (!canTranscribe) setIsTranscribing(false);
  }, [canTranscribe]);

  const handleDetectMusic = React.useCallback(() => {
    runAudioAnalysisAction({
      action: () => detectEntryMusic({ recordId, replyId }),
      fallbackMessage: 'Failed to detect music',
      isPending: isIdentifyPending,
      setIsPending: setIsIdentifying,
    });
  }, [isIdentifyPending, recordId, replyId, runAudioAnalysisAction]);

  const handleTranscribeAudio = React.useCallback(() => {
    runAudioAnalysisAction({
      action: () => transcribeEntryAudio({ recordId, replyId }),
      fallbackMessage: 'Failed to transcribe audio',
      isPending: isTranscribePending,
      setIsPending: setIsTranscribing,
    });
  }, [isTranscribePending, recordId, replyId, runAudioAnalysisAction]);

  if (!hasMenu) return null;

  return (
    <React.Fragment>
      <Menu.Trigger asChild>
        <Button
          className={cn('size-8', isDetail ? 'rounded-full' : 'rounded-lg')}
          size="icon"
          variant="ghost"
          wrapperClassName={isDetail ? 'rounded-full' : 'rounded-lg'}
        >
          <Icon className="text-muted-foreground" icon={DotsThreeVertical} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align="end">
        {canEdit && (
          <Menu.Item
            onPress={() => {
              if (replyId) {
                sheetManager.open('reply-create', replyId, recordId);
              } else {
                sheetManager.open('record-create', recordId, 'edit');
              }
            }}
          >
            <Icon className="text-placeholder" icon={NotePencil} />
            <Text>Edit</Text>
          </Menu.Item>
        )}
        {canTag && (
          <Menu.Item onPress={() => sheetManager.open('record-tags', recordId)}>
            <Icon className="text-placeholder" icon={Tag} />
            <Text>Tag</Text>
          </Menu.Item>
        )}
        {canTranscribe && (
          <AudioAnalysisMenuItem
            icon={TextT}
            isPending={isTranscribePending}
            label="Transcribe"
            onPress={handleTranscribeAudio}
          />
        )}
        {canDetectMusic && (
          <AudioAnalysisMenuItem
            icon={MusicNotes}
            isPending={isIdentifyPending}
            label="Identify"
            onPress={handleDetectMusic}
          />
        )}
        {canPin && (
          <Menu.Item
            onPress={() => {
              const nextIsPinned = !isPinned;
              void toggleRecordPin({ id: recordId, isPinned: nextIsPinned });

              if (nextIsPinned) {
                requestPostSubmitScroll({
                  id: logId,
                  scope: 'log',
                  target: 'top',
                });
              }
            }}
          >
            <Icon
              className={!isPinned ? 'text-placeholder' : undefined}
              color={isPinned ? accentColor : undefined}
              icon={PushPin}
              weight={isPinned ? 'fill' : 'regular'}
            />
            <Text>{isPinned ? 'Unpin' : 'Pin'}</Text>
          </Menu.Item>
        )}
        {canCopy && (
          <Menu.Item
            onPress={() => sheetManager.open('record-copy-to', recordId)}
          >
            <Icon className="text-placeholder" icon={CopySimple} />
            <Text>Copy</Text>
          </Menu.Item>
        )}
        {canDelete && (
          <React.Fragment>
            {hasActionsAboveDelete && <Menu.Separator />}
            <Menu.Item
              onPress={() => {
                if (replyId) {
                  sheetManager.open('reply-delete', replyId, recordId);
                } else {
                  sheetManager.open(
                    'record-delete',
                    recordId,
                    isDetail ? `detail:${logId ?? ''}` : undefined
                  );
                }
              }}
            >
              <Icon className="text-destructive" icon={Trash} />
              <Text className="text-destructive">Delete</Text>
            </Menu.Item>
          </React.Fragment>
        )}
      </Menu.Content>
    </React.Fragment>
  );
};

export const EntryMenuContent = ({
  className,
  ...props
}: EntryMenuProps & { state: EntryMenuState }) => {
  if (!props.state.hasMenu) return null;

  return (
    <View className={className}>
      <Menu.Root>
        <EntryMenuDropdownContent {...props} />
      </Menu.Root>
    </View>
  );
};
