import {
  RecordingPresets,
  useAudioRecorder as useExpoAudioRecorder,
} from 'expo-audio';
import * as React from 'react';

const MAX_DURATION = 300;

export const useAudioRecorder = () => {
  const [duration, setDuration] = React.useState(0);
  const [isRecording, setIsRecording] = React.useState(false);
  const [level, setLevel] = React.useState(0);
  const [uri, setUri] = React.useState<string | null>(null);
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startTime = React.useRef(0);

  const [hasPermission, setHasPermission] = React.useState<boolean | null>(
    null
  );

  const timerRef = React.useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const analyserRef = React.useRef<{
    ctx: AudioContext;
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    buffer: Float32Array;
    raf: number;
  } | null>(null);

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

  const startLevelTracking = React.useCallback((stream: MediaStream) => {
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

  const stopLevelTracking = React.useCallback(() => {
    if (analyserRef.current) {
      cancelAnimationFrame(analyserRef.current.raf);
      analyserRef.current.source.disconnect();
      analyserRef.current.analyser.disconnect();
      analyserRef.current.ctx.close();
      analyserRef.current = null;
    }

    setLevel(0);
  }, []);

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

  React.useEffect(() => {
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

  React.useEffect(() => {
    return () => {
      stopTimer();
      stopLevelTracking();
    };
  }, [stopLevelTracking, stopTimer]);

  const record = React.useCallback(async () => {
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

  const stop = React.useCallback(async () => {
    stopLevelTracking();
    stopTimer();
    setIsRecording(false);
    await recorder.stop();
    setUri(recorder.uri);
    return recorder.uri;
  }, [recorder, stopLevelTracking, stopTimer]);

  const reset = React.useCallback(() => {
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
