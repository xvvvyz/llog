import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as inputGroup from '@/ui/input-group';
import { useSheetDragLock } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import * as React from 'react';

import {
  Platform,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

const nativePickerStyles = StyleSheet.create({ iosSpinner: { height: 216 } });

export type NativeRecordTimePickerMode = 'date' | 'time';

export const getPickerDateParts = (date: Date) =>
  Platform.OS === 'android'
    ? {
        day: date.getUTCDate(),
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
      }
    : { day: date.getDate(), month: date.getMonth(), year: date.getFullYear() };

const NativePickerPanel = ({ children }: { children: React.ReactNode }) => {
  const dragLock = useSheetDragLock();

  return (
    <View
      className="overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border items-center"
      onResponderTerminate={dragLock.unlock}
      onTouchCancel={dragLock.unlock}
      onTouchEnd={dragLock.unlock}
      onTouchStart={dragLock.lock}
    >
      {children}
    </View>
  );
};

const NativeRecordTimeToggleButton = ({
  isShowingImplicitRecordTime,
  label,
  mode,
  onPickerModeChange,
  wrapperClassName,
}: {
  isShowingImplicitRecordTime: boolean;
  label: string;
  mode: NativeRecordTimePickerMode;
  onPickerModeChange: React.Dispatch<
    React.SetStateAction<NativeRecordTimePickerMode | null>
  >;
  wrapperClassName: string;
}) => (
  <Button
    accessibilityLabel={mode === 'date' ? 'Record date' : 'Record time'}
    className="h-full px-3 rounded-none justify-start"
    size="sm"
    variant="ghost"
    wrapperClassName={cn('h-full rounded-none', wrapperClassName)}
    onPress={() =>
      onPickerModeChange((current) => (current === mode ? null : mode))
    }
  >
    <Text
      numberOfLines={1}
      className={cn(
        'flex-1 min-w-0 text-foreground',
        isShowingImplicitRecordTime && 'text-placeholder'
      )}
    >
      {label}
    </Text>
  </Button>
);

const NativePickerField = ({
  accentColor,
  maximumDate,
  mode,
  onDismiss,
  onValueChange,
  themeVariant,
  value,
  width,
}: {
  accentColor?: string;
  maximumDate?: Date;
  mode: NativeRecordTimePickerMode;
  onDismiss: () => void;
  onValueChange: (event: unknown, date: Date) => void;
  themeVariant: 'dark' | 'light';
  value: Date;
  width: number;
}) => {
  if (Platform.OS === 'ios') {
    return (
      <NativePickerPanel>
        <DateTimePicker
          accentColor={accentColor}
          display="spinner"
          maximumDate={mode === 'date' ? maximumDate : undefined}
          mode={mode}
          onValueChange={onValueChange}
          style={[nativePickerStyles.iosSpinner, { width }]}
          themeVariant={themeVariant}
          value={value}
        />
      </NativePickerPanel>
    );
  }

  if (Platform.OS !== 'android') return null;

  return (
    <DateTimePicker
      accentColor={accentColor}
      display={mode === 'date' ? 'spinner' : undefined}
      is24Hour={mode === 'time' ? true : undefined}
      maximumDate={mode === 'date' ? maximumDate : undefined}
      mode={mode}
      negativeButton={{ label: 'Cancel' }}
      onDismiss={onDismiss}
      onValueChange={onValueChange}
      positiveButton={{ label: 'Set' }}
      presentation="dialog"
      value={value}
    />
  );
};

export const NativeRecordTimeFields = ({
  accentColor,
  dateText,
  draftDate,
  isShowingImplicitRecordTime,
  maxRecordDate,
  nativePickerMode,
  onNativeDateChange,
  onNativeTimeChange,
  onPickerModeChange,
  onResetAction,
  resetActionAccessibilityLabel,
  resetActionLabel,
  showResetAction,
  timeText,
}: {
  accentColor?: string;
  dateText: string;
  draftDate: Date;
  isShowingImplicitRecordTime: boolean;
  maxRecordDate?: Date;
  nativePickerMode: NativeRecordTimePickerMode | null;
  onNativeDateChange: (event: unknown, date: Date) => void;
  onNativeTimeChange: (event: unknown, date: Date) => void;
  onPickerModeChange: React.Dispatch<
    React.SetStateAction<NativeRecordTimePickerMode | null>
  >;
  onResetAction: () => void;
  resetActionAccessibilityLabel: string;
  resetActionLabel: string;
  showResetAction: boolean;
  timeText: string;
}) => {
  const colorScheme = useColorScheme();
  const windowDimensions = useWindowDimensions();
  const nativeThemeVariant = colorScheme === 'dark' ? 'dark' : 'light';

  const nativePickerWidth = Math.max(
    1,
    Math.min(384, Math.round(windowDimensions.width - 32))
  );

  const handlePickerDismiss = React.useCallback(
    () => onPickerModeChange(null),
    [onPickerModeChange]
  );

  return (
    <View className="gap-2">
      <inputGroup.InputGroup className="w-full" size="sm">
        <NativeRecordTimeToggleButton
          isShowingImplicitRecordTime={isShowingImplicitRecordTime}
          label={dateText}
          mode="date"
          onPickerModeChange={onPickerModeChange}
          wrapperClassName="basis-0 flex-1 min-w-0"
        />
        <NativeRecordTimeToggleButton
          isShowingImplicitRecordTime={isShowingImplicitRecordTime}
          label={timeText}
          mode="time"
          onPickerModeChange={onPickerModeChange}
          wrapperClassName="w-28 shrink-0 border-l border-border-secondary"
        />
        {showResetAction && (
          <inputGroup.InputGroupButton
            accessibilityLabel={resetActionAccessibilityLabel}
            className="h-full px-3"
            onPress={onResetAction}
            size="sm"
            variant="ghost"
            wrapperClassName="h-full shrink-0"
          >
            <Text numberOfLines={1}>{resetActionLabel}</Text>
          </inputGroup.InputGroupButton>
        )}
      </inputGroup.InputGroup>
      {nativePickerMode === 'date' && (
        <NativePickerField
          accentColor={accentColor}
          maximumDate={maxRecordDate}
          mode="date"
          onDismiss={handlePickerDismiss}
          onValueChange={onNativeDateChange}
          themeVariant={nativeThemeVariant}
          value={draftDate}
          width={nativePickerWidth}
        />
      )}
      {nativePickerMode === 'time' && (
        <NativePickerField
          accentColor={accentColor}
          mode="time"
          onDismiss={handlePickerDismiss}
          onValueChange={onNativeTimeChange}
          themeVariant={nativeThemeVariant}
          value={draftDate}
          width={nativePickerWidth}
        />
      )}
    </View>
  );
};
