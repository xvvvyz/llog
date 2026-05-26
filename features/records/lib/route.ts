import { type Href, router } from 'expo-router';
import { getAppUrl } from '@/lib/app-url';

export const getLogHref = (logId: string) =>
  `/${encodeURIComponent(logId)}` as Href;

export const getRecordDetailHref = (recordId: string) =>
  `/records/${encodeURIComponent(recordId)}` as Href;

export const getRecordDetailUrl = (recordId: string, appUrl?: string) =>
  getAppUrl(`/records/${encodeURIComponent(recordId)}`, appUrl);

export const getRecordReplyDetailHref = (recordId: string, replyId: string) =>
  ({ pathname: '/records/[recordId]', params: { recordId, replyId } }) as Href;

export const getRecordReplyDetailUrl = (
  recordId: string,
  replyId: string,
  appUrl?: string
) => {
  const recordUrl = getRecordDetailUrl(recordId, appUrl);
  if (!recordUrl) return undefined;
  return `${recordUrl}?replyId=${encodeURIComponent(replyId)}`;
};

export const getHighlightedRecordDetailHref = (recordId: string) =>
  ({
    pathname: '/records/[recordId]',
    params: { highlight: 'record', recordId },
  }) as Href;

export const getRecordMediaHref = (recordId: string, fileId: string) =>
  `/records/${encodeURIComponent(recordId)}/files/${encodeURIComponent(
    fileId
  )}` as Href;

export const getRecordMediaUrl = (
  recordId: string,
  fileId: string,
  appUrl?: string
) => getAppUrl(getRecordMediaHref(recordId, fileId) as string, appUrl);

export const openRecordDetail = (
  recordId?: string,
  replyId?: string,
  options: { highlight?: boolean } = {}
) => {
  if (!recordId) return;

  router.push(
    replyId
      ? getRecordReplyDetailHref(recordId, replyId)
      : options.highlight
        ? getHighlightedRecordDetailHref(recordId)
        : getRecordDetailHref(recordId)
  );
};
