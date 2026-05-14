import * as audioAnalysis from '@/domain/files/audio-analysis';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import * as audioAnalysisMutations from '@/features/files/mutations/audio-analysis';
import type { FileItem } from '@/features/files/types/file';
import { useConnectivity } from '@/features/offline/connectivity';
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
  | 'isIdentifying'
  | 'isTranscribing'
  | 'size'
  | 'tracks'
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

  const canIdentify =
    audioAnalysis.canIdentifyAudioAnalysisFile(file) ||
    isAudioTooShort ||
    !!file.isIdentifying ||
    file.tracks != null;

  const canTranscribe =
    audioAnalysis.canTranscribeAudioAnalysisFile(file) ||
    hasEmptyTranscriptResult ||
    isAudioTooShort ||
    isTranscriptionTooLong ||
    isTranscriptionTooLarge ||
    !!file.isTranscribing;

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
        : 'Identify music'
      : hasIdentifiedMusic
        ? 'Music identified'
        : isAudioTooShort
          ? 'Too short to identify'
          : 'No music';

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
    <Text className={disabled || isPending ? 'text-placeholder' : ''}>
      {label}
    </Text>
  </Menu.Item>
);

export const AudioAnalysisMenuItems = ({
  canAnalyze,
  file,
}: {
  canAnalyze?: boolean;
  file?: AudioAnalysisMenuFile;
}) => {
  const connectivity = useConnectivity();

  const [isRequestingIdentification, setIsRequestingIdentification] =
    React.useState(false);

  const [isRequestingTranscription, setIsRequestingTranscription] =
    React.useState(false);

  const [isClearingTranscription, setIsClearingTranscription] =
    React.useState(false);

  const isRequestingIdentificationRef = React.useRef(false);
  const isRequestingTranscriptionRef = React.useRef(false);
  const isClearingTranscriptionRef = React.useRef(false);

  React.useEffect(() => {
    if (file?.transcript == null) setIsClearingTranscription(false);
  }, [file?.transcript]);

  const menuState = getAudioAnalysisMenuState({ canAnalyze, file });
  if (!file?.id || !menuState?.hasMenuItems) return null;

  const identifyMusic = async () => {
    if (!file.id || isRequestingIdentificationRef.current) return;
    isRequestingIdentificationRef.current = true;
    setIsRequestingIdentification(true);

    try {
      await audioAnalysisMutations.detectAudioFileMusic({ fileId: file.id });
    } catch {
      // noop
    } finally {
      isRequestingIdentificationRef.current = false;
      setIsRequestingIdentification(false);
    }
  };

  const transcribe = async () => {
    if (!file.id || isRequestingTranscriptionRef.current) return;
    isRequestingTranscriptionRef.current = true;
    setIsRequestingTranscription(true);

    try {
      await audioAnalysisMutations.transcribeAudioFile({ fileId: file.id });
    } catch {
      // noop
    } finally {
      isRequestingTranscriptionRef.current = false;
      setIsRequestingTranscription(false);
    }
  };

  const clearTranscription = async () => {
    if (!file.id || isClearingTranscriptionRef.current) return;
    isClearingTranscriptionRef.current = true;
    setIsClearingTranscription(true);

    try {
      await audioAnalysisMutations.clearAudioFileTranscription({
        fileId: file.id,
      });
    } catch {
      // noop
    } finally {
      isClearingTranscriptionRef.current = false;
      setIsClearingTranscription(false);
    }
  };

  return (
    <React.Fragment>
      {menuState.canTranscribe && menuState.transcribeLabel && (
        <AudioAnalysisMenuItem
          icon={TextT}
          isPending={!!file.isTranscribing || isRequestingTranscription}
          label={menuState.transcribeLabel}
          onPress={transcribe}
          disabled={
            menuState.isTranscriptionDisabled ||
            !connectivity.canRunNetworkActions
          }
        />
      )}
      {menuState.canClearTranscription && (
        <AudioAnalysisMenuItem
          disabled={!connectivity.canRunNetworkActions}
          icon={TextTSlash}
          isPending={isClearingTranscription}
          label="Clear transcript"
          onPress={clearTranscription}
        />
      )}
      {menuState.canIdentify && (
        <AudioAnalysisMenuItem
          icon={MusicNotes}
          isPending={!!file.isIdentifying || isRequestingIdentification}
          label={menuState.identifyMusicLabel}
          onPress={identifyMusic}
          disabled={
            menuState.isIdentificationDisabled ||
            !connectivity.canRunNetworkActions
          }
        />
      )}
    </React.Fragment>
  );
};
