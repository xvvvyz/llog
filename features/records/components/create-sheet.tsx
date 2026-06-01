import { TemplateTagSummary } from '@/features/logs/components/template-tag-summary';
import * as structuredTemplates from '@/features/logs/lib/structured-template';
import type { LogTemplate } from '@/features/logs/types/template';
import { ComposerForm } from '@/features/records/components/composer-form';
import { RecordTemplateFormSheet } from '@/features/records/components/record-template-form-sheet';
import { RecordTimePreviewRow } from '@/features/records/components/record-time-sheet';
import { useRecordComposerModel } from '@/features/records/hooks/use-record-composer-model';
import { AddTagsInput } from '@/features/tags/components/add-tags-input';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import { ArrowRight } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

const TemplatePickerSheet = ({
  onClose,
  onSelectTemplate,
  open,
  templates,
}: {
  onClose: () => void;
  onSelectTemplate: (template: LogTemplate) => void;
  open: boolean;
  templates: LogTemplate[];
}) => {
  const [query, setQuery] = React.useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleTemplates = React.useMemo(() => {
    if (!normalizedQuery) return templates;

    return templates.filter(
      (template) =>
        template.text.toLowerCase().includes(normalizedQuery) ||
        structuredTemplates
          .formatStructuredTemplatePreview(template.text)
          .toLowerCase()
          .includes(normalizedQuery) ||
        template.tags?.some((tag) =>
          tag.name.toLowerCase().includes(normalizedQuery)
        )
    );
  }, [normalizedQuery, templates]);

  const handleSubmitSearch = React.useCallback(() => {
    if (visibleTemplates.length !== 1) return;
    const [template] = visibleTemplates;
    onSelectTemplate(template);
  }, [onSelectTemplate, visibleTemplates]);

  React.useEffect(() => {
    if (open) return;
    setQuery('');
  }, [open]);

  return (
    <Sheet
      onDismiss={onClose}
      open={open && templates.length > 0}
      portalName="record-template-picker"
      variant="list"
    >
      <SheetListScrollView variant="rows">
        {visibleTemplates.length > 0 ? (
          visibleTemplates.map((template) => (
            <Button
              key={template.id}
              className="w-full justify-start"
              onPress={() => onSelectTemplate(template)}
              size="sm"
              variant="secondary"
              wrapperClassName="w-full"
            >
              <View className="flex-1 flex-row min-w-0 gap-3 items-center">
                <TemplateTagSummary className="-ml-1.5" tags={template.tags} />
                <View className="flex-1 overflow-hidden min-w-0">
                  <Text
                    className="font-normal text-muted-foreground text-sm web:truncate"
                    ellipsizeMode="tail"
                    numberOfLines={1}
                  >
                    {structuredTemplates.formatStructuredTemplatePreview(
                      template.text
                    )}
                  </Text>
                </View>
              </View>
              <Icon className="-mr-1 text-muted-foreground" icon={ArrowRight} />
            </Button>
          ))
        ) : (
          <Text className="mx-auto text-center text-muted-foreground md:py-6">
            No templates found.
          </Text>
        )}
      </SheetListScrollView>
      <SheetFooter contentClassName="flex-row gap-3">
        <SearchInput
          onSubmitEditing={handleSubmitSearch}
          query={query}
          setQuery={setQuery}
          size="sm"
          submitBehavior="blurAndSubmit"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          onPress={onClose}
          size="sm"
          variant="secondary"
          wrapperClassName="shrink-0"
        >
          <Text>Done</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};

export const RecordCreateSheet = () => {
  const composer = useRecordComposerModel();
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);

  const [selectedStructuredTemplate, setSelectedStructuredTemplate] =
    React.useState<LogTemplate | null>(null);

  const hasSelectedTags = composer.selectedTags.some((tag) => !!tag.name);
  const hasRecordDatePreview = !!composer.recordDatePreviewLabel;
  const showTagContainer = composer.canOpenTags && hasSelectedTags;
  const showComposerAccessory = hasRecordDatePreview || showTagContainer;

  React.useEffect(() => {
    if (composer.isOpen && composer.canOpenTemplates) return;
    setIsTemplatePickerOpen(false);
    setSelectedStructuredTemplate(null);
  }, [composer.canOpenTemplates, composer.isOpen]);

  const handleSelectTemplate = React.useCallback(
    (template: LogTemplate) => {
      if (structuredTemplates.structuredTemplateHasFields(template.text)) {
        setSelectedStructuredTemplate(template);
        setIsTemplatePickerOpen(false);
        return;
      }

      composer.onApplyTemplate(template);
      setIsTemplatePickerOpen(false);
    },
    [composer]
  );

  return (
    <React.Fragment>
      <Sheet
        loading={composer.loading}
        onDismiss={composer.onDismiss}
        open={composer.isOpen}
        portalName="record-create"
        topInset={64}
      >
        <ComposerForm
          attachmentCount={composer.fileCount}
          autoFocusOnNative={!composer.canOpenTemplates}
          filePreview={composer.filePreview}
          fullscreenPortalName="record-composer-fullscreen"
          hasContent={composer.hasContent}
          isBusy={composer.isBusy}
          isOpen={composer.isOpen}
          isSubmitting={composer.isSubmitting}
          isTextareaFocused={composer.isTextareaFocused}
          isTextInputDisabled={composer.isTextInputDisabled}
          logColorClassName={composer.logColorClassName}
          logColorInteractiveClassName={composer.logColorInteractiveClassName}
          onChangeText={composer.onChangeText}
          onSubmit={composer.onSubmit}
          onTextareaFocusChange={composer.onTextareaFocusChange}
          placeholder="What’s happening?"
          showFormattingControls={composer.showFormattingControls}
          submitLabel={composer.submitLabel}
          submitVariant={composer.submitVariant}
          text={composer.currentText}
          toolbar={composer.toolbar}
          inputAccessory={
            showComposerAccessory && (
              <React.Fragment>
                {composer.recordDatePreviewLabel ? (
                  <RecordTimePreviewRow
                    className="border-b border-border-secondary border-continuous"
                    iconClassName={composer.recordDatePreviewClassName}
                    label={composer.recordDatePreviewLabel}
                    onPress={composer.onOpenRecordTime}
                  />
                ) : null}
                {showTagContainer ? (
                  <AddTagsInput
                    className="border-b border-border-secondary border-continuous"
                    disabled={composer.canOpenTags && composer.isTagsDisabled}
                    showAction={composer.canOpenTags}
                    tags={composer.selectedTags}
                    onPress={
                      composer.canOpenTags ? composer.onOpenTags : undefined
                    }
                  />
                ) : null}
              </React.Fragment>
            )
          }
          inputAction={
            composer.canOpenTemplates && (
              <Button
                className="rounded-lg"
                onPress={() => setIsTemplatePickerOpen(true)}
                size="xs"
                variant="ghost"
                wrapperClassName="rounded-lg border-continuous"
              >
                <Text className="mt-px">Use a template</Text>
              </Button>
            )
          }
        />
      </Sheet>
      {composer.recordTimeSheet}
      <TemplatePickerSheet
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        open={isTemplatePickerOpen}
        templates={composer.templates}
      />
      <RecordTemplateFormSheet
        checkboxCheckedClassName={composer.logColorClassName}
        continueButtonClassName={composer.logColorClassName}
        onApply={composer.onApplyStructuredTemplate}
        onClose={() => setSelectedStructuredTemplate(null)}
        open={!!selectedStructuredTemplate}
        template={selectedStructuredTemplate}
        continueButtonInteractiveClassName={
          composer.logColorInteractiveClassName
        }
      />
    </React.Fragment>
  );
};
