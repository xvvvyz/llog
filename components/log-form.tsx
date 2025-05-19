import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, View } from 'react-native';

const COLOR_ROWS = [
  ['indigo', 'purple', 'pink', 'red', 'orange', 'gray'],
  ['blue', 'teal', 'green', 'yellow', 'amber', 'brown'],
];

export function LogForm({
  log,
}: {
  log?: { color: string; id: string; name: string };
}) {
  const [color, setColor] = useState('indigo');
  const [name, setName] = useState('');
  const colorScheme = useColorScheme();
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  const logId = useMemo(() => log?.id ?? id(), [log?.id]);
  const teamId = useActiveTeamId();

  const isDark = colorScheme === 'dark';
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
        placeholder="My journal"
        ref={inputRef}
        returnKeyType="go"
        value={name}
      />
      <View className="mt-6 flex-col gap-2">
        {COLOR_ROWS.map((rowColors, rowIndex) => (
          <View className="flex-row gap-2" key={`row-${rowIndex}`}>
            {rowColors.map((key) => (
              <Pressable
                className="aspect-square w-16 shrink rounded-full border-4"
                key={`color-${key}`}
                onPress={() => setColor(key)}
                style={{
                  backgroundColor:
                    SPECTRUM[colorScheme][key as Color][
                      color === key
                        ? isDark
                          ? 'darker'
                          : 'lighter'
                        : 'default'
                    ],
                  borderColor:
                    SPECTRUM[colorScheme][key as Color][
                      color === key
                        ? isDark
                          ? 'lighter'
                          : 'darker'
                        : 'default'
                    ],
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <Button
        disabled={isDisabled}
        onPress={handleSubmit}
        wrapperClassName="mt-12"
      >
        <Text>Save</Text>
      </Button>
    </View>
  );
}
