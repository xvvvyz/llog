import { ComposerSheetForm } from '@/features/records/components/composer-sheet-form';
import { useRecordComposerModel } from '@/features/records/hooks/use-record-composer-model';
import { Sheet } from '@/ui/sheet';

export const RecordCreateSheet = () => {
  const composer = useRecordComposerModel();

  return (
    <Sheet
      constrainToViewport
      loading={composer.loading}
      onDismiss={composer.onDismiss}
      open={composer.isOpen}
      portalName="record-create"
      topInset={64}
    >
      <ComposerSheetForm
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
        placeholder="What's happening?"
        submitLabel={composer.submitLabel}
        text={composer.currentText}
        toolbar={composer.toolbar}
      />
    </Sheet>
  );
};
