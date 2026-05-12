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
import * as React from 'react';
import { View } from 'react-native';

const getNextOrder = (links?: { order?: number | null }[]) =>
  (links ?? []).reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1;

export const LinkEditorSheet = () => {
  const sheetManager = useSheetManager();
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

  const parent = isRecordLink
    ? hasCurrentRecordResult
      ? recordData?.records?.find((item) => item.id === createParent?.id)
      : undefined
    : isReplyLink && hasCurrentReplyResult
      ? replyData?.replies?.find((item) => item.id === createParent?.id)
      : undefined;

  const editingLink = hasCurrentLinkResult
    ? linkData?.links?.find((item) => item.id === linkId)
    : undefined;

  const isLinkLoading =
    isOpen &&
    (isEditingLink
      ? !!linkQueryKey && (linkLoading || !hasCurrentLinkResult)
      : isRecordLink
        ? !!recordQueryKey && (recordLoading || !hasCurrentRecordResult)
        : isReplyLink
          ? !!replyQueryKey && (replyLoading || !hasCurrentReplyResult)
          : false);

  const normalizedUrl = React.useMemo(
    () => linkUrl.normalizeLinkUrl(url),
    [url]
  );

  const trimmedLabel = label.trim();

  const canSubmit = isEditingLink
    ? !!linkId && !!editingLink && !!trimmedLabel && !!normalizedUrl
    : !!createParent && !!parent && !!trimmedLabel && !!normalizedUrl;

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

        await updateLink({
          id: linkId,
          label: trimmedLabel,
          url: normalizedUrl,
        });

        close();
        return;
      }

      if (!createParent || !parent) return;

      await createLink({
        label: trimmedLabel,
        order: getNextOrder(parent.links),
        parentId: createParent.id,
        parentType: createParent.type,
        teamId: parent.teamId,
        url: normalizedUrl,
      });

      close();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    close,
    createParent,
    isEditingLink,
    linkId,
    normalizedUrl,
    parent,
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
