import { runOutboxSync } from '@/features/offline/outbox-sync-core';
import { useOutboxNetworkReachability } from '@/features/offline/outbox-network';
import * as outboxStore from '@/features/offline/outbox-store';
import { db } from '@/lib/db';
import * as React from 'react';
import { AppState } from 'react-native';

export const OutboxSyncRunner = () => {
  const auth = db.useAuth();
  const networkReachability = useOutboxNetworkReachability();
  const outbox = outboxStore.useOutboxSnapshot();

  React.useEffect(() => {
    outboxStore.setOutboxOwnerUserId(auth.user?.id);
  }, [auth.user?.id]);

  React.useEffect(() => {
    if (!auth.user?.id) return;

    void outboxStore.ensureOutboxHydrated().then(() => {
      outboxStore.retryFailedOutboxWork();
      void runOutboxSync();
    });
  }, [auth.user?.id]);

  React.useEffect(() => {
    if (!auth.user?.id) return;
    if (networkReachability !== true) return;
    outboxStore.retryFailedOutboxWork();
    void runOutboxSync();
  }, [auth.user?.id, networkReachability]);

  React.useEffect(() => {
    if (!auth.user?.id) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      outboxStore.retryFailedOutboxWork();
      void runOutboxSync();
    });

    return () => subscription.remove();
  }, [auth.user?.id]);

  React.useEffect(() => {
    if (!outbox.hydrated) return;
    if (!auth.user?.id || outbox.ownerUserId !== auth.user.id) return;
    const autoSyncable = outboxStore.getStartableAutoSyncSubmissions(outbox);
    const discarded = outboxStore.getDiscardedSubmissions(outbox);
    const recordPins = outboxStore.getQueuedRecordPins(outbox);

    if (!autoSyncable.length && !discarded.length && !recordPins.length) {
      const nextRetryTime = outboxStore.getNextAutoRetryTime(outbox);
      if (networkReachability === false) return;
      if (nextRetryTime == null) return;

      const timeout = setTimeout(
        () => void runOutboxSync(),
        Math.max(0, nextRetryTime - Date.now())
      );

      return () => clearTimeout(timeout);
    }

    if (autoSyncable.length || discarded.length || recordPins.length) {
      void runOutboxSync();
      return;
    }
  }, [auth.user?.id, networkReachability, outbox]);

  // Submissions held in 'processing' wait on server-side video encoding. Watch
  // those files reactively and, once Stream stamps a thumbnail, promote the
  // submission back to 'pending' so it finalizes (and fires notifications).
  const processingVideoFileIds = React.useMemo(() => {
    const ids: string[] = [];

    for (const submission of outbox.submissions) {
      if (submission.status !== 'processing') continue;

      for (const attachment of outbox.attachments) {
        if (
          attachment.type === 'video' &&
          outboxStore.submissionOwnsAttachment(submission, attachment)
        ) {
          ids.push(attachment.id);
        }
      }
    }

    return ids;
  }, [outbox.attachments, outbox.submissions]);

  const processingFiles = db.useQuery(
    processingVideoFileIds.length
      ? {
          files: {
            $: {
              fields: ['id', 'thumbnailUri'],
              where: { id: { $in: processingVideoFileIds } },
            },
          },
        }
      : null
  );

  React.useEffect(() => {
    if (!processingVideoFileIds.length) return;
    const files = processingFiles.data?.files ?? [];

    const isProcessed = (fileId: string) =>
      !!files.find((file) => file.id === fileId)?.thumbnailUri;

    let didPromote = false;

    for (const submission of outbox.submissions) {
      if (submission.status !== 'processing') continue;

      const videoFileIds = outbox.attachments
        .filter(
          (attachment) =>
            attachment.type === 'video' &&
            outboxStore.submissionOwnsAttachment(submission, attachment)
        )
        .map((attachment) => attachment.id);

      if (videoFileIds.every(isProcessed)) {
        outboxStore.setQueuedSubmissionStatus(submission.id, 'pending');
        didPromote = true;
      }
    }

    if (didPromote) void runOutboxSync();
  }, [
    outbox.attachments,
    outbox.submissions,
    processingFiles.data,
    processingVideoFileIds,
  ]);

  return null;
};
