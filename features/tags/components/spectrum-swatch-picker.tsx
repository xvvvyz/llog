import { cn } from '@/lib/cn';
import type { Color } from '@/theme/spectrum';
import * as Menu from '@/ui/dropdown-menu';
import { View } from 'react-native';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

const SPECTRUM_COLOR_ROWS = [
  [11, 0, 9, 8, 7, 6],
  [10, 1, 2, 3, 4, 5],
] as const satisfies readonly (readonly Color[])[];

export const SpectrumSwatchPicker = ({
  onValueChange,
  value,
}: {
  onValueChange: (color: Color) => void;
  value?: Color;
}) => {
  return (
    <View className="gap-2">
      {SPECTRUM_COLOR_ROWS.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} className="flex-row gap-2">
          {row.map((color) => {
            const selected = value === color;

            return (
              <Menu.Item
                key={`color-${color}`}
                accessibilityLabel={`Color ${color + 1}`}
                className="min-w-0 size-9 pl-0 pr-0 rounded-full justify-center"
                onPress={() => onValueChange(color)}
              >
                <View
                  className={cn(
                    'size-5 border-[3px] border-continuous rounded-full',
                    spectrumClassNames.getSpectrumSwatchBackgroundClassName(
                      color,
                      selected
                    ),
                    spectrumClassNames.getSpectrumSwatchBorderClassName(
                      color,
                      selected
                    )
                  )}
                />
              </Menu.Item>
            );
          })}
        </View>
      ))}
    </View>
  );
};
