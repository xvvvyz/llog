import { publishRecord } from '@/features/records/mutations/publish-record';
import { publishReply } from '@/features/records/mutations/publish-reply';
import { applyRecordPin } from '@/features/records/mutations/toggle-pin';
import { fetchOutboxNetworkReachability } from '@/features/offline/outbox-network';
import { uploadQueuedAttachment } from '@/features/offline/outbox-sync-uploads';
import * as outboxStore from '@/features/offline/outbox-store';
import { rejectAfter } from '@/lib/async';
import * as outboxSyncCleanup from '@/features/offline/outbox-sync-cleanup';
import * as outboxSyncDraftReplay from '@/features/offline/outbox-sync-draft-replay';
import * as outboxSyncRunner from '@/features/offline/outbox-sync-runner';

const defaultDependencies: outboxSyncRunner.OutboxSyncDependencies = {
  applyRecordPin,
  cleanupDiscardedSubmission: outboxSyncCleanup.cleanupDiscardedSubmission,
  discardOrphanedReplySubmission:
    outboxSyncCleanup.discardOrphanedReplySubmission,
  fetchOutboxNetworkReachability,
  isReplyForQueuedRecord: outboxSyncDraftReplay.isReplyForQueuedRecord,
  logError: console.error,
  outboxStore,
  publishRecord,
  publishReply,
  queryRecordSyncTarget: outboxSyncDraftReplay.queryRecordSyncTarget,
  queuedReplyNeedsDraftReplay:
    outboxSyncDraftReplay.queuedReplyNeedsDraftReplay,
  queuedSubmissionIsPublished:
    outboxSyncDraftReplay.queuedSubmissionIsPublished,
  rejectAfter,
  replayQueuedRecordDraft: outboxSyncDraftReplay.replayQueuedRecordDraft,
  replayQueuedReplyDraft: outboxSyncDraftReplay.replayQueuedReplyDraft,
  replayQueuedSubmissionLinks:
    outboxSyncDraftReplay.replayQueuedSubmissionLinks,
  resolveQueuedReplyParent: outboxSyncDraftReplay.resolveQueuedReplyParent,
  uploadQueuedAttachment,
  waitForDraftState: outboxSyncDraftReplay.waitForDraftState,
};

const defaultRunner = outboxSyncRunner.createOutboxSyncRunner(defaultDependencies);

export const syncQueuedSubmission = defaultRunner.syncQueuedSubmission;

export const syncOutboxOnce = defaultRunner.syncOutboxOnce;

export const runOutboxSync = defaultRunner.runOutboxSync;
