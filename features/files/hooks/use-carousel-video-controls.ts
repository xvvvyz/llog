import { useUi } from '@/features/account/queries/use-ui';
import { FileItem } from '@/features/files/types/file';
import type { VideoPlayerHandle } from '@/features/files/types/video-player';
import { db } from '@/lib/db';
import * as React from 'react';

const VIDEO_TIME_UI_RESOLUTION_SECONDS = 0.1;

export const useCarouselVideoControls = ({
  activeIndexState,
  isPlaying,
  files,
  setIsPlaying,
  setVideoPlaybackIntent,
  videoHandleRef,
}: {
  activeIndexState: number;
  isPlaying: boolean;
  files: FileItem[];
  setIsPlaying: (isPlaying: boolean) => void;
  setVideoPlaybackIntent: (fileId: string, shouldPlay: boolean) => void;
  videoHandleRef: React.RefObject<VideoPlayerHandle | null>;
}) => {
  const { id: uiId, videoMuted } = useUi();
  const [isMuted, setIsMuted] = React.useState(videoMuted);

  const [{ videoCurrentTime, videoDuration }, setVideoUiState] = React.useState(
    { videoCurrentTime: 0, videoDuration: 0 }
  );

  const isScrubbingVideoRef = React.useRef(false);
  const wasPlayingBeforeVideoScrubRef = React.useRef(false);
  const scrubPreviewFrameRef = React.useRef<number | null>(null);
  const scrubPreviewTargetRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setIsMuted(videoMuted);
  }, [videoMuted]);

  React.useEffect(() => {
    return () => {
      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
      }
    };
  }, []);

  const resetVideoUiState = React.useCallback(() => {
    if (scrubPreviewFrameRef.current != null) {
      cancelAnimationFrame(scrubPreviewFrameRef.current);
      scrubPreviewFrameRef.current = null;
    }

    scrubPreviewTargetRef.current = null;
    videoHandleRef.current?.setScrubbingEnabled(false);
    isScrubbingVideoRef.current = false;
    wasPlayingBeforeVideoScrubRef.current = false;

    setVideoUiState((currentState) => {
      if (
        currentState.videoCurrentTime === 0 &&
        currentState.videoDuration === 0
      ) {
        return currentState;
      }

      return { videoCurrentTime: 0, videoDuration: 0 };
    });
  }, [videoHandleRef]);

  const handleToggleMute = React.useCallback(() => {
    const muted = videoHandleRef.current?.toggleMute();

    if (muted != null) {
      setIsMuted(muted);
      if (uiId) db.transact(db.tx.ui[uiId].update({ videoMuted: muted }));
    }
  }, [uiId, videoHandleRef]);

  const handleTogglePlay = React.useCallback(() => {
    const activeMedia = files[activeIndexState];
    if (activeMedia?.type !== 'video') return;

    if (isPlaying) {
      videoHandleRef.current?.pause();
      setVideoPlaybackIntent(activeMedia.id, false);
      setIsPlaying(false);
      return;
    }

    setVideoPlaybackIntent(activeMedia.id, true);
    setIsPlaying(true);
    videoHandleRef.current?.play();
  }, [
    activeIndexState,
    isPlaying,
    files,
    setIsPlaying,
    setVideoPlaybackIntent,
    videoHandleRef,
  ]);

  const pauseVideo = React.useCallback(() => {
    const activeMedia = files[activeIndexState];
    if (activeMedia?.type !== 'video') return;
    videoHandleRef.current?.pause();
    setVideoPlaybackIntent(activeMedia.id, false);
    setIsPlaying(false);
  }, [
    activeIndexState,
    files,
    setIsPlaying,
    setVideoPlaybackIntent,
    videoHandleRef,
  ]);

  const playVideoFrom = React.useCallback(
    (seconds: number) => {
      const activeMedia = files[activeIndexState];
      const handle = videoHandleRef.current;
      if (activeMedia?.type !== 'video' || !handle) return;

      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
        scrubPreviewFrameRef.current = null;
      }

      scrubPreviewTargetRef.current = null;
      isScrubbingVideoRef.current = false;
      handle.setScrubbingEnabled(false);

      const nextTime =
        videoDuration > 0
          ? Math.max(0, Math.min(seconds, videoDuration))
          : Math.max(0, seconds);

      setVideoUiState((currentState) => ({
        ...currentState,
        videoCurrentTime: nextTime,
      }));

      setVideoPlaybackIntent(activeMedia.id, true);
      setIsPlaying(true);
      handle.seekTo(nextTime);
      handle.play();
    },
    [
      activeIndexState,
      files,
      setIsPlaying,
      setVideoPlaybackIntent,
      videoDuration,
      videoHandleRef,
    ]
  );

  const handleVideoTimeChange = React.useCallback(
    (currentTime: number, duration: number) => {
      if (isScrubbingVideoRef.current) return;

      const nextVideoCurrentTime = Number(
        (
          Math.floor(
            Math.max(0, currentTime) / VIDEO_TIME_UI_RESOLUTION_SECONDS
          ) * VIDEO_TIME_UI_RESOLUTION_SECONDS
        ).toFixed(1)
      );

      const nextVideoDuration = Math.max(0, duration);

      setVideoUiState((currentState) => {
        const hasCurrentTimeChanged =
          currentState.videoCurrentTime !== nextVideoCurrentTime;

        const hasDurationChanged =
          currentState.videoDuration !== nextVideoDuration;

        if (!hasCurrentTimeChanged && !hasDurationChanged) return currentState;

        return {
          videoCurrentTime: hasCurrentTimeChanged
            ? nextVideoCurrentTime
            : currentState.videoCurrentTime,
          videoDuration: hasDurationChanged
            ? nextVideoDuration
            : currentState.videoDuration,
        };
      });
    },
    []
  );

  const startVideoScrub = React.useCallback(() => {
    const handle = videoHandleRef.current;
    if (!handle || videoDuration <= 0) return;
    isScrubbingVideoRef.current = true;
    wasPlayingBeforeVideoScrubRef.current = isPlaying;
    handle.setScrubbingEnabled(true);
    if (isPlaying) handle.pause();
  }, [isPlaying, videoDuration, videoHandleRef]);

  const previewVideoScrub = React.useCallback(
    (seconds: number) => {
      const nextTime = Math.max(0, Math.min(seconds, videoDuration));
      scrubPreviewTargetRef.current = nextTime;
      if (scrubPreviewFrameRef.current != null) return;

      scrubPreviewFrameRef.current = requestAnimationFrame(() => {
        scrubPreviewFrameRef.current = null;
        const targetTime = scrubPreviewTargetRef.current;
        scrubPreviewTargetRef.current = null;
        if (targetTime == null) return;

        setVideoUiState((currentState) => {
          if (currentState.videoCurrentTime === targetTime) return currentState;
          return { ...currentState, videoCurrentTime: targetTime };
        });

        videoHandleRef.current?.seekTo(targetTime);
      });
    },
    [videoDuration, videoHandleRef]
  );

  const commitVideoScrub = React.useCallback(
    (seconds: number) => {
      const handle = videoHandleRef.current;
      const nextTime = Math.max(0, Math.min(seconds, videoDuration));
      const shouldResumePlayback = wasPlayingBeforeVideoScrubRef.current;

      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
        scrubPreviewFrameRef.current = null;
      }

      scrubPreviewTargetRef.current = null;

      setVideoUiState((currentState) => {
        if (currentState.videoCurrentTime === nextTime) return currentState;
        return { ...currentState, videoCurrentTime: nextTime };
      });

      handle?.setScrubbingEnabled(false);
      handle?.seekTo(nextTime);
      isScrubbingVideoRef.current = false;

      if (shouldResumePlayback) {
        setIsPlaying(true);
        handle?.play();
      }
    },
    [setIsPlaying, videoDuration, videoHandleRef]
  );

  return {
    commitVideoScrub,
    handleToggleMute,
    handleTogglePlay,
    handleVideoTimeChange,
    isMuted,
    pauseVideo,
    playVideoFrom,
    previewVideoScrub,
    resetVideoUiState,
    startVideoScrub,
    videoCurrentTime,
    videoDuration,
  };
};
