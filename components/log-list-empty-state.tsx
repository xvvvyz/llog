import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Plus, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

export const LogListEmptyState = ({ createLog }: { createLog: () => void }) => {
  return (
    <View className="flex-1 items-center justify-center gap-6 py-8">
      <Icon
        aria-hidden
        className="-mb-2 text-primary"
        icon={Sparkles}
        size={64}
      />
      <Text className="text-center text-muted-foreground">
        &ldquo;Without data, you&rsquo;re just another{'\n'}person with an
        opinion.&rdquo;
      </Text>
      <Button
        accessibilityHint="Opens a form to create your first log"
        accessibilityLabel="Create your first log"
        onPress={createLog}
      >
        <Icon
          icon={Plus}
          className="-ml-0.5 text-white"
          size={20}
          aria-hidden
        />
        <Text>New log</Text>
      </Button>
    </View>
  );
};
