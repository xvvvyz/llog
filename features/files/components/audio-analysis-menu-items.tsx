import * as audioAnalysis from '@/domain/files/audio-analysis';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import * as audioAnalysisMutations from '@/features/files/mutations/audio-analysis';
import type { FileItem } from '@/features/files/types/file';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

import {
  MusicNotes,
  TextT,
  TextTSlash,
  type IconProps,
} from 'phosphor-react-native';

export type AudioAnalysisMenuFile = Pick<
  FileItem,
  | 'duration'
  | 'id'
  | 'identificationRequestedAt'
  | 'isIdentifying'
  | 'isTranscribing'
  | 'size'
  | 'tracks'
  | 'transcriptionRequestedAt'
  | 'transcript'
  | 'type'
>;

type AudioAnalysisMenuState = {
  canClearTranscription: boolean;
  canIdentify: boolean;
  canTranscribe: boolean;
  hasMenuItems: boolean;
  identifyMusicLabel: string;
  isIdentificationDisabled: boolean;
  isTranscriptionDisabled: boolean;
  transcribeLabel: string | null;
};

const getAudioAnalysisMenuState = ({
  canAnalyze,
  file,
}: {
  canAnalyze?: boolean;
  file?: AudioAnalysisMenuFile;
}): AudioAnalysisMenuState | null => {
  if (
    !canAnalyze ||
    !file?.id ||
    !audioAnalysis.isAudioAnalysisFileType(file.type)
  ) {
    return null;
  }

  const hasTranscript =
    file.transcript != null &&
    audioMetadata.parseTranscriptSegments(file.transcript).length > 0;

  const hasEmptyTranscriptResult = file.transcript != null && !hasTranscript;

  const isAudioTooShort = audioAnalysis.isAudioAnalysisDurationTooShort(
    file.duration
  );

  const isTranscriptionTooLong = audioAnalysis.isTranscriptionDurationTooLong(
    file.duration
  );

  const isTranscriptionTooLarge =
    file.type === 'audio' &&
    audioAnalysis.isTranscriptionUploadTooLarge(file.size);

  const isIdentifying =
    !!file.identificationRequestedAt || !!file.isIdentifying;

  const isTranscribing =
    !!file.transcriptionRequestedAt || !!file.isTranscribing;

  const canIdentify =
    audioAnalysis.canIdentifyAudioAnalysisFile(file) ||
    isAudioTooShort ||
    isIdentifying ||
    file.tracks != null;

  const canTranscribe =
    audioAnalysis.canTranscribeAudioAnalysisFile(file) ||
    hasEmptyTranscriptResult ||
    isAudioTooShort ||
    isTranscriptionTooLong ||
    isTranscriptionTooLarge ||
    isTranscribing;

  const canClearTranscription = file.transcript != null;

  const hasIdentifiedMusic =
    file.tracks != null &&
    audioMetadata.parseAudioTracks(file.tracks).length > 0;

  const transcribeLabel =
    file.transcript == null
      ? isAudioTooShort
        ? 'Too short to transcribe'
        : isTranscriptionTooLong
          ? 'Too long to transcribe'
          : isTranscriptionTooLarge
            ? 'Too large to transcribe'
            : 'Transcribe'
      : hasTranscript
        ? null
        : isAudioTooShort
          ? 'Too short to transcribe'
          : 'No speech';

  const identifyMusicLabel =
    file.tracks == null
      ? isAudioTooShort
        ? 'Too short to identify'
        : 'Identify songs'
      : hasIdentifiedMusic
        ? 'Songs identified'
        : isAudioTooShort
          ? 'Too short to identify'
          : 'No songs identified';

  return {
    canClearTranscription,
    canIdentify,
    canTranscribe,
    hasMenuItems: canIdentify || canTranscribe || canClearTranscription,
    identifyMusicLabel,
    isIdentificationDisabled: file.tracks != null || isAudioTooShort,
    isTranscriptionDisabled:
      file.transcript != null ||
      isAudioTooShort ||
      isTranscriptionTooLong ||
      isTranscriptionTooLarge,
    transcribeLabel,
  };
};

export const shouldShowAudioAnalysisMenu = (params: {
  canAnalyze?: boolean;
  file?: AudioAnalysisMenuFile;
}) => getAudioAnalysisMenuState(params)?.hasMenuItems === true;

const PendingMenuIcon = ({
  icon,
  isPending,
}: {
  icon: React.ComponentType<IconProps>;
  isPending: boolean;
}) => {
  if (isPending) {
    return (
      <View className="size-5 items-center justify-center">
        <Spinner size="xs" />
      </View>
    );
  }

  return <Icon className="text-placeholder" icon={icon} />;
};

