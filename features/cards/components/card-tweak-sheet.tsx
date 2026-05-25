import * as cardMutations from '@/features/cards/mutations/cards';
import { useLogCard } from '@/features/cards/queries/use-cards';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { View } from 'react-native';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

const CARD_TWEAK_PROMPT_MAX_LENGTH = 1000;

export const LogCardTweakSheet = () => {
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('log-card-tweak');
  const cardId = sheetManager.getId('log-card-tweak');
  const card = useLogCard({ enabled: isOpen, id: cardId });
  const logColor = useLogColor({ id: card.logId ?? undefined });
  const [prompt, setPrompt] = React.useState('');
  const { isSubmitting, runSubmit } = useSheetSubmitState({ isOpen });
  const trimmedPrompt = prompt.trim();

  const canSubmit =
    !!card.id &&
    !!card.output &&
    !!trimmedPrompt &&
    trimmedPrompt.length <= CARD_TWEAK_PROMPT_MAX_LENGTH &&
    !isSubmitting;

  const close = React.useCallback(() => {
    sheetManager.close('log-card-tweak');
  }, [sheetManager]);

  const handleDismiss = React.useCallback(() => {
    if (isSubmitting) return;
    close();
  }, [close, isSubmitting]);

  React.useEffect(() => {
    if (!isOpen) setPrompt('');
  }, [isOpen]);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || !card.id) return;
    const cardId = card.id;

    await runSubmit(
      async ({ keepPendingUntilClose }) => {
        const result = await cardMutations.tweakCard({
          id: cardId,
          prompt: trimmedPrompt,
        });

        if (result.success && result.queued) {
          close();
          keepPendingUntilClose();
        }
      },
      { suppressError: true }
    );
  }, [canSubmit, card.id, close, runSubmit, trimmedPrompt]);

  return (
    <Sheet
      loading={isOpen && card.isLoading}
      onDismiss={handleDismiss}
      open={isOpen}
      portalName="log-card-tweak"
      topInset={64}
    >
      <View className="mx-auto max-w-lg w-full pb-4">
        <View className="p-4 pb-4 md:p-4">
          <View className="overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border">
            <Textarea
              autoFocus
              className="border-0 rounded-none bg-transparent"
              maxLength={CARD_TWEAK_PROMPT_MAX_LENGTH}
              maxRows={6}
              minRows={3}
              onChangeText={setPrompt}
              placeholder="Adjust this card..."
              size="sm"
              value={prompt}
            />
          </View>
        </View>
        <View className="flex-row mx-8 gap-4 md:mx-8">
          <Button
            disabled={isSubmitting}
            onPress={close}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            disabled={!canSubmit}
            onPress={handleSubmit}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
            className={spectrumClassNames.getSpectrumBackgroundClassName(
              logColor.colorIndex
            )}
            interactiveClassName={cn(
              'active:opacity-90 web:hover:opacity-90',
              spectrumClassNames.getSpectrumInteractiveBackgroundClassName(
                logColor.colorIndex
              )
            )}
          >
            {isSubmitting ? (
              <Spinner color="white" />
            ) : (
              <Text className="text-white">Apply</Text>
            )}
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
