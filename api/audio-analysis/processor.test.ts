import { afterAll, describe, expect, mock, test } from 'bun:test';

type TestAudioFile = {
  assetKey?: string;
  duration?: number;
  id: string;
  isIdentifying?: boolean;
  isTranscribing?: boolean;
  tracks?: unknown;
  transcript?: unknown;
  type?: string;
  identificationRequestedAt?: string | null;
  transcriptionRequestedAt?: string | null;
};

const requestedAt = '2026-05-20T00:00:00.000Z';
let file: TestAudioFile | undefined;
let sourceResult: unknown = { status: 'pending' };
let transcriptResult: unknown = [{ end: 1, start: 0, text: 'hello' }];
const updates: Record<string, unknown>[] = [];
const getAudioFile = mock(async () => file);

const updateAudioFile = mock(
  async (_db: unknown, _fileId: string, fields: Record<string, unknown>) => {
    updates.push(fields);
    file = file ? { ...file, ...fields } : file;
  }
);

const resolveAudioAnalysisSource = mock(async () => sourceResult);
const transcribeAudioFile = mock(async () => transcriptResult);
const transcribeAudioUrl = mock(async () => transcriptResult);

const recognizeAudioFileMusic = mock(async () => ({
  audd: { status: 'success' },
  tracks: [{ artist: 'Artist', title: 'Song' }],
}));

mock.module('@/api/audio-analysis/repository', () => ({
  getAudioFile,
  updateAudioFile,
}));

mock.module('@/api/audio-analysis/source', () => ({
  hasAudioAnalysisAssetFile: (value?: TestAudioFile) =>
    !!value?.id &&
    !!value.assetKey &&
    (value.type === 'audio' || value.type === 'video'),
  resolveAudioAnalysisSource,
}));

mock.module('@/api/audio-analysis/openai', () => ({
  transcribeAudioFile,
  transcribeAudioUrl,
}));

mock.module('@/api/audio-analysis/audd-client', () => ({
  recognizeAudioFileMusic,
}));

const processor = await import('@/api/audio-analysis/processor');
const db = {} as never;
const env = { R2: { get: async () => ({}) } } as unknown as CloudflareEnv;

afterAll(() => {
  mock.restore();
});

const reset = () => {
  updates.length = 0;

  file = {
    assetKey: 'asset-1',
    duration: 60_000,
    id: 'file-1',
    isTranscribing: true,
    transcriptionRequestedAt: requestedAt,
    type: 'audio',
  };

  sourceResult = {
    source: {
      assetKey: 'asset-1',
      file,
      kind: 'r2',
      url: 'https://example.com/audio.m4a',
    },
    status: 'ready',
  };

  transcriptResult = [{ end: 1, start: 0, text: 'hello' }];
  resolveAudioAnalysisSource.mockClear();
  transcribeAudioFile.mockClear();
};

describe('audio analysis jobs', () => {
  test('ignores stale transcription', async () => {
    reset();
    file = { ...file!, transcriptionRequestedAt: '2026-05-20T00:00:01.000Z' };

    await expect(
      processor.transcribeAudioFile({ db, env, fileId: 'file-1', requestedAt })
    ).resolves.toBe(false);

    expect(updates).toEqual([]);
    expect(resolveAudioAnalysisSource).not.toHaveBeenCalled();
  });

  test('retries pending stream', async () => {
    reset();

    file = {
      assetKey: 'asset-1',
      duration: 60_000,
      id: 'file-1',
      identificationRequestedAt: requestedAt,
      isIdentifying: true,
      type: 'video',
    };

    sourceResult = { status: 'pending' };

    await expect(
      processor.detectAudioFileMusic({ db, env, fileId: 'file-1', requestedAt })
    ).resolves.toEqual({
      retryAfterSeconds: processor.AUDIO_STREAM_PENDING_RETRY_DELAY_SECONDS,
      success: false,
    });

    expect(updates).toEqual([]);
  });

  test('clears final pending stream', async () => {
    reset();

    file = {
      assetKey: 'asset-1',
      duration: 60_000,
      id: 'file-1',
      identificationRequestedAt: requestedAt,
      isIdentifying: true,
      type: 'video',
    };

    sourceResult = { status: 'pending' };

    await expect(
      processor.detectAudioFileMusic({
        db,
        env,
        fileId: 'file-1',
        isFinalAttempt: true,
        requestedAt,
      })
    ).resolves.toEqual({ success: false });

    expect(updates.at(-1)).toEqual({
      identificationRequestedAt: null,
      isIdentifying: false,
    });
  });

  test('writes current transcript', async () => {
    reset();

    await expect(
      processor.transcribeAudioFile({ db, env, fileId: 'file-1', requestedAt })
    ).resolves.toEqual({ success: true });

    expect(updates.at(-1)).toEqual({
      isTranscribing: false,
      transcript: transcriptResult,
      transcriptionRequestedAt: null,
    });
  });

  test('retries failures', async () => {
    reset();

    transcribeAudioFile.mockImplementationOnce(async () => {
      throw new Error('openai down');
    });

    const originalConsoleError = console.error;
    const consoleError = mock(() => {});
    console.error = consoleError;

    try {
      await expect(
        processor.transcribeAudioFile({
          db,
          env,
          fileId: 'file-1',
          requestedAt,
        })
      ).resolves.toEqual({
        retryAfterSeconds: processor.AUDIO_ANALYSIS_FAILURE_RETRY_DELAY_SECONDS,
        success: false,
      });

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(updates).toEqual([]);
    } finally {
      console.error = originalConsoleError;
    }
  });

  test('clears final failures', async () => {
    reset();

    transcribeAudioFile.mockImplementationOnce(async () => {
      throw new Error('openai down');
    });

    const originalConsoleError = console.error;
    const consoleError = mock(() => {});
    console.error = consoleError;

    try {
      await expect(
        processor.transcribeAudioFile({
          db,
          env,
          fileId: 'file-1',
          isFinalAttempt: true,
          requestedAt,
        })
      ).resolves.toEqual({ success: false });

      expect(consoleError).toHaveBeenCalledTimes(1);

      expect(updates.at(-1)).toEqual({
        isTranscribing: false,
        transcriptionRequestedAt: null,
      });
    } finally {
      console.error = originalConsoleError;
    }
  });
});
