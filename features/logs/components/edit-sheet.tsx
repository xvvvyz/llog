import { LOG_NAME_MAX_LENGTH } from '@/features/logs/lib/limits';
import { updateLog } from '@/features/logs/mutations/update-log';
import { useLog } from '@/features/logs/queries/use-log';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { View } from 'react-native';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

export const LogEditSheet = () => {
  const sheetManager = useSheetManager();
  const log = useLog({ id: sheetManager.getId('log-edit') });

  return (
    <Sheet
      className="md:max-w-sm"
      loading={log.isLoading}
      onDismiss={() => sheetManager.close('log-edit')}
      open={sheetManager.isOpen('log-edit')}
      portalName="log-edit"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <View>
          <Input
            accessibilityLabel="Log name"
            maxLength={LOG_NAME_MAX_LENGTH}
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
                    onPress={() => updateLog({ color, id: log.id! })}
                    ripple="default"
                    variant="ghost"
                    wrapperClassName="shrink w-16 aspect-square rounded-full"
                    className={cn(
                      'h-full w-full border-4 rounded-full',
                      spectrumClassNames.getSpectrumSwatchBackgroundClassName(
                        color,
                        log.color === color
                      ),
                      spectrumClassNames.getSpectrumSwatchBorderClassName(
                        color,
                        log.color === color
                      )
                    )}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
        <Button
          onPress={() => sheetManager.close('log-edit')}
          variant="secondary"
          wrapperClassName="mt-8"
        >
          <Text>Close</Text>
        </Button>
      </View>
    </Sheet>
  );
};
