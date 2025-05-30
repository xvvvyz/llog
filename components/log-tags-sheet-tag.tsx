import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useSheetManager } from '@/context/sheet-manager';
import { toggleLogTag } from '@/mutations/toggle-log-tag';
import { updateLogTag } from '@/mutations/update-log-tag';
import { cn } from '@/utilities/cn';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

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
  const sheetManager = useSheetManager();

  return (
    <View className={cn('w-36 flex-row rounded-xl bg-input', className)}>
      <Checkbox
        checked={isSelected}
        className="size-10"
        onCheckedChange={() => toggleLogTag({ id, isSelected, logId })}
      />
      <View className="group relative flex-1">
        <Input
          autoCapitalize="none"
          autoComplete="name"
          autoCorrect={false}
          bottomSheet
          className="bg-transparent focus:pr-10"
          defaultValue={name}
          maxLength={16}
          multiline={false}
          onBlur={() => setTimeout(() => setIsDeleteButtonVisible(false), 200)}
          onChangeText={(name) => updateLogTag({ id: id, name })}
          onFocus={() => setIsDeleteButtonVisible(true)}
          placeholder="Tag"
          returnKeyType="done"
          size="sm"
        />
        {isDeleteButtonVisible && (
          <Button
            accessibilityHint="Removes this tag"
            accessibilityLabel={`Remove ${name}`}
            className="size-8"
            onPress={() => sheetManager.open('tag-delete', id)}
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-full absolute right-1 top-1"
          >
            <Icon className="text-muted-foreground" icon={X} size={20} />
          </Button>
        )}
      </View>
    </View>
  );
};
