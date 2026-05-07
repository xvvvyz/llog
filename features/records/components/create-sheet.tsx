import { ComposerForm } from '@/features/records/components/composer-form';
import { RecordTagChips } from '@/features/records/components/record-tag-chips';
import { useRecordComposerModel } from '@/features/records/hooks/use-composer-model';
import { Sheet } from '@/ui/sheet';

export const RecordCreateSheet = () => {
  const composer = useRecordComposerModel();
  const hasSelectedTags = composer.selectedTags.some((tag) => !!tag.name);

  return (
    <Sheet
      loading={composer.loading}
      onDismiss={composer.onDismiss}
      open={composer.isOpen}
      portalName="record-create"
      topInset={64}
    >
      <ComposerForm
        attachmentCount={composer.fileCount}
        filePreview={composer.filePreview}
        hasContent={composer.hasContent}
        isBusy={composer.isBusy}
        isOpen={composer.isOpen}
        isSubmitting={composer.isSubmitting}
        isTextareaFocused={composer.isTextareaFocused}
        logColor={composer.logColor}
        onChangeText={composer.onChangeText}
        onSubmit={composer.onSubmit}
        onTextareaFocusChange={composer.onTextareaFocusChange}
        placeholder="What's happening?"
        submitLabel={composer.submitLabel}
        text={composer.currentText}
        toolbar={composer.toolbar}
        inputHeader={
          hasSelectedTags ? (
            <RecordTagChips
              className="justify-start"
              tags={composer.selectedTags}
            />
          ) : null
        }
      />
    </Sheet>
  );
};
