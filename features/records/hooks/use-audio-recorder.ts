import { alert } from '@/lib/alert';
import * as React from 'react';
import { Platform } from 'react-native';

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
} from 'expo-audio';

const MAX_DURATION = 300;

const MICROPHONE_PERMISSION_ALERT = {
  message: 'Allow access to record audio.',
  title: 'Microphone',
} as const;

const isMicrophonePermissionError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';

  return (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('not allowed')
  );
};

export const useAudioRecorder = () => {
  const [duration, setDuration] = React.useState(0);
  const [isRecording, setIsRecording] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [uri, setUri] = React.useState<string | null>(null);
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startTime = React.useRef(0);

  const [hasPermission, setHasPermission] = React.useState<boolean | null>(
    null
  );

  const isRecordingRef = React.useRef(false);
  const startRequestIdRef = React.useRef(0);

  const timerRef = React.useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const startTimer = React.useCallback(() => {
    startTime.current = Date.now();
    setDuration(0);

    timerRef.current = setInterval(() => {
      const next = Math.round((Date.now() - startTime.current) / 1000);
      setDuration((prev) => (prev === next ? prev : next));
    }, 500);
  }, []);

  const stopTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const resetAudioMode = React.useCallback(async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      // noop
    }
  }, []);

  const getWebRecorder = React.useCallback(() => {
    if (Platform.OS !== 'web') return null;

    return recorder as unknown as {
      analyser?: AnalyserNode | null;
      analyserBuffer?: Float32Array | null;
      analyserSource?: MediaStreamAudioSourceNode | null;
      clearTimeouts?: () => void;
      handleDeviceChange?: (() => void) | null;
      mediaRecorder?: MediaRecorder | null;
      mediaRecorderIsRecording?: boolean;
      stream?: MediaStream | null;
    };
  }, [recorder]);

  const releasePreparedRecorder = React.useCallback(() => {
    const webRecorder = getWebRecorder();
    if (!webRecorder) return;

    try {
      webRecorder.clearTimeouts?.();

      webRecorder.mediaRecorder?.stream
        ?.getTracks()
        .forEach((track) => track.stop());

      webRecorder.stream?.getTracks().forEach((track) => track.stop());

      if (webRecorder.handleDeviceChange) {
        navigator.mediaDevices?.removeEventListener(
          'devicechange',
          webRecorder.handleDeviceChange
        );

        webRecorder.handleDeviceChange = null;
      }

      webRecorder.analyserSource?.disconnect();
      webRecorder.analyserSource = null;
      webRecorder.analyser?.disconnect();
      webRecorder.analyser = null;
      webRecorder.analyserBuffer = null;
      webRecorder.mediaRecorder = null;
      webRecorder.mediaRecorderIsRecording = false;
      webRecorder.stream = null;
    } catch {
      // noop
    }
  }, [getWebRecorder]);

  const getRecordingUri = React.useCallback(() => {
    try {
      return recorder.uri ?? recorder.getStatus().url ?? null;
    } catch {
      return recorder.uri ?? null;
    }
  }, [recorder]);

  const abortPendingStart = React.useCallback(async () => {
    stopTimer();
    setIsRecording(false);

    if (Platform.OS === 'web') {
      releasePreparedRecorder();
      return;
    }

    try {
      const status = recorder.getStatus();
      if (status.canRecord || status.isRecording) await recorder.stop();
    } catch {
      // noop
    } finally {
      await resetAudioMode();
    }
  }, [recorder, releasePreparedRecorder, resetAudioMode, stopTimer]);

  React.useEffect(() => {
    (async () => {
      try {
        const result = await navigator.permissions?.query({
          name: 'microphone' as PermissionName,
        });

        if (result.state === 'granted') setHasPermission(true);
      } catch {
        // noop
      }
    })();
  }, []);

  const showMicrophonePermissionAlert = React.useCallback(() => {
    alert(MICROPHONE_PERMISSION_ALERT);
  }, []);

  React.useEffect(() => {
    if (isRecording && duration >= MAX_DURATION) {
      void (async () => {
        isRecordingRef.current = false;
        stopTimer();
        setIsRecording(false);

        try {
          await recorder.stop();
        } finally {
          setUri(getRecordingUri());
          await resetAudioMode();
        }
      })();
    }
  }, [
    duration,
    getRecordingUri,
    isRecording,
    recorder,
    resetAudioMode,
    stopTimer,
  ]);

  React.useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const record = React.useCallback(async () => {
    if (isRecordingRef.current) return;
    const requestId = ++startRequestIdRef.current;
    isRecordingRef.current = true;
    setStartError(null);
    setUri(null);

    try {
      if (Platform.OS !== 'web') {
        const permission = await requestRecordingPermissionsAsync();

        if (!permission.granted) {
          isRecordingRef.current = false;
          setHasPermission(false);
          showMicrophonePermissionAlert();
          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      await recorder.prepareToRecordAsync();

      if (requestId !== startRequestIdRef.current || !isRecordingRef.current) {
        isRecordingRef.current = false;
        await abortPendingStart();
        return;
      }

      if (Platform.OS === 'web' && !getWebRecorder()?.mediaRecorder) {
        throw new Error(
          'Microphone access did not finish initializing. Please try again.'
        );
      }

      recorder.record();

      if (requestId !== startRequestIdRef.current || !isRecordingRef.current) {
        isRecordingRef.current = false;
        await abortPendingStart();
        return;
      }

      setHasPermission(true);
      setStartError(null);
      setIsRecording(true);
      startTimer();
    } catch (error) {
      const wasCancelled =
        requestId !== startRequestIdRef.current || !isRecordingRef.current;

      const permissionDenied = isMicrophonePermissionError(error);
      isRecordingRef.current = false;

      if (wasCancelled) {
        await abortPendingStart();
        return;
      }

      setHasPermission((prev) => (permissionDenied ? false : prev));

      setStartError(
        permissionDenied
          ? null
          : error instanceof Error
            ? error.message
            : 'Unable to start recording. Please try again.'
      );

      if (permissionDenied) showMicrophonePermissionAlert();
      if (Platform.OS !== 'web') await resetAudioMode();
      releasePreparedRecorder();
    }
  }, [
    abortPendingStart,
    getWebRecorder,
    recorder,
    resetAudioMode,
    releasePreparedRecorder,
    showMicrophonePermissionAlert,
    startTimer,
  ]);

  const stop = React.useCallback(async () => {
    startRequestIdRef.current += 1;
    isRecordingRef.current = false;
    setStartError(null);
    stopTimer();
    setIsRecording(false);

    try {
      await recorder.stop();
    } finally {
      const nextUri = getRecordingUri();
      setUri(nextUri);
      await resetAudioMode();
    }

    return getRecordingUri();
  }, [getRecordingUri, recorder, resetAudioMode, stopTimer]);

  const reset = React.useCallback(() => {
    startRequestIdRef.current += 1;
    isRecordingRef.current = false;
    setStartError(null);
    stopTimer();
    releasePreparedRecorder();
    setIsRecording(false);
    setHasPermission(null);
    setDuration(0);
    setUri(null);
  }, [releasePreparedRecorder, stopTimer]);

  return {
    duration,
    hasPermission,
    isRecording,
    record,
    reset,
    startError,
    stop,
    uri,
  };
};
