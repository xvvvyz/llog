import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { useActiveTeamId } from '@/utilities/hooks/use-active-team-id';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const COLORS = [
  [
    'hsl(200, 7%, 54%)',
    'hsl(120, 10%, 61%)',
    'hsl(30, 20%, 61%)',
    'hsl(20, 40%, 45%)',
    'hsl(358, 70%, 61%)',
    'hsl(12, 77%, 67%)',
    'hsl(30, 73%, 62%)',
    'hsl(48, 70%, 56%)',
  ],
  [
    'hsl(121, 45%, 56%)',
    'hsl(168, 45%, 55%)',
    'hsl(201, 70%, 70%)',
    'hsl(214, 90%, 60%)',
    'hsl(230, 49%, 49%)',
    'hsl(260, 39%, 49%)',
    'hsl(280, 49%, 63%)',
    'hsl(310, 49%, 68%)',
  ],
];

export function LogForm({
  onSuccess,
  log,
}: {
  onSuccess: () => void;
  log?: {
    color?: string;
    id: string;
    name: string;
  };
}) {
  const [name, setName] = React.useState(log?.name ?? '');
  const [color, setColor] = React.useState(log?.color ?? COLORS[0][0]);
  const teamId = useActiveTeamId();

  const trimmedName = name.trim();
  const isDisabled = !trimmedName || !teamId;

  const handleSubmit = () => {
    if (isDisabled) return;
    const logId = log?.id ?? id();

    db.transact(
      db.tx.logs[logId].update({ color, name }).link({ team: teamId })
    );

    if (!log) router.push(`/${logId}`);
    onSuccess();
  };

  return (
    <View className="p-8">
      <Label nativeID="name">Name</Label>
      <Input
        aria-labelledby="name"
        autoCapitalize="none"
        autoComplete="off"
        autoFocus
        className="mt-2 w-full"
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        placeholder="My journal, Fido the dog, etc."
        returnKeyType="done"
        value={name}
      />
      <Label className="mt-6">Color</Label>
      <View className="mt-2">
        <View className="flex-col gap-2">
          {COLORS.map((rowColors, rowIndex) => (
            <View className="flex-row gap-2" key={`row-${rowIndex}`}>
              {rowColors.map((c) => (
                <Pressable
                  className="aspect-square w-12 shrink rounded-full"
                  key={`color-${c}`}
                  onPress={() => setColor(c)}
                  style={[
                    { backgroundColor: c },
                    color === c && { borderWidth: 4, borderColor: 'white' },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Button
        className="mt-8 w-full"
        disabled={isDisabled}
        onPress={handleSubmit}
      >
        <Text>Save</Text>
      </Button>
    </View>
  );
}
