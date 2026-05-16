import * as React from 'react';
import * as composerLatestText from '@/features/records/hooks/use-composer-latest-text';

type ComposerTextSessionOptions = {
  getOpenResetKey: (openSessionKey: string) => string;
  isOpen: boolean;
  text: string;
};

export const useComposerTextSession = ({
  getOpenResetKey,
  isOpen,
  text,
}: ComposerTextSessionOptions) => {
  const openSessionKey = composerLatestText.useComposerOpenSessionKey(isOpen);

  return composerLatestText.useComposerLatestText({
    resetKey: isOpen ? getOpenResetKey(openSessionKey) : 'closed',
    text,
  });
};

type ComposerDraftTextChangeOptions = {
  contentId?: string;
  isEdit: boolean;
  isEditingLocalEntry: boolean;
  setLatestText: (nextText: string) => void;
  skipMissingContentId?: boolean;
  updateLocalSubmissionText: (contentId: string, nextText: string) => void;
  updateServerDraftText: (nextText: string) => void;
  updateServerEditText?: (contentId: string, nextText: string) => void;
};

export const useComposerDraftTextChange = ({
  contentId,
  isEdit,
  isEditingLocalEntry,
  setLatestText,
  skipMissingContentId = false,
  updateLocalSubmissionText,
  updateServerDraftText,
  updateServerEditText,
}: ComposerDraftTextChangeOptions) =>
  React.useCallback(
    (nextText: string) => {
      setLatestText(nextText);
      if (!contentId && skipMissingContentId) return;

      if (isEdit) {
        if (isEditingLocalEntry) {
          if (contentId) updateLocalSubmissionText(contentId, nextText);
          return;
        }

        if (!contentId) return;

        if (updateServerEditText) {
          updateServerEditText(contentId, nextText);
          return;
        }

        updateServerDraftText(nextText);
        return;
      }

      updateServerDraftText(nextText);
    },
    [
      contentId,
      isEdit,
      isEditingLocalEntry,
      setLatestText,
      skipMissingContentId,
      updateLocalSubmissionText,
      updateServerDraftText,
      updateServerEditText,
    ]
  );
