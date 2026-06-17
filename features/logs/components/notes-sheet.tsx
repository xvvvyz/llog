import { LOG_NOTE_TEXT_MAX_LENGTH } from '@/features/logs/lib/notes';
import { updateNote } from '@/features/logs/mutations/update-note';
import { useLogNote } from '@/features/logs/queries/use-log-note';
import { useLog } from '@/features/logs/queries/use-log';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { InfoIcon } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export const LogNotesSheet = () => {
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('log-notes');
  const logId = sheetManager.getId('log-notes');
  const log = useLog({ id: logId });
  const myRole = useMyRole({ teamId: log.teamId ?? null });
  const note = useLogNote({ enabled: isOpen && myRole.canManage, logId });
  const [draftText, setDraftText] = React.useState('');
  const activeLogIdRef = React.useRef<string | undefined>(undefined);
  const latestTextRef = React.useRef('');
  const dirtyTextRef = React.useRef(false);
  const pendingMutationRef = React.useRef<Promise<unknown>>(Promise.resolve());

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const isLoading =
    isOpen &&
    (log.isLoading ||
      myRole.isLoading ||
      !myRole.isReady ||
      (myRole.canManage && note.isLoading));

  const isTextInputDisabled = isLoading || !myRole.canManage || !log.teamId;

  const clearPendingSave = React.useCallback(() => {
    if (!saveTimeoutRef.current) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
  }, []);

  React.useEffect(
    () => () => {
      clearPendingSave();
    },
    [clearPendingSave]
  );

  const flushNoteText = React.useCallback(() => {
    clearPendingSave();
    if (!dirtyTextRef.current || !logId || !log.teamId) return;
    const nextText = latestTextRef.current;
    if (nextText.length > LOG_NOTE_TEXT_MAX_LENGTH) return;
    dirtyTextRef.current = false;

    pendingMutationRef.current = pendingMutationRef.current
      .catch(() => undefined)
      .then(async () => {
        await updateNote({
          logId,
          noteId: note.id,
          teamId: log.teamId,
          text: nextText,
        });
      })
      .catch(() => {
        dirtyTextRef.current = true;
      });
  }, [clearPendingSave, log.teamId, logId, note.id]);

  const close = React.useCallback(() => {
    flushNoteText();
    sheetManager.close('log-notes');
  }, [flushNoteText, sheetManager]);

  React.useEffect(() => {
    if (!isOpen) {
      activeLogIdRef.current = undefined;
      dirtyTextRef.current = false;
      latestTextRef.current = '';
      setDraftText('');
      clearPendingSave();
      return;
    }

    if (activeLogIdRef.current !== logId) {
      activeLogIdRef.current = logId;
      dirtyTextRef.current = false;
      latestTextRef.current = '';
      setDraftText('');
      clearPendingSave();
    }

    if (!isLoading) {
      const persistedText = note.text ?? '';

      if (!dirtyTextRef.current) {
        latestTextRef.current = persistedText;
        setDraftText(persistedText);
      }
    }
  }, [clearPendingSave, isLoading, isOpen, logId, note.text]);

  const setNoteText = React.useCallback(
    (nextText: string) => {
      if (!logId || !log.teamId || nextText.length > LOG_NOTE_TEXT_MAX_LENGTH) {
        return;
      }

      setDraftText(nextText);
      latestTextRef.current = nextText;
      dirtyTextRef.current = true;
      clearPendingSave();
      saveTimeoutRef.current = setTimeout(flushNoteText, 350);
    },
    [clearPendingSave, flushNoteText, log.teamId, logId]
  );

  return (
    <Sheet
      className="h-full"
      loading={isLoading}
      onDismiss={close}
      open={isOpen}
      portalName="log-notes"
      width="editor"
    >
      <Page className="flex-col overflow-hidden max-h-full min-h-0 bg-popover">
        <View className="flex-1 mx-auto max-h-full max-w-4xl min-h-0 w-full">
          <View className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4">
            <View className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border">
              <Textarea
                autoFocus
                fill
                maxLength={LOG_NOTE_TEXT_MAX_LENGTH}
                onChangeText={setNoteText}
                pasteRichTextAsMarkdown
                placeholder="Add notes…"
                readOnly={isTextInputDisabled}
                value={draftText}
                className={cn(
                  'border-0 rounded-2xl bg-transparent',
                  isTextInputDisabled && 'opacity-50'
                )}
              />
            </View>
            <View className="flex-row px-4 gap-3 items-center shrink-0">
              <View className="flex-1 flex-row min-w-0 gap-1.5 items-center">
                <Icon
                  className="text-muted-foreground"
                  icon={InfoIcon}
                  size={16}
                />
                <Text
                  className="flex-1 min-w-0 text-muted-foreground text-sm"
                  numberOfLines={1}
                >
                  Only visible to admins
                </Text>
              </View>
              <Button onPress={close} size="xs" variant="secondary">
                <Text>Done</Text>
              </Button>
            </View>
          </View>
        </View>
      </Page>
    </Sheet>
  );
};
