import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { createRule } from '@/mutations/create-rule';
import { id } from '@instantdb/react-native';
import { Plus, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

export const RuleListEmptyState = () => {
  return (
    <View className="flex-1 items-center justify-center gap-8 px-3 py-8">
      <Icon className="-mb-2 text-primary" icon={Sparkles} size={64} />
      <Text className="text-center text-muted-foreground">
        Automate your workflows.
      </Text>
      <Button onPress={() => createRule({ id: id(), prompt: '' })}>
        <Icon icon={Plus} className="-ml-0.5 text-white" size={20} />
        <Text>New rule</Text>
      </Button>
    </View>
  );
};
