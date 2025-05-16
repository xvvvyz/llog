import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { COLORS, type Color } from '@/themes/colors';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import chroma from 'chroma-js';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, View } from 'react-native';

const COLOR_ROWS: [Color[], Color[]] = [
  ['gray', 'magenta', 'purple', 'violet', 'indigo', 'blue', 'azure', 'cyan'],
  ['red', 'coral', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal'],
];

export function LogForm({
  log,
}: {
  log?: { color: Color; id: string; name: string };
}) {
  const [color, setColor] = useState<Color>(log?.color ?? 'gray');
  const [name, setName] = useState(log?.name ?? '');
  const colorScheme = useColorScheme();
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
        {COLOR_ROWS.map((rowColors, rowIndex) => (
          <View className="flex-row gap-2" key={`row-${rowIndex}`}>
            {rowColors.map((key) => {
              const chromaColor = chroma(COLORS[colorScheme][key]);

              return (
                <Pressable
                  className="aspect-square w-16 shrink rounded-full border-8"
                  key={`color-${key}`}
                  onPress={() => setColor(key)}
                  style={{
                    backgroundColor:
                      color === key
                        ? chromaColor.brighten(1.5).css('rgb')
                        : chromaColor.css('rgb'),
                    borderColor:
                      color === key ? chromaColor.css('rgb') : 'transparent',
                  }}
                />
              );
            })}
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
