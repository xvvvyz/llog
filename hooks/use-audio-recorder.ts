import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_DURATION = 300;

export const useAudioRecorderHook = () => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [level, setLevel] = useState(0);
  const startTime = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const analyserRef = useRef<{
    ctx: AudioContext;
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    buffer: Float32Array;
    raf: number;
  } | null>(null);

  const startTimer = useCallback(() => {
    startTime.current = Date.now();
    setDuration(0);

    timerRef.current = setInterval(() => {
      const next = Math.round((Date.now() - startTime.current) / 1000);
      setDuration((prev) => (prev === next ? prev : next));
    }, 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const startLevelTracking = useCallback((stream: MediaStream) => {
    if (typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.frequencyBinCount);
    let frameCount = 0;

    const tick = () => {
      if (!analyserRef.current) return;
      frameCount++;

      if (frameCount % 4 === 0) {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;

        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }

        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, rms * 4));
      }

      analyserRef.current.raf = requestAnimationFrame(tick);
    };

    analyserRef.current = {
      ctx,
      source,
      analyser,
      buffer,
      raf: requestAnimationFrame(tick),
    };
  }, []);

  const stopLevelTracking = useCallback(() => {
    if (analyserRef.current) {
      cancelAnimationFrame(analyserRef.current.raf);
      analyserRef.current.source.disconnect();
      analyserRef.current.analyser.disconnect();
      analyserRef.current.ctx.close();
      analyserRef.current = null;
    }

    setLevel(0);
  }, []);

  // check if permission is already granted
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((result) => {
        if (result.state === 'granted') setHasPermission(true);
      });
  }, []);

  useEffect(() => {
    if (isRecording && duration >= MAX_DURATION) {
      recorder.stop();
      stopTimer();
      setIsRecording(false);
    }
  }, [duration, isRecording, recorder, stopTimer]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopLevelTracking();
    };
  }, [stopLevelTracking, stopTimer]);

  const requestPermission = useCallback(async () => {
    try {
      await recorder.prepareToRecordAsync();
      setHasPermission(true);
      return true;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, [recorder]);

  const record = useCallback(async () => {
    try {
      setUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();

      // access the stream from the recorder to track audio levels
      const stream = (recorder as unknown as { stream: MediaStream | null })
        .stream;

      if (stream) startLevelTracking(stream);
      setIsRecording(true);
      startTimer();
    } catch {
      setHasPermission(false);
    }
  }, [recorder, startLevelTracking, startTimer]);

  const stop = useCallback(async () => {
    stopLevelTracking();
    await recorder.stop();
    stopTimer();
    setIsRecording(false);
    setUri(recorder.uri);
    return recorder.uri;
  }, [recorder, stopLevelTracking, stopTimer]);

  const reset = useCallback(() => {
    setDuration(0);
    setUri(null);
  }, []);

  return {
    duration,
    hasPermission,
    isRecording,
    level,
    record,
    requestPermission,
    reset,
    stop,
    uri,
  };
};
