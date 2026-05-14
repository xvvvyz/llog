import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as linkUrl from '@/features/records/lib/link-url';
import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import { createLink } from '@/features/records/mutations/create-link';
import { updateLink } from '@/features/records/mutations/update-link';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { id } from '@instantdb/react-native';
import * as React from 'react';
import { View } from 'react-native';

const getNextOrder = (links?: { order?: number | null }[]) =>
  (links ?? []).reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1;

export const LinkEditorSheet = () => {
  const sheetManager = useSheetManager();
  const { canRunNetworkActions, isOffline } = useConnectivity();
  const outbox = useOutbox();
  const isOpen = sheetManager.isOpen(sheetPayloads.RECORD_LINK_EDITOR_SHEET);
  const payload = sheetPayloads.getRecordLinkEditorSheetPayload(sheetManager);
  const [label, setLabel] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditingLink = payload?.mode === 'edit';
  const createParent = payload?.mode === 'create' ? payload.parent : undefined;
  const linkId = payload?.mode === 'edit' ? payload.linkId : undefined;
  const isRecordLink = createParent?.type === 'record';
  const isReplyLink = createParent?.type === 'reply';

  const sheetSessionKey =
    payload?.mode === 'edit'
      ? `edit:${payload.linkId}`
      : createParent
        ? `create:${createParent.type}:${createParent.id}`
        : 'closed';

  const { data: linkData, isLoading: linkLoading } = db.useQuery(
    isOpen && linkId ? { links: { $: { where: { id: linkId } } } } : null
  );

  const { data: recordData, isLoading: recordLoading } = db.useQuery(
    isOpen && createParent && isRecordLink
      ? { records: { $: { where: { id: createParent.id } }, links: {} } }
      : null
  );

  const { data: replyData, isLoading: replyLoading } = db.useQuery(
    isOpen && createParent && isReplyLink
      ? { replies: { $: { where: { id: createParent.id } }, links: {} } }
      : null
  );

  const linkQueryKey = isOpen && linkId ? linkId : undefined;

  const recordQueryKey =
    isOpen && createParent && isRecordLink ? createParent.id : undefined;

  const replyQueryKey =
    isOpen && createParent && isReplyLink ? createParent.id : undefined;

  const hasCurrentLinkResult = useCurrentQueryResult(linkQueryKey, linkData);

  const hasCurrentRecordResult = useCurrentQueryResult(
    recordQueryKey,
    recordData
  );

  const hasCurrentReplyResult = useCurrentQueryResult(replyQueryKey, replyData);

  const pendingCreateParent = React.useMemo(
    () =>
      createParent
        ? outbox.submissions.find((submission) => {
            if (!pendingEntries.isActiveQueuedSubmission(submission)) {
              return false;
            }

            return createParent.type === 'record'
              ? submission.type === 'record' &&
                  submission.contentId === createParent.id
              : submission.type === 'reply' &&
                  submission.contentId === createParent.id;
          })
        : undefined,
    [createParent, outbox.submissions]
  );

  const pendingEditingLink = React.useMemo(
    () =>
      linkId
        ? (outbox.submissions
            .flatMap((submission) => submission.links)
            .find((link) => link.id === linkId) ??
          outbox.drafts
            .flatMap((draft) => draft.links)
            .find((link) => link.id === linkId))
        : undefined,
    [linkId, outbox.drafts, outbox.submissions]
  );

  const isQueuedSubmissionEditingLink = React.useMemo(
    () =>
      !!linkId &&
      outbox.submissions.some((submission) =>
        submission.links.some(
          (link) => link.id === linkId && !!link.localStatus
        )
      ),
    [linkId, outbox.submissions]
  );

  const localEditingLink = pendingEditingLink?.localStatus
    ? pendingEditingLink
    : undefined;

  const queuedDraftParent = React.useMemo(
    () =>
      createParent
        ? outbox.drafts.find(
            (draft) =>
              draft.type === createParent.type &&
              draft.contentId === createParent.id
          )
        : undefined,
    [createParent, outbox.drafts]
  );

  const queriedParent = isRecordLink
    ? hasCurrentRecordResult
      ? recordData?.records?.find((item) => item.id === createParent?.id)
      : undefined
    : isReplyLink && hasCurrentReplyResult
      ? replyData?.replies?.find((item) => item.id === createParent?.id)
      : undefined;

  const parent = React.useMemo(
    () =>
      pendingCreateParent
        ? {
            id: pendingCreateParent.contentId,
            links: pendingCreateParent.links,
            teamId: pendingCreateParent.teamId,
          }
        : queuedDraftParent?.linksUpdated
          ? {
              id: queuedDraftParent.contentId,
              links: queuedDraftParent.links,
              teamId: createParent?.teamId,
            }
          : queriedParent
            ? {
                id: queriedParent.id,
                links: queriedParent.links ?? [],
                teamId: queriedParent.teamId,
              }
            : createParent?.teamId
              ? {
                  id: createParent.id,
                  links: createParent.links ?? [],
                  teamId: createParent.teamId,
                }
              : undefined,
    [createParent, pendingCreateParent, queuedDraftParent, queriedParent]
  );

  const queriedEditingLink = hasCurrentLinkResult
    ? linkData?.links?.find((item) => item.id === linkId)
    : undefined;

  const editingLink = localEditingLink ?? queriedEditingLink;

  const isLinkLoading =
    isOpen &&
    (isEditingLink
      ? !localEditingLink &&
        !isOffline &&
        !!linkQueryKey &&
        (linkLoading || !hasCurrentLinkResult)
      : isRecordLink
        ? !pendingCreateParent &&
          !createParent?.teamId &&
          !isOffline &&
          !!recordQueryKey &&
          (recordLoading || !hasCurrentRecordResult)
        : isReplyLink
          ? !pendingCreateParent &&
            !createParent?.teamId &&
            !isOffline &&
            !!replyQueryKey &&
            (replyLoading || !hasCurrentReplyResult)
          : false);

  const normalizedUrl = React.useMemo(
    () => linkUrl.normalizeLinkUrl(url),
    [url]
  );

  const trimmedLabel = label.trim();

  const canSubmit = isEditingLink
    ? !!linkId &&
      !!editingLink &&
      !!trimmedLabel &&
      !!normalizedUrl &&
      (canRunNetworkActions || !!localEditingLink)
    : !!createParent && !!parent?.teamId && !!trimmedLabel && !!normalizedUrl;

  const close = React.useCallback(() => {
    sheetManager.close(sheetPayloads.RECORD_LINK_EDITOR_SHEET);
  }, [sheetManager]);

  React.useEffect(() => {
    setIsSubmitting(false);

    if (!isOpen || !payload) {
      setLabel('');
      setUrl('');
      return;
    }

    if (payload.mode === 'create') {
      setLabel('');
      setUrl('');
      return;
    }

    if (!editingLink) return;
    setLabel(editingLink.label);
    setUrl(editingLink.url);
  }, [editingLink, isOpen, payload, sheetSessionKey]);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || !normalizedUrl) return;
    setIsSubmitting(true);

    try {
      if (isEditingLink) {
        if (!linkId) return;

        outboxStore.updateQueuedLink({
          label: trimmedLabel,
          linkId,
          url: normalizedUrl,
        });

        outboxStore.updateQueuedDraftLink({
          label: trimmedLabel,
          linkId,
          url: normalizedUrl,
        });

        if (
          isQueuedSubmissionEditingLink ||
          (localEditingLink && !queriedEditingLink)
        ) {
          close();
          return;
        }

        await updateLink({
          id: linkId,
          label: trimmedLabel,
          url: normalizedUrl,
        });

        close();
        return;
      }

      if (!createParent || !parent?.teamId) return;
      const order = getNextOrder(parent.links);

      if (canRunNetworkActions) {
        await createLink({
          label: trimmedLabel,
          order,
          parentId: createParent.id,
          parentType: createParent.type,
          teamId: parent.teamId,
          url: normalizedUrl,
        });

        close();
        return;
      }

      const createdLinkId = id();

      const link = {
        id: createdLinkId,
        label: trimmedLabel,
        localStatus: 'pending' as const,
        order,
        teamId: parent.teamId,
        url: normalizedUrl,
      };

      outboxStore.addQueuedDraftLink({
        baseLinks: parent.links,
        link,
        parentId: createParent.id,
        parentType: createParent.type,
      });

      outboxStore.addQueuedLink({
        link,
        parentId: createParent.id,
        parentType: createParent.type,
      });

      close();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    canRunNetworkActions,
    close,
    createParent,
    isEditingLink,
    isQueuedSubmissionEditingLink,
    linkId,
    localEditingLink,
    normalizedUrl,
    parent,
    queriedEditingLink,
    trimmedLabel,
  ]);

  return (
    <Sheet
      className="md:max-w-sm"
      loading={isLinkLoading}
      onDismiss={close}
      open={isOpen}
      portalName={sheetPayloads.RECORD_LINK_EDITOR_SHEET}
      topInset={64}
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <View>
          <Label>Label</Label>
          <Input
            autoFocus
            maxLength={120}
            onChangeText={setLabel}
            placeholder="Website"
            returnKeyType="next"
            value={label}
          />
        </View>
        <View className="mt-4">
          <Label>URL</Label>
          <Input
            autoCapitalize="none"
            keyboardType="url"
            maxLength={2048}
            onChangeText={setUrl}
            placeholder="https://example.com"
            value={url}
            onSubmitEditing={() => {
              if (canSubmit) void handleSubmit();
            }}
          />
          {!!url.trim() && !normalizedUrl && (
            <Text className="pt-1.5 px-2 text-destructive text-sm">
              Enter a valid URL.
            </Text>
          )}
        </View>
        <View className="flex-row mt-8 gap-4">
          <Button
            onPress={close}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmit}
            size="sm"
            wrapperClassName="flex-1"
          >
            {isSubmitting ? (
              <Spinner />
            ) : (
              <Text>{isEditingLink ? 'Save' : 'Add'}</Text>
            )}
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