const AudioAnalysisMenuItem = ({
  disabled,
  icon,
  isPending,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ComponentType<IconProps>;
  isPending: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Menu.Item
    closeOnPress={false}
    disabled={disabled || isPending}
    onPress={onPress}
  >
    <PendingMenuIcon icon={icon} isPending={isPending} />
    <Text>{label}</Text>
  </Menu.Item>
);

export const AudioAnalysisMenuItems = ({
  actionsDisabled,
  canAnalyze,
  file,
}: {
  actionsDisabled?: boolean;
  canAnalyze?: boolean;
  file?: AudioAnalysisMenuFile;
}) => {
  const [isRequestingIdentification, setIsRequestingIdentification] =
    React.useState(false);

  const [isRequestingTranscription, setIsRequestingTranscription] =
    React.useState(false);

  const [isClearingTranscription, setIsClearingTranscription] =
    React.useState(false);

  const isRequestingIdentificationRef = React.useRef(false);
  const isRequestingTranscriptionRef = React.useRef(false);
  const isClearingTranscriptionRef = React.useRef(false);

  const clearRequestingIdentification = React.useCallback(() => {
    isRequestingIdentificationRef.current = false;
    setIsRequestingIdentification(false);
  }, []);

  const clearRequestingTranscription = React.useCallback(() => {
    isRequestingTranscriptionRef.current = false;
    setIsRequestingTranscription(false);
  }, []);

  const clearClearingTranscription = React.useCallback(() => {
    isClearingTranscriptionRef.current = false;
    setIsClearingTranscription(false);
  }, []);

  React.useEffect(() => {
    clearRequestingIdentification();
    clearRequestingTranscription();
    clearClearingTranscription();
  }, [
    clearClearingTranscription,
    clearRequestingIdentification,
    clearRequestingTranscription,
    file?.id,
  ]);

  React.useEffect(() => {
    if (
      file?.identificationRequestedAt ||
      file?.isIdentifying ||
      file?.tracks != null
    ) {
      clearRequestingIdentification();
    }
  }, [
    clearRequestingIdentification,
    file?.identificationRequestedAt,
    file?.isIdentifying,
    file?.tracks,
  ]);

  React.useEffect(() => {
    if (
      file?.transcriptionRequestedAt ||
      file?.isTranscribing ||
      file?.transcript != null
    ) {
      clearRequestingTranscription();
    }
  }, [
    clearRequestingTranscription,
    file?.isTranscribing,
    file?.transcript,
    file?.transcriptionRequestedAt,
  ]);

  React.useEffect(() => {
    if (file?.transcript == null) clearClearingTranscription();
  }, [clearClearingTranscription, file?.transcript]);

  const menuState = getAudioAnalysisMenuState({ canAnalyze, file });
  if (!file?.id || !menuState?.hasMenuItems) return null;
  const isActionUnavailable = actionsDisabled;
  const isActionDisabled = actionsDisabled;

  const isIdentificationQueued =
    !!file.identificationRequestedAt || !!file.isIdentifying;

  const isTranscriptionQueued =
    !!file.transcriptionRequestedAt || !!file.isTranscribing;

  const identifyMusic = async () => {
    if (!file.id || isActionUnavailable) return;
    if (isRequestingIdentificationRef.current) return;
    isRequestingIdentificationRef.current = true;
    setIsRequestingIdentification(true);

    try {
      await audioAnalysisMutations.detectAudioFileMusic({ fileId: file.id });
    } catch {
      clearRequestingIdentification();
      // noop
    }
  };

  const transcribe = async () => {
    if (!file.id || isActionUnavailable) return;
    if (isRequestingTranscriptionRef.current) return;
    isRequestingTranscriptionRef.current = true;
    setIsRequestingTranscription(true);

    try {
      await audioAnalysisMutations.transcribeAudioFile({ fileId: file.id });
    } catch {
      clearRequestingTranscription();
      // noop
    }
  };

  const clearTranscription = async () => {
    if (!file.id || isActionUnavailable) return;
    if (isClearingTranscriptionRef.current) return;
    isClearingTranscriptionRef.current = true;
    setIsClearingTranscription(true);

    try {
      await audioAnalysisMutations.clearAudioFileTranscription({
        fileId: file.id,
      });
    } catch {
      clearClearingTranscription();
      // noop
    }
  };

  return (
    <React.Fragment>
      {menuState.canTranscribe && menuState.transcribeLabel && (
        <AudioAnalysisMenuItem
          disabled={menuState.isTranscriptionDisabled || isActionDisabled}
          icon={TextT}
          isPending={isTranscriptionQueued || isRequestingTranscription}
          label={menuState.transcribeLabel}
          onPress={transcribe}
        />
      )}
      {menuState.canClearTranscription && (
        <AudioAnalysisMenuItem
          disabled={isActionDisabled}
          icon={TextTSlash}
          isPending={isClearingTranscription}
          label="Clear transcript"
          onPress={clearTranscription}
        />
      )}
      {menuState.canIdentify && (
        <AudioAnalysisMenuItem
          disabled={menuState.isIdentificationDisabled || isActionDisabled}
          icon={MusicNotes}
          isPending={isIdentificationQueued || isRequestingIdentification}
          label={menuState.identifyMusicLabel}
          onPress={identifyMusic}
        />
      )}
    </React.Fragment>
  );
};
