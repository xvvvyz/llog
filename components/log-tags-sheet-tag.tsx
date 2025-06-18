import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { toggleLogTag } from '@/mutations/toggle-log-tag';
import { updateLogTag } from '@/mutations/update-log-tag';
import { cn } from '@/utilities/ui/utils';
import { GripVertical, X } from 'lucide-react-native';
import { useState } from 'react';
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
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] = useState(false);
  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();

  return (
    <View
      className={cn(
        'w-40 flex-row items-center rounded-full border border-border-secondary bg-input',
        className
      )}
      style={{ borderCurve: 'continuous' }}
    >
      <Checkbox
        checked={isSelected}
        checkedColor={logColor.default}
        className="size-10 border-0"
        onCheckedChange={() => toggleLogTag({ id, isSelected, logId })}
        wrapperClassName="rounded-full"
      />
      <View className="group relative flex-1">
        <Input
          className="border-0 bg-transparent pr-10"
          defaultValue={name}
          maxLength={16}
          onBlur={() => setTimeout(() => setIsDeleteButtonVisible(false), 200)}
          onChangeText={(name) => updateLogTag({ id: id, name })}
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
            <Icon className="text-muted-foreground" icon={X} size={20} />
          </Button>
        ) : (
          <View className="absolute right-0 top-0 size-10 cursor-grab">
            <Sortable.Handle>
              <View className="size-10 items-center justify-center">
                <Icon
                  className="text-placeholder"
                  icon={GripVertical}
                  size={20}
                />
              </View>
            </Sortable.Handle>
          </View>
        )}
      </View>
    </View>
  );
};
