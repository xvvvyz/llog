import { wait } from '@/lib/async';

export const TUS_VERSION = '1.0.0';

// Mobile uploads hit transient drops (e.g. NSURLError -1005). Retry the failed
// chunk a few times, resuming from the server's real offset, instead of losing
// the whole upload.
const MAX_CHUNK_RETRIES = 6;

// Cloudflare's tus endpoint rejects a single huge PATCH (HTTP 413), so the file
// is uploaded in chunks. The size is a multiple of 256 KiB and >= 5 MiB (tus
// requirements for non-final chunks) and small enough to stay well under the
// per-request limit while keeping per-chunk memory bounded.
export const TUS_CHUNK_SIZE = 5 * 1024 * 1024;

export const patchWebChunk = async ({
  blob,
  length,
  offset,
  uploadURL,
}: {
  blob: Blob;
  length: number;
  offset: number;
  uploadURL: string;
}) => {
  const response = await fetch(uploadURL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/offset+octet-stream',
      'Tus-Resumable': TUS_VERSION,
      'Upload-Offset': String(offset),
    },
    body: blob.slice(offset, offset + length),
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
};

// Asks the tus server how many bytes it actually has, so a retry resumes from
// the real offset rather than re-sending (or skipping) bytes.
const getServerOffset = async (uploadURL: string) => {
  try {
    const response = await fetch(uploadURL, {
      method: 'HEAD',
      headers: { 'Tus-Resumable': TUS_VERSION },
    });

    if (!response.ok) return null;
    const value = Number(response.headers.get('Upload-Offset'));
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
};

// Drives the chunked tus PATCH loop and reports fractional progress. Platform
// file I/O is injected via `patchChunk`, so this stays free of native deps and
// is unit-testable on its own.
export const uploadToStreamUrl = async ({
  onProgress,
  patchChunk,
  size,
  uploadURL,
}: {
  onProgress?: (fraction: number) => void;
  patchChunk: (chunk: { length: number; offset: number }) => Promise<void>;
  size: number;
  uploadURL: string;
}) => {
  let offset = 0;
  let retries = 0;
  const reportProgress = () => onProgress?.(size > 0 ? offset / size : 1);
  reportProgress();

  while (offset < size) {
    const length = Math.min(TUS_CHUNK_SIZE, size - offset);

    try {
      await patchChunk({ length, offset });
    } catch (error) {
      retries += 1;
      if (retries > MAX_CHUNK_RETRIES) throw error;
      await wait(1000 * retries);
      const serverOffset = await getServerOffset(uploadURL);

      if (serverOffset != null) {
        offset = serverOffset;
        reportProgress();
      }

      continue;
    }

    // A 2xx tus PATCH means the whole chunk was accepted.
    offset += length;
    retries = 0;
    reportProgress();
  }
};
