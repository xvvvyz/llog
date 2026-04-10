import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_DURATION = 300;

export const useAudioRecorderHook = () => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
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

  useEffect(() => {
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

  useEffect(() => {
    if (isRecording && duration >= MAX_DURATION) {
      (async () => {
        stopLevelTracking();
        stopTimer();
        setIsRecording(false);
        await recorder.stop();
        setUri(recorder.uri);
      })();
    }
  }, [duration, isRecording, recorder, stopLevelTracking, stopTimer]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopLevelTracking();
    };
  }, [stopLevelTracking, stopTimer]);

  const record = useCallback(async () => {
    setUri(null);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();

        const stream = (recorder as unknown as { stream: MediaStream | null })
          .stream;

        if (stream) startLevelTracking(stream);
        setHasPermission(true);
        setIsRecording(true);
        startTimer();
        return;
      } catch {
        // First attempt may fail while OS permission prompt is resolving.
        // Retry once before giving up.
      }
    }

    setHasPermission(false);
  }, [recorder, startLevelTracking, startTimer]);

  const stop = useCallback(async () => {
    stopLevelTracking();
    stopTimer();
    setIsRecording(false);
    await recorder.stop();
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
    reset,
    stop,
    uri,
  };
};
