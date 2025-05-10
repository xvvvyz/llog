import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/lib/use-active-team-id';
import { db } from '@/lib/utils';
import { id } from '@instantdb/react-native';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function NewLog() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const router = useRouter();
  const teamId = useActiveTeamId();
  const isDisabled = !name || !teamId || isSubmitting;

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    const logId = id();

    await db.transact(
      db.tx.logs[logId].update({ name }).link({ team: teamId })
    );

    router.replace(`/${logId}`);
  };

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Label className="text-3xl" nativeID="name">
        Give your log a name
      </Label>
      <Input
        autoFocus
        className="w-full"
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        placeholder="e.g. My journal, Fido the dog, etc."
        returnKeyType="next"
        value={name}
      />
      <Button className="w-full" disabled={isDisabled} onPress={handleSubmit}>
        <Text>Create</Text>
      </Button>
    </View>
  );
}
