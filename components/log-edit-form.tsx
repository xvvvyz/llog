import { BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

const COLOR_ROWS = [
  ['indigo', 'purple', 'pink', 'red', 'orange', 'gray'],
  ['blue', 'teal', 'green', 'yellow', 'amber', 'brown'],
];

export function LogEditForm({ logId }: { logId: string }) {
  const colorScheme = useColorScheme();

  const { data, isLoading } = db.useQuery({
    logs: { $: { where: { id: logId } } },
  });

  const log = data?.logs?.[0];
  const isDark = colorScheme === 'dark';

  if (isLoading) {
    return <BottomSheetLoading />;
  }

  return (
    <BottomSheetView>
      <View className="mx-auto w-full max-w-md p-8">
        <View>
          <Label nativeID="name">Name</Label>
          <Input
            aria-labelledby="name"
            autoCapitalize="none"
            autoComplete="off"
            bottomSheet
            defaultValue={log?.name}
            maxLength={40}
            onChangeText={(name) => {
              if (!log) return;
              db.transact(db.tx.logs[log.id].update({ name }));
            }}
            returnKeyType="done"
          />
        </View>
        <View className="mt-8">
          <Label>Color</Label>
          <View className="gap-2">
            {COLOR_ROWS.map((rowColors, rowIndex) => (
              <View className="flex-row gap-2" key={`row-${rowIndex}`}>
                {rowColors.map((key) => (
                  <Button
                    className="h-full w-full rounded-full border-4"
                    key={`color-${key}`}
                    onPress={() => {
                      if (!log) return;
                      db.transact(db.tx.logs[log.id].update({ color: key }));
                    }}
                    ripple="default"
                    style={{
                      backgroundColor:
                        SPECTRUM[colorScheme][key as Color][
                          log?.color === key
                            ? isDark
                              ? 'darker'
                              : 'lighter'
                            : 'default'
                        ],
                      borderColor:
                        SPECTRUM[colorScheme][key as Color][
                          log?.color === key
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
        </View>
      </View>
    </BottomSheetView>
  );
}
