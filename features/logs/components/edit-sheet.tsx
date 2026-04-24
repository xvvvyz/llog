import { updateLog } from '@/features/logs/mutations/update-log';
import { useLog } from '@/features/logs/queries/use-log';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { SPECTRUM } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
import { View } from 'react-native';

export const LogEditSheet = () => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const isDark = colorScheme === 'dark';
  const log = useLog({ id: sheetManager.getId('log-edit') });

  return (
    <Sheet
      loading={log.isLoading}
      onDismiss={() => sheetManager.close('log-edit')}
      open={sheetManager.isOpen('log-edit')}
      portalName="log-edit"
    >
      <View className="mx-auto max-w-md w-full p-8">
        <View>
          <Label>Name</Label>
          <Input
            maxLength={32}
            onChangeText={(name) => updateLog({ id: log.id!, name })}
            value={log.name}
          />
        </View>
        <View className="mt-8">
          <View className="gap-2">
            {[
              [11, 0, 9, 8, 7, 6],
              [10, 1, 2, 3, 4, 5],
            ].map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} className="flex-row gap-2">
                {row.map((color) => (
                  <Button
                    key={`color-${color}`}
                    className="h-full w-full border-4 rounded-full"
                    onPress={() => updateLog({ color, id: log.id! })}
                    ripple="default"
                    variant="ghost"
                    wrapperClassName="shrink w-16 aspect-square rounded-full"
                    style={{
                      backgroundColor:
                        SPECTRUM[colorScheme][color][
                          log.color === color
                            ? isDark
                              ? 'darker'
                              : 'lighter'
                            : 'default'
                        ],
                      borderColor:
                        SPECTRUM[colorScheme][color][
                          log.color === color
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
        </View>
      </View>
    </Sheet>
  );
};
