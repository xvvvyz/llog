import type { LogTemplate } from '@/features/logs/types/template';
import { ComposerForm } from '@/features/records/components/composer-form';
import { RecordTagChips } from '@/features/records/components/record-tag-chips';
import { useRecordComposerModel } from '@/features/records/hooks/use-composer-model';
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
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.text.toLowerCase().includes(normalizedQuery)
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
              <View className="flex-1 flex-row min-w-0 gap-4 items-baseline">
                <Text className="font-normal text-foreground shrink-0">
                  {template.name}
                </Text>
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
          <Text className="mx-auto py-6 text-center text-muted-foreground">
            No templates found.
          </Text>
        )}
      </SheetListScrollView>
      <SheetFooter contentClassName="flex-row gap-4">
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
  const hasSelectedTags = composer.selectedTags.some((tag) => !!tag.name);

  React.useEffect(() => {
    if (composer.isOpen && composer.canOpenTemplates) return;
    setIsTemplatePickerOpen(false);
  }, [composer.canOpenTemplates, composer.isOpen]);

  const handleSelectTemplate = React.useCallback(
    (template: LogTemplate) => {
      composer.onApplyTemplate(template.text);
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
          inputAction={
            composer.canOpenTemplates && (
              <Button
                className="h-9 px-2.5 rounded-lg"
                onPress={() => setIsTemplatePickerOpen(true)}
                size="xs"
                variant="ghost"
                wrapperClassName="rounded-lg border-continuous"
              >
                <Text className="mt-0.5">Use a template</Text>
              </Button>
            )
          }
          inputHeader={
            hasSelectedTags && (
              <RecordTagChips
                chipClassName="light:bg-muted"
                className="justify-start"
                tags={composer.selectedTags}
              />
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
