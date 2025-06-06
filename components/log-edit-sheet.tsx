import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet } from '@/components/ui/sheet';
import { useSheetManager } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { updateLog } from '@/mutations/update-log';
import { useLog } from '@/queries/use-log';
import { SPECTRUM } from '@/theme/spectrum';
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
      <View className="mx-auto w-full max-w-md p-8">
        <View>
          <Label>Name</Label>
          <Input
            maxLength={32}
            onChangeText={(name) => updateLog({ id: log.id, name })}
            value={log.name}
          />
        </View>
        <View className="mt-8">
          <View className="gap-2">
            {[
              [11, 0, 9, 8, 7, 6],
              [10, 1, 2, 3, 4, 5],
            ].map((row, rowIndex) => (
              <View className="flex-row gap-2" key={`row-${rowIndex}`}>
                {row.map((color) => (
                  <Button
                    className="h-full w-full rounded-full border-4"
                    key={`color-${color}`}
                    onPress={() => updateLog({ color, id: log.id })}
                    ripple="default"
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
                    variant="ghost"
                    wrapperClassName="shrink w-16 aspect-square rounded-full"
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
