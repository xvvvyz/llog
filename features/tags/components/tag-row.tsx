import { SpectrumSwatchPicker } from '@/features/tags/components/spectrum-swatch-picker';
import { updateTag } from '@/features/tags/mutations/update-tag';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
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
}: {
  canManageColor?: boolean;
  canSort?: boolean;
  canToggle?: boolean;
  canManageDefinitions?: boolean;
  color: number;
  id: string;
  isSelected: boolean;
  name: string;
  onCheckedChange?: (selected: boolean) => void;
  onColorChange?: (color: Color) => void;
}) => {
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] =
    React.useState(false);

  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const colorValue = resolveSpectrumColor(color);
  const accentColor = SPECTRUM[colorScheme][colorValue].default;
  const canEditColor = !!canManageColor && !!onColorChange;

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
          <View className="mr-1 h-10 w-8 items-center justify-center">
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
            defaultValue={name}
            maxLength={16}
            onChangeText={(name) => updateTag({ id: id, name })}
            onFocus={() => setIsDeleteButtonVisible(true)}
            placeholder="Tag"
            size="sm"
            onBlur={() =>
              setTimeout(() => setIsDeleteButtonVisible(false), 200)
            }
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
            className="size-[38px] border-0"
            disabled={!canToggle}
            onCheckedChange={(selected) => onCheckedChange?.(selected)}
            wrapperClassName="rounded-full border-continuous"
          />
        )}
      </View>
    </View>
  );
};
