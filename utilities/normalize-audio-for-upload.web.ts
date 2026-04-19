const TARGET_SAMPLE_RATE = 24_000;

const createAudioContext = () => {
  const AudioContextCtor =
    globalThis.AudioContext ??
    (
      globalThis as typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  return AudioContextCtor ? new AudioContextCtor() : null;
};

const encodeWav = (buffer: AudioBuffer) => {
  const channelData = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = buffer.sampleRate * blockAlign;
  const dataSize = channelData.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;

  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const resampleToMonoWav = async (audioBuffer: AudioBuffer) => {
  const frameCount = Math.ceil(
    (audioBuffer.duration || audioBuffer.length / audioBuffer.sampleRate) *
      TARGET_SAMPLE_RATE
  );

  const offlineContext = new OfflineAudioContext(
    1,
    frameCount,
    TARGET_SAMPLE_RATE
  );
  const monoBuffer = offlineContext.createBuffer(
    1,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const monoData = monoBuffer.getChannelData(0);

  for (
    let channelIndex = 0;
    channelIndex < audioBuffer.numberOfChannels;
    channelIndex++
  ) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (let i = 0; i < channelData.length; i++) {
      monoData[i] += channelData[i] / audioBuffer.numberOfChannels;
    }
  }

  const source = offlineContext.createBufferSource();
  source.buffer = monoBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const rendered = await offlineContext.startRendering();
  return encodeWav(rendered);
};

export const normalizeAudioForUpload = async (blob: Blob) => {
  if (!blob.type.includes('webm') && !blob.type.includes('ogg')) {
    return new File([blob], 'recording.m4a', {
      type: blob.type || 'audio/mp4',
    });
  }

  const audioContext = createAudioContext();

  if (!audioContext) {
    return new File([blob], 'recording.webm', {
      type: blob.type || 'audio/webm',
    });
  }

  try {
    const data = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(data);
    const normalized = await resampleToMonoWav(decoded);
    return new File([normalized], 'recording.wav', { type: normalized.type });
  } catch {
    return new File([blob], 'recording.webm', {
      type: blob.type || 'audio/webm',
    });
  } finally {
    try {
      await audioContext.close();
    } catch {
      // noop
    }
  }
};
