import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { createLog } from '@/mutations/create-log';
import { useActiveTeamId } from '@/queries/use-active-team-id';
import { router } from 'expo-router';
import { Plus, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

export const LogListEmptyState = () => {
  const teamId = useActiveTeamId();

  return (
    <View className="flex-1 items-center justify-center gap-6 py-8">
      <Icon
        aria-hidden
        className="-mb-2 fill-primary text-primary"
        icon={Sparkles}
        size={64}
      />
      <Text className="text-center text-muted-foreground">
        Without data, you&rsquo;re just another{'\n'}person with an opinion.
      </Text>
      <Button
        accessibilityHint="Opens a form to create your first log"
        accessibilityLabel="Create your first log"
        onPress={() => router.push(`/${createLog({ teamId })}`)}
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
