import { type Href, router } from 'expo-router';

export const getLogHref = (logId: string) =>
  `/${encodeURIComponent(logId)}` as Href;

export const getRecordDetailHref = (recordId: string) =>
  `/records/${encodeURIComponent(recordId)}` as Href;

export const getRecordReplyDetailHref = (recordId: string, replyId: string) =>
  ({ pathname: '/records/[recordId]', params: { recordId, replyId } }) as Href;

export const getRecordMediaHref = (recordId: string, fileId: string) =>
  `/records/${encodeURIComponent(recordId)}/files/${encodeURIComponent(
    fileId
  )}` as Href;

export const openRecordDetail = (recordId?: string, replyId?: string) => {
  if (!recordId) return;

  router.push(
    replyId
      ? getRecordReplyDetailHref(recordId, replyId)
      : getRecordDetailHref(recordId)
  );
};
