import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { GripVertical, Tag, X } from 'lucide-react-native';
import { View } from 'react-native';
import Sortable from 'react-native-sortables';

export const LogTagsFormTag = ({
  checked,
  id,
  name,
  setDeleteFormId,
  showHandle,
  toggle,
  update,
}: {
  checked: boolean;
  id: string;
  name: string;
  setDeleteFormId: (id: string) => void;
  showHandle: boolean;
  toggle: (id: string) => void;
  update: (id: string, name: string) => void;
}) => {
  return (
    <View className="flex-row gap-2">
      <View className="relative flex-1">
        {showHandle ? (
          <View className="absolute -left-1 -top-1 z-10">
            <Sortable.Handle>
              <View className="flex size-12 cursor-grab items-center justify-center">
                <Icon
                  aria-hidden
                  className="text-placeholder"
                  icon={GripVertical}
                  size={18}
                />
              </View>
            </Sortable.Handle>
          </View>
        ) : (
          <View className="absolute left-2.5 top-2.5">
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Tag}
              size={18}
            />
          </View>
        )}
        <Input
          bottomSheet
          className="px-10"
          defaultValue={name}
          maxLength={20}
          multiline={false}
          onChangeText={(name) => update(id, name)}
          placeholder="Tag"
          returnKeyType="done"
          size="sm"
        />
        <Button
          accessibilityHint="Removes this tag"
          accessibilityLabel={`Remove ${name}`}
          className="size-8"
          onPress={() => setDeleteFormId(id)}
          size="icon"
          variant="ghost"
          wrapperClassName="rounded-full absolute right-1 top-1"
        >
          <Icon className="text-placeholder" icon={X} size={18} />
        </Button>
      </View>
      <Checkbox
        checked={checked}
        className="size-10"
        onCheckedChange={() => toggle(id)}
      />
    </View>
  );
};
