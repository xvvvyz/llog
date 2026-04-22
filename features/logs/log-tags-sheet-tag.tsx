import { useLogColor } from '@/hooks/use-log-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { toggleTag } from '@/mutations/toggle-log-tag';
import { updateTag } from '@/mutations/update-log-tag';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { DotsSixVertical } from 'phosphor-react-native/lib/module/icons/DotsSixVertical';
import { X } from 'phosphor-react-native/lib/module/icons/X';
import * as React from 'react';
import { View } from 'react-native';
import Sortable from 'react-native-sortables';

export const LogTagsSheetTag = ({
  className,
  id,
  isSelected,
  logId,
  name,
}: {
  className?: string;
  id: string;
  isSelected: boolean;
  logId?: string;
  name: string;
}) => {
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] =
    React.useState(false);

  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();

  return (
    <View
      className={cn(
        'border-border-secondary bg-input h-10 w-40 flex-row items-center rounded-full border',
        className
      )}
      style={{ borderCurve: 'continuous' }}
    >
      <Checkbox
        checked={isSelected}
        checkedColor={logColor.default}
        className="size-10 border-0"
        onCheckedChange={() => toggleTag({ id, isSelected, logId })}
        wrapperClassName="rounded-full"
      />
      <View className="group relative flex-1">
        <Input
          className="border-0 bg-transparent pr-10"
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
            className="size-8"
            onPress={() => sheetManager.open('tag-delete', id)}
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-full absolute right-1 top-1"
          >
            <Icon className="text-muted-foreground" icon={X} />
          </Button>
        ) : (
          <View className="absolute top-0 right-0 size-10 cursor-grab">
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
