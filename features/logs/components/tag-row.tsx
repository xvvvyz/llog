import { useLogColor } from '@/features/logs/hooks/use-color';
import { toggleTag } from '@/features/logs/mutations/toggle-tag';
import { updateTag } from '@/features/logs/mutations/update-tag';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { DotsSixVertical, X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Sortable from 'react-native-sortables';

export const TagRow = ({
  id,
  isSelected,
  logId,
  name,
  onCheckedChange,
}: {
  id: string;
  isSelected: boolean;
  logId?: string;
  name: string;
  onCheckedChange?: () => void;
}) => {
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] =
    React.useState(false);

  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();

  return (
    <View className="flex-row h-10 w-40 border-border-secondary border-continuous rounded-full bg-input border items-center">
      <Checkbox
        checked={isSelected}
        checkedColor={logColor.default}
        className="size-10 border-0"
        wrapperClassName="rounded-full border-continuous"
        onCheckedChange={() => {
          toggleTag({ id, isSelected, logId });
          onCheckedChange?.();
        }}
      />
      <View className="relative flex-1 group">
        <Input
          className="pr-10 border-0 bg-transparent"
          defaultValue={name}
          maxLength={16}
          onBlur={() => setTimeout(() => setIsDeleteButtonVisible(false), 200)}
          onChangeText={(name) => updateTag({ id: id, name })}
          onFocus={() => setIsDeleteButtonVisible(true)}
          placeholder="Tag"
          size="sm"
        />
        {isDeleteButtonVisible ? (
          <Button
            className="size-8 rounded-2xl"
            onPress={() => sheetManager.open('tag-delete', id)}
            size="icon"
            variant="ghost"
            wrapperClassName="absolute right-1 top-1 rounded-2xl border-continuous"
          >
            <Icon className="text-muted-foreground" icon={X} />
          </Button>
        ) : (
          <View className="absolute right-0 top-0 size-10 cursor-grab">
            <Sortable.Handle>
              <View className="size-10 items-center justify-center">
                <Icon className="text-placeholder" icon={DotsSixVertical} />
              </View>
            </Sortable.Handle>
          </View>
        )}
      </View>
    </View>
  );
};
