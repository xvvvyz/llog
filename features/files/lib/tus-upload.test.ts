import { uploadToStreamUrl } from '@/features/files/lib/tus-upload';
import { afterEach, describe, expect, test } from 'bun:test';

const MIB = 1024 * 1024;
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('uploadToStreamUrl', () => {
  test('reports monotonic progress across chunks', async () => {
    const size = 12 * MIB; // 5 + 5 + 2 MiB
    const fractions: number[] = [];

    await uploadToStreamUrl({
      onProgress: (fraction) => fractions.push(fraction),
      patchChunk: async () => {},
      size,
      uploadURL: 'https://stream.test/upload',
    });

    expect(fractions[0]).toBe(0);
    expect(fractions.at(-1)).toBe(1);

    for (let i = 1; i < fractions.length; i += 1) {
      expect(fractions[i]).toBeGreaterThanOrEqual(fractions[i - 1]);
    }
  });

  test('resumes from the server offset after a failed chunk', async () => {
    const size = 10 * MIB;
    const serverOffset = 6 * MIB;
    const fractions: number[] = [];
    let patchCalls = 0;
    let headCalls = 0;

    // Only the retry's HEAD probe hits the network; chunk writes are injected.
    global.fetch = (async (_url: string, init?: RequestInit) => {
      headCalls += 1;
      void (init?.method ?? 'GET');

      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Upload-Offset': String(serverOffset) }),
      } as Response;
    }) as unknown as typeof fetch;

    await uploadToStreamUrl({
      onProgress: (fraction) => fractions.push(fraction),
      patchChunk: async () => {
        patchCalls += 1;
        // Fail the second chunk so the loop must re-sync from the server.
        if (patchCalls === 2) throw new Error('network');
      },
      size,
      uploadURL: 'https://stream.test/upload',
    });

    expect(headCalls).toBe(1);
    expect(fractions).toContain(serverOffset / size);
    expect(fractions.at(-1)).toBe(1);
  });
});
