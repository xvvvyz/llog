import { updateTag } from '@/features/tags/mutations/update-tag';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Text } from '@/ui/text';
import { DotsSixVertical, X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Sortable from 'react-native-sortables';

export const TagRow = ({
  canToggle = true,
  canManageDefinitions = true,
  checkedColor,
  id,
  isSelected,
  name,
  onCheckedChange,
}: {
  canToggle?: boolean;
  canManageDefinitions?: boolean;
  checkedColor?: string;
  id: string;
  isSelected: boolean;
  name: string;
  onCheckedChange?: (selected: boolean) => void;
}) => {
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] =
    React.useState(false);

  const sheetManager = useSheetManager();

  return (
    <View className="flex-row w-full gap-3 items-center">
      <View className="flex-1 flex-row h-10 min-w-0 border-border-secondary border-continuous rounded-full bg-input border items-center">
        {canManageDefinitions && (
          <View className="size-10 cursor-grab">
            <Sortable.Handle>
              <View className="size-10 items-center justify-center">
                <Icon className="text-placeholder" icon={DotsSixVertical} />
              </View>
            </Sortable.Handle>
          </View>
        )}
        {!canManageDefinitions ? (
          <View className="flex-1 h-10 min-w-0 pl-4 justify-center">
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
            checkedColor={checkedColor}
            className="size-10 border-0"
            disabled={!canToggle}
            onCheckedChange={(selected) => onCheckedChange?.(selected)}
            wrapperClassName="rounded-full border-continuous"
          />
        )}
      </View>
    </View>
  );
};
