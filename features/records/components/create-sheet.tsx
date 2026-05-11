import { TemplateTagSummary } from '@/features/logs/components/template-tag-summary';
import type { LogTemplate } from '@/features/logs/types/template';
import { ComposerForm } from '@/features/records/components/composer-form';
import { useRecordComposerModel } from '@/features/records/hooks/use-composer-model';
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
                <Text
                  className="flex-1 min-w-0 font-normal text-muted-foreground text-sm"
                  numberOfLines={1}
                >
                  {template.text}
                </Text>
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
      <SheetFooter contentClassName="gap-3">
        <SearchInput
          onSubmitEditing={handleSubmitSearch}
          query={query}
          setQuery={setQuery}
          size="sm"
          submitBehavior="blurAndSubmit"
          wrapperClassName="w-full"
        />
        <Button
          onPress={onClose}
          size="sm"
          variant="secondary"
          wrapperClassName="w-full"
        >
          <Text>Close</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};

export const RecordCreateSheet = () => {
  const composer = useRecordComposerModel();
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);
  const hasSelectedTags = composer.selectedTags.some((tag) => !!tag.name);

  React.useEffect(() => {
    if (composer.isOpen && composer.canOpenTemplates) return;
    setIsTemplatePickerOpen(false);
  }, [composer.canOpenTemplates, composer.isOpen]);

  const handleSelectTemplate = React.useCallback(
    (template: LogTemplate) => {
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
          inputAccessory={
            composer.canOpenTags &&
            hasSelectedTags && (
              <AddTagsInput
                onPress={composer.onOpenTags}
                tags={composer.selectedTags}
              />
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
      <TemplatePickerSheet
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        open={isTemplatePickerOpen}
        templates={composer.templates}
      />
    </React.Fragment>
  );
};
