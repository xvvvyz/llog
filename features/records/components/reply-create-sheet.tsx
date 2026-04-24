import { ReplyForm } from '@/features/records/components/reply-form';
import { useReplyComposerModel } from '@/features/records/hooks/use-reply-composer-model';
import { Sheet } from '@/ui/sheet';

export const ReplyCreateSheet = () => {
  const composer = useReplyComposerModel();

  return (
    <Sheet
      loading={composer.loading}
      onDismiss={composer.onDismiss}
      open={composer.isOpen}
      portalName="reply-create"
      topInset={64}
    >
      <ReplyForm
        attachmentCount={composer.mediaCount}
        hasContent={composer.hasContent}
        isBusy={composer.isBusy}
        isOpen={composer.isOpen}
        isSubmitting={composer.isSubmitting}
        isTextareaFocused={composer.isTextareaFocused}
        logColor={composer.logColor}
        mediaPreview={composer.mediaPreview}
        onChangeText={composer.onChangeText}
        onSubmit={composer.onSubmit}
        onTextareaFocusChange={composer.onTextareaFocusChange}
        placeholder="What do you think?"
        submitLabel={composer.submitLabel}
        submitTextClassName="text-contrast-foreground"
        submitVariant="secondary"
        text={composer.currentText}
        toolbar={composer.toolbar}
      />
    </Sheet>
  );
};
