import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { BottomSheetView, useBottomSheet } from '@gorhom/bottom-sheet';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, View } from 'react-native';

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
  const bottomSheet = useBottomSheet();
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

    if (log) bottomSheet.close();
    else router.replace(`/${logId}`);
    Keyboard.dismiss();
  };

  return (
    <BottomSheetView className="mx-auto w-full max-w-md p-8">
      <Label nativeID="name">Name</Label>
      <Input
        aria-labelledby="name"
        autoCapitalize="none"
        autoComplete="off"
        bottomSheet
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        placeholder="My journal, Fido the dog, etc."
        ref={inputRef}
        returnKeyType="next"
        value={name}
      />
      <View className="mt-8 flex-col gap-2">
        {COLOR_ROWS.map((rowColors, rowIndex) => (
          <View className="flex-row gap-2" key={`row-${rowIndex}`}>
            {rowColors.map((key) => (
              <Button
                className="h-full w-full rounded-full border-4"
                key={`color-${key}`}
                onPress={() => setColor(key)}
                ripple="default"
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
                variant="ghost"
                wrapperClassName="shrink w-16 aspect-square rounded-full"
              />
            ))}
          </View>
        ))}
      </View>
      <View className="mt-12 flex-row gap-4">
        <Button
          onPress={() => {
            bottomSheet.close();
            Keyboard.dismiss();
          }}
          variant="secondary"
          wrapperClassName="shrink w-full"
        >
          <Text>Cancel</Text>
        </Button>
        <Button
          disabled={isDisabled}
          onPress={handleSubmit}
          wrapperClassName="shrink w-full"
        >
          <Text>Save</Text>
        </Button>
      </View>
    </BottomSheetView>
  );
}
