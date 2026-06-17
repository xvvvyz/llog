import { useUploadProgress } from '@/features/files/lib/upload-progress-store';
import { useQueuedAttachmentStatus } from '@/features/offline/outbox-hooks';
import type { QueuedAttachmentStatus } from '@/features/offline/types';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type SpinnerSize = 'icon' | 'sm' | 'xs' | 'xxs';
// `bottom` floats the bar along the bottom edge (composer thumbnail); `spinner`
// stacks a percent label + short bar in the centered spinner slot used by the
// timeline + lightbox.
type BarLayout = 'bottom' | 'spinner';
const PROGRESS_ANIMATION_DURATION_MS = 500;
// A full-bleed dark scrim is the contrast backdrop, so the white label/bar/
// spinner read over any media in either theme (the parent clips its corners).
const SCRIM_CLASS = 'absolute inset-0 z-[4] bg-black/40 pointer-events-none';
const LABEL_CLASS = 'font-bold leading-4 text-white text-xs';

// Shows the upload state for a single visual file. The byte-upload progress and
// queued status are looked up by file id, so this works wherever a file renders:
// the composer, the timeline grid, and the lightbox. `status` lets the composer
// pass the pending item's status directly; `isProcessing` lets read-only
// surfaces flag a server-side (Cloudflare Stream) encode that has no outbox row.
export const UploadProgressOverlay = ({
  barLayout = 'bottom',
  fileId,
  isProcessing,
  isVideo,
  spinnerSize = 'xs',
  status: statusProp,
}: {
  barLayout?: BarLayout;
  fileId: string;
  isProcessing?: boolean;
  isVideo: boolean;
  spinnerSize?: SpinnerSize;
  status?: QueuedAttachmentStatus;
}) => {
  const progress = useUploadProgress(fileId);
  const queuedStatus = useQueuedAttachmentStatus(fileId);
  const status = statusProp ?? queuedStatus;

  // Bytes haven't landed yet: queued, persisting, or actively uploading.
  const isUploadingBytes =
    status === 'persisting' || status === 'queued' || status === 'uploading';

  // Videos show a determinate bar from the moment they're queued (0% until the
  // first chunk reports). Images — and post-upload encoding — show the spinner.
  const showBar = isVideo && isUploadingBytes;

  const showSpinner =
    !showBar &&
    (isUploadingBytes || status === 'uploaded' || (isVideo && !!isProcessing));

  // Ease the fill between the discrete per-chunk progress jumps.
  const progressValue = useSharedValue(progress ?? 0);

  React.useEffect(() => {
    progressValue.value = withTiming(progress ?? 0, {
      duration: PROGRESS_ANIMATION_DURATION_MS,
    });
  }, [progress, progressValue]);

  // The animated width is the one value that can't be a class.
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  // Step the percent label up with the bar instead of jumping per chunk.
  const [displayPercent, setDisplayPercent] = React.useState(() =>
    Math.round((progress ?? 0) * 100)
  );

  useAnimatedReaction(
    () => Math.round(progressValue.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setDisplayPercent)(current);
    }
  );

  if (!showBar && !showSpinner) return null;

  const fill = (
    <Animated.View
      className="h-full border-continuous rounded-full bg-white"
      style={fillStyle}
    />
  );

  // Percent label above a short bar, or a spinner while queued/encoding.
  if (barLayout === 'spinner') {
    return (
      <View className={`${SCRIM_CLASS} items-center justify-center`}>
        {showBar ? (
          <>
            <Text className={LABEL_CLASS}>{`${displayPercent}%`}</Text>
            <View className="overflow-hidden mt-3 h-1 w-12 rounded-full bg-white/30">
              {fill}
            </View>
          </>
        ) : (
          showSpinner && <Spinner color="white" size={spinnerSize} />
        )}
      </View>
    );
  }

  return (
    <View className={SCRIM_CLASS}>
      {showSpinner && (
        <View className="absolute inset-0 items-center justify-center">
          <Spinner color="white" size={spinnerSize} />
        </View>
      )}
      {showBar && (
        <View className="absolute bottom-2 inset-x-2 gap-1">
          <Text className={LABEL_CLASS}>{`${displayPercent}%`}</Text>
          <View className="overflow-hidden h-1 rounded-full bg-white/30">
            {fill}
          </View>
        </View>
      )}
    </View>
  );
};
