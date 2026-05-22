import { SpectrumSwatchPicker } from '@/features/tags/components/spectrum-swatch-picker';
import { updateTag } from '@/features/tags/mutations/update-tag';
import type { Tag } from '@/features/tags/types/tag';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { SPECTRUM, resolveSpectrumColor, type Color } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { SortableSheetDragHandle } from '@/ui/sortable';
import { Text } from '@/ui/text';
import { X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

type TagRowProps = Pick<Tag, 'color' | 'id' | 'name'> & {
  canManageColor?: boolean;
  canSort?: boolean;
  canToggle?: boolean;
  canManageDefinitions?: boolean;
  isSelected: boolean;
  onCheckedChange?: (selected: boolean) => void;
  onColorChange?: (color: Color) => void;
};

export const TagRow = ({
  canManageColor,
  canSort = true,
  canToggle = true,
  canManageDefinitions = true,
  color,
  id,
  isSelected,
  name,
  onCheckedChange,
  onColorChange,
}: TagRowProps) => {
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] =
    React.useState(false);

  const [draftName, setDraftName] = React.useState(name);
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const colorValue = resolveSpectrumColor(color);
  const accentColor = SPECTRUM[colorScheme][colorValue].default;
  const canEditColor = !!canManageColor && !!onColorChange;

  React.useEffect(() => {
    if (isDeleteButtonVisible) return;
    setDraftName(name);
  }, [isDeleteButtonVisible, name]);

  const handleChangeName = React.useCallback(
    (nextName: string) => {
      setDraftName(nextName);
      if (!nextName.trim()) return;
      void updateTag({ id, name: nextName });
    },
    [id]
  );

  const handleBlurName = React.useCallback(() => {
    if (!draftName.trim()) setDraftName(name);
    setTimeout(() => setIsDeleteButtonVisible(false), 200);
  }, [draftName, name]);

  return (
    <View className="flex-row w-full gap-3 items-center">
      <View className="flex-1 flex-row overflow-hidden h-10 min-w-0 border-border-secondary border-continuous rounded-full bg-input border items-center">
        {canManageDefinitions && (
          <SortableSheetDragHandle
            className="h-10 w-10"
            contentClassName="h-10 w-10"
            disabled={!canSort}
          />
        )}
        {canEditColor ? (
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                accessibilityLabel="Tag color"
                className="rounded-full"
                size="icon-xs"
                variant="ghost"
                wrapperClassName="-ml-2 mr-2 rounded-full border-continuous"
              >
                <View
                  className="size-3.5 border-border-secondary border-continuous rounded-full border"
                  style={{ backgroundColor: accentColor }}
                />
              </Button>
            </Menu.Trigger>
            <Menu.Content
              align="start"
              className="min-w-0 p-3"
              side="top"
              sideOffset={4}
            >
              <SpectrumSwatchPicker
                onValueChange={onColorChange}
                value={colorValue}
              />
            </Menu.Content>
          </Menu.Root>
        ) : (
          <View
            className={cn(
              'mr-1 h-10 w-8 items-center justify-center',
              !canManageDefinitions && 'ml-1.5'
            )}
          >
            <View
              className="size-3 border-border-secondary border-continuous rounded-full border"
              style={{ backgroundColor: accentColor }}
            />
          </View>
        )}
        {!canManageDefinitions ? (
          <View className="flex-1 h-10 min-w-0 justify-center">
            <Text numberOfLines={1}>{name}</Text>
          </View>
        ) : (
          <Input
            className="flex-1 min-w-0 px-0 border-0 bg-transparent"
            maxLength={16}
            onBlur={handleBlurName}
            onChangeText={handleChangeName}
            onFocus={() => setIsDeleteButtonVisible(true)}
            placeholder="Tag"
            size="sm"
            value={draftName}
          />
        )}
        {isDeleteButtonVisible && canManageDefinitions ? (
          <Button
            className="h-8 w-8 rounded-full"
            onPress={() => sheetManager.open('tag-delete', id)}
            size="icon"
            variant="ghost"
            wrapperClassName="mr-1 rounded-full border-continuous"
          >
            <Icon className="text-muted-foreground" icon={X} size={20} />
          </Button>
        ) : (
          <Checkbox
            checked={isSelected}
            checkedColor={accentColor}
            className="size-8 border-0"
            disabled={!canToggle}
            onCheckedChange={(selected) => onCheckedChange?.(selected)}
            wrapperClassName="mr-1 rounded-full border-continuous"
          />
        )}
      </View>
    </View>
  );
};
