import type { DownloadFileOptions } from '@/features/media/types/download-file';
import { isTouchWeb } from '@/lib/touch-web';

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: { accept: Record<string, string[]>; description?: string }[];
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions
  ) => Promise<{
    createWritable: () => Promise<{
      close: () => Promise<void>;
      write: (data: Blob) => Promise<void>;
    }>;
  }>;
};

const DEFAULT_FILE_NAME = 'download';

const getSafeFileName = (fileName?: string) => {
  const trimmed = fileName?.trim();
  return trimmed || DEFAULT_FILE_NAME;
};

const getFileExtension = (fileName: string) =>
  fileName.match(/\.[a-z\d]{1,16}$/i)?.[0];

const getPickerTypes = (fileName: string, mimeType?: string) => {
  const extension = getFileExtension(fileName);
  if (!mimeType || !extension) return undefined;
  return [{ accept: { [mimeType]: [extension] }, description: 'File' }];
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const clickDownloadLink = ({
  fileName,
  href,
  target,
}: {
  fileName: string;
  href: string;
  target?: '_blank';
}) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  if (target) link.target = target;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const saveBlobWithPicker = async ({
  blob,
  fileName,
  mimeType,
}: {
  blob: Blob;
  fileName: string;
  mimeType?: string;
}) => {
  const browserWindow = window as SaveFilePickerWindow;
  if (!browserWindow.showSaveFilePicker) return false;

  try {
    const handle = await browserWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: getPickerTypes(fileName, mimeType || blob.type),
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    if (isAbortError(error)) return true;
    return false;
  }
};

const shareBlob = async ({
  blob,
  fileName,
  mimeType,
}: {
  blob: Blob;
  fileName: string;
  mimeType?: string;
}) => {
  if (
    !isTouchWeb() ||
    !navigator.share ||
    !navigator.canShare ||
    typeof File === 'undefined'
  ) {
    return false;
  }

  const file = new File([blob], fileName, { type: mimeType || blob.type });
  const shareData = { files: [file], title: fileName };

  try {
    if (!navigator.canShare(shareData)) return false;
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if (isAbortError(error)) return true;
    return false;
  }
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);

  try {
    clickDownloadLink({ fileName, href: objectUrl });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
};

const downloadUrlWithIframe = (url: string) => {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 60_000);
};

const downloadUrl = async ({
  fileName,
  mimeType,
  url,
}: {
  fileName: string;
  mimeType?: string;
  url: string;
}) => {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Download request failed');
    const blob = await response.blob();
    const type = mimeType || blob.type || undefined;
    if (await saveBlobWithPicker({ blob, fileName, mimeType: type })) return;
    if (await shareBlob({ blob, fileName, mimeType: type })) return;
    downloadBlob(blob, fileName);
  } catch {
    downloadUrlWithIframe(url);
  }
};

export const downloadFile = async ({
  blob,
  fileName,
  mimeType,
  url,
}: DownloadFileOptions) => {
  const safeFileName = getSafeFileName(fileName);

  if (blob) {
    if (await saveBlobWithPicker({ blob, fileName: safeFileName, mimeType })) {
      return;
    }

    if (await shareBlob({ blob, fileName: safeFileName, mimeType })) return;
    downloadBlob(blob, safeFileName);
    return;
  }

  if (url) {
    await downloadUrl({ fileName: safeFileName, mimeType, url });
    return;
  }

  throw new Error('Missing download source');
};
