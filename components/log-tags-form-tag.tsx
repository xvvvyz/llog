import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/utilities/cn';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

export const LogTagsFormTag = ({
  checked,
  className,
  id,
  name,
  setDeleteFormId,
  toggle,
  update,
}: {
  checked: boolean;
  className?: string;
  id: string;
  name: string;
  setDeleteFormId: (id: string) => void;
  toggle: (id: string) => void;
  update: (id: string, name: string) => void;
}) => {
  const [isDeleteButtonVisible, setIsDeleteButtonVisible] = useState(false);

  return (
    <View className={cn('w-36 flex-row rounded-xl bg-input', className)}>
      <Checkbox
        checked={checked}
        className="size-10"
        onCheckedChange={() => toggle(id)}
      />
      <View className="group relative flex-1">
        <Input
          bottomSheet
          className="bg-transparent focus:pr-10"
          defaultValue={name}
          maxLength={16}
          multiline={false}
          onChangeText={(name) => update(id, name)}
          onFocus={() => setIsDeleteButtonVisible(true)}
          onBlur={() => setTimeout(() => setIsDeleteButtonVisible(false), 200)}
          placeholder="Tag"
          returnKeyType="done"
          size="sm"
        />
        {isDeleteButtonVisible && (
          <Button
            accessibilityHint="Removes this tag"
            accessibilityLabel={`Remove ${name}`}
            className="size-8"
            onPress={() => setDeleteFormId(id)}
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-full absolute right-1 top-1"
          >
            <Icon className="text-muted-foreground" icon={X} size={18} />
          </Button>
        )}
      </View>
    </View>
  );
};
