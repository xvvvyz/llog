import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { lightness } from '@/utilities/color';
import { db } from '@/utilities/db';
import { useActiveTeamId } from '@/utilities/hooks/use-active-team-id';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, View } from 'react-native';

const COLORS = [
  [
    'hsl(358,70%,45%)',
    'hsl(12,77%,45%)',
    'hsl(30,73%,45%)',
    'hsl(48,70%,45%)',
    'hsl(121,45%,45%)',
    'hsl(168,45%,45%)',
    'hsl(201,70%,45%)',
    'hsl(214,90%,45%)',
  ],
  [
    'hsl(30,20%,45%)',
    'hsl(120,10%,45%)',
    'hsl(200,7%,45%)',
    'hsl(310,49%,45%)',
    'hsl(280,49%,45%)',
    'hsl(260,39%,45%)',
    'hsl(230,49%,45%)',
    '',
  ],
];

export function LogForm({
  log,
}: {
  log?: { color: string; id: string; name: string };
}) {
  const [color, setColor] = useState(log?.color ?? COLORS[1][2]);
  const [name, setName] = useState(log?.name ?? '');
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  const logId = useMemo(() => log?.id ?? id(), [log?.id]);
  const teamId = useActiveTeamId();

  const trimmedName = name.trim();
  const isDisabled = !trimmedName || !teamId;

  useEffect(() => {
    if (!log) return;
    setColor(log.color);
    setName(log.name);
  }, [log]);

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
    <View className="mx-auto w-full p-8">
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
      <View className="mt-2.5 flex-col gap-2">
        {COLORS.map((rowColors, rowIndex) => (
          <View className="flex-row gap-2" key={`row-${rowIndex}`}>
            {rowColors.map((c) => (
              <Pressable
                className="aspect-square w-16 shrink rounded-full border-8"
                disabled={!c}
                key={`color-${c}`}
                onPress={() => setColor(c)}
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? lightness(c, +25) : 'transparent',
                }}
              />
            ))}
          </View>
        ))}
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
