import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { useActiveTeamId } from '@/utilities/hooks/use-active-team-id';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable } from 'react-native';

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
  log,
}: {
  log?: { color?: string; id: string; name: string };
}) {
  const [color, setColor] = useState(log?.color ?? COLORS[0][0]);
  const [name, setName] = useState(log?.name ?? '');
  const logId = useMemo(() => log?.id ?? id(), [log?.id]);
  const teamId = useActiveTeamId();
  const inputRef = useRef<ComponentRef<typeof Input>>(null);

  const trimmedName = name.trim();
  const isDisabled = !trimmedName || !teamId;

  const handleSubmit = () => {
    if (isDisabled) return;

    db.transact(
      db.tx.logs[logId]
        .update({ color, name: trimmedName })
        .link({ team: teamId })
    );

    if (!log) router.replace(`/${logId}`);
    else router.back();
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
        ref={inputRef}
        returnKeyType="go"
        value={name}
      />
      <Label className="mt-6">Color</Label>
      <View className="mt-2.5">
        <View className="flex-col gap-2">
          {COLORS.map((rowColors, rowIndex) => (
            <View className="flex-row gap-2" key={`row-${rowIndex}`}>
              {rowColors.map((c) => (
                <Pressable
                  className={cn(
                    'aspect-square w-12 shrink rounded-full',
                    color === c &&
                      'scale-110 ring-4 ring-inset ring-black dark:ring-white'
                  )}
                  key={`color-${c}`}
                  onPress={() => setColor(c)}
                  style={{ backgroundColor: c }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Button
        className="mt-12 w-full"
        disabled={isDisabled}
        onPress={handleSubmit}
      >
        <Text>Save</Text>
      </Button>
    </View>
  );
}
