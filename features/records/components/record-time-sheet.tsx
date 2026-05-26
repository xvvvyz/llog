import * as recordTime from '@/features/records/lib/record-time';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as buttonGroup from '@/ui/button-group';
import { Icon } from '@/ui/icon';
import * as inputGroup from '@/ui/input-group';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Clock } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

const recordTimeInputValues = (date: Date) => ({
  dateText: recordTime.toRecordDateInputValue(date),
  timeText: recordTime.toRecordTimeInputValue(date),
});

const recordTimeInputKey = (date: Date) => {
  const value = recordTimeInputValues(date);
  return `${value.dateText} ${value.timeText}`;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

const WebDateTimeInput = ({
  accessibilityLabel,
  max,
  onChange,
  textClassName,
  type,
  value,
  wrapperClassName,
}: {
  accessibilityLabel: string;
  max?: string;
  onChange: (value: string) => void;
  textClassName?: string;
  type: 'date' | 'time';
  value: string;
  wrapperClassName?: string;
}) => (
  <View className={wrapperClassName}>
    {React.createElement('input', {
      'aria-label': accessibilityLabel,
      className: cn(
        'box-border h-10 min-w-0 w-full appearance-none border-0 bg-transparent px-3 text-base text-foreground web:focus-visible:outline-hidden',
        textClassName
      ),
      max,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.currentTarget.value);
      },
      type,
      value,
    })}
  </View>
);

export const RecordTimeButton = ({
  disabled,
  isCustom,
  iconClassName,
  onPress,
}: {
  disabled?: boolean;
  isCustom: boolean;
  iconClassName?: string;
  onPress: () => void;
}) => (
  <Button
    accessibilityLabel="Change record time"
    accessibilityState={{ selected: isCustom }}
    disabled={disabled}
    onPress={onPress}
    size="icon-xs"
    variant="secondary"
  >
    <Icon
      className={cn(isCustom && iconClassName)}
      icon={Clock}
      weight={isCustom ? 'fill' : 'regular'}
    />
  </Button>
);

export const RecordTimePreviewRow = ({
  className,
  iconClassName,
  label,
  onPress,
}: {
  className?: string;
  iconClassName?: string;
  label: string;
  onPress: () => void;
}) => (
  <Button
    accessibilityLabel="Change record time"
    onPress={onPress}
    size="sm"
    variant="ghost"
    wrapperClassName="w-full rounded-none border-continuous"
    className={cn(
      'h-auto min-h-10 px-3 py-2 rounded-none justify-start gap-2',
      className
    )}
  >
    <Icon
      className={cn('shrink-0', iconClassName)}
      icon={Clock}
      size={20}
      weight={iconClassName ? 'fill' : 'regular'}
    />
    <Text
      className={cn('flex-1 min-w-0 font-normal text-sm', iconClassName)}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Button>
);

export const RecordTimeSheet = ({
  accentColor,
  accentColorClassName,
  canUseSubmissionTime,
  maxDate,
  onChange,
  onClose,
  open,
  resetToNow,
  value,
}: {
  accentColor?: string;
  accentColorClassName?: string;
  canUseSubmissionTime: boolean;
  maxDate?: Date | string | number;
  onChange: (date?: string) => void;
  onClose: () => void;
  open: boolean;
  resetToNow: boolean;
  value?: string;
}) => {
  const [draftDate, setDraftDate] = React.useState(() => new Date());
  const [dateText, setDateText] = React.useState('');
  const [timeText, setTimeText] = React.useState('');
  const [usesSubmissionTime, setUsesSubmissionTime] = React.useState(false);
  const [hasResetToNow, setHasResetToNow] = React.useState(false);
  const [initialDate, setInitialDate] = React.useState(() => new Date());

  const [initialUsesSubmissionTime, setInitialUsesSubmissionTime] =
    React.useState(false);

  const maxRecordDate = React.useMemo(() => {
    if (!maxDate) return undefined;
    const date = maxDate instanceof Date ? maxDate : new Date(maxDate);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [maxDate]);

  const isAfterMaxDate = React.useCallback(
    (date: Date) =>
      maxRecordDate ? date.getTime() > maxRecordDate.getTime() : false,
    [maxRecordDate]
  );

  const resetFields = React.useCallback((date: Date) => {
    const next = recordTimeInputValues(date);
    setDateText(next.dateText);
    setTimeText(next.timeText);
  }, []);

  const setDraftRecordDate = React.useCallback(
    (date: Date, options?: { submissionTime?: boolean }) => {
      setDraftDate(date);
      setUsesSubmissionTime(!!options?.submissionTime);
      resetFields(date);
    },
    [resetFields]
  );

  React.useEffect(() => {
    if (!open) return;
    const date = value ? new Date(value) : new Date();
    const nextDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const nextUsesSubmissionTime = canUseSubmissionTime && !value;
    setInitialDate(nextDate);
    setInitialUsesSubmissionTime(nextUsesSubmissionTime);
    setHasResetToNow(false);
    setDraftRecordDate(nextDate, { submissionTime: nextUsesSubmissionTime });
  }, [canUseSubmissionTime, open, setDraftRecordDate, value]);

  const handleResetToNow = React.useCallback(() => {
    setDraftRecordDate(new Date(), { submissionTime: canUseSubmissionTime });
    setHasResetToNow(true);
  }, [canUseSubmissionTime, setDraftRecordDate]);

  const handleResetRecordTime = React.useCallback(() => {
    setDraftRecordDate(initialDate, {
      submissionTime: initialUsesSubmissionTime,
    });
  }, [initialDate, initialUsesSubmissionTime, setDraftRecordDate]);

  const getDraftRecordDate = React.useCallback(() => {
    if (usesSubmissionTime) return new Date();
    if (Platform.OS !== 'web') return draftDate;
    return recordTime.parseRecordDateTimeInput({ dateText, timeText });
  }, [dateText, draftDate, timeText, usesSubmissionTime]);

  const canSetDraftRecordDate = React.useCallback(
    (date: Date) => !Number.isNaN(date.getTime()) && !isAfterMaxDate(date),
    [isAfterMaxDate]
  );

  const handleSetDraftRecordDate = React.useCallback(
    (date: Date) => {
      if (!canSetDraftRecordDate(date)) return;
      setHasResetToNow(false);
      setDraftRecordDate(date);
    },
    [canSetDraftRecordDate, setDraftRecordDate]
  );

  const getOffsetDate = React.useCallback(
    (offsetMs: number) => {
      const date = getDraftRecordDate();
      return date ? new Date(date.getTime() + offsetMs) : undefined;
    },
    [getDraftRecordDate]
  );

  const canApplyOffset = React.useCallback(
    (offsetMs: number) => {
      const date = getOffsetDate(offsetMs);
      return !!date && canSetDraftRecordDate(date);
    },
    [canSetDraftRecordDate, getOffsetDate]
  );

  const handleApplyOffset = React.useCallback(
    (offsetMs: number) => {
      const date = getOffsetDate(offsetMs);
      if (!date) return;
      handleSetDraftRecordDate(date);
    },
    [getOffsetDate, handleSetDraftRecordDate]
  );

  const handlePickerChange = React.useCallback(
    (_event: unknown, date: Date) => {
      if (isAfterMaxDate(date)) return;
      setHasResetToNow(false);
      setDraftRecordDate(date);
    },
    [isAfterMaxDate, setDraftRecordDate]
  );

  const handleDateTextChange = React.useCallback(
    (text: string) => {
      const date = recordTime.parseRecordDateTimeInput({
        dateText: text,
        timeText,
      });

      if (date && !canSetDraftRecordDate(date)) return;
      setHasResetToNow(false);
      setUsesSubmissionTime(false);
      setDateText(text);
    },
    [canSetDraftRecordDate, timeText]
  );

  const handleTimeTextChange = React.useCallback(
    (text: string) => {
      const date = recordTime.parseRecordDateTimeInput({
        dateText,
        timeText: text,
      });

      if (date && !canSetDraftRecordDate(date)) return;
      setHasResetToNow(false);
      setUsesSubmissionTime(false);
      setTimeText(text);
    },
    [canSetDraftRecordDate, dateText]
  );

  const handleSave = React.useCallback(() => {
    if (usesSubmissionTime) {
      onChange(undefined);
      onClose();
      return;
    }

    if (Platform.OS !== 'web') {
      if (isAfterMaxDate(draftDate)) {
        onClose();
        return;
      }

      onChange(draftDate.toISOString());
      onClose();
      return;
    }

    const date = recordTime.parseRecordDateTimeInput({ dateText, timeText });
    if (!date) return;

    if (isAfterMaxDate(date)) {
      onClose();
      return;
    }

    onChange(date.toISOString());
    onClose();
  }, [
    dateText,
    draftDate,
    isAfterMaxDate,
    onChange,
    onClose,
    timeText,
    usesSubmissionTime,
  ]);

  const hasTimeChanges = React.useMemo(() => {
    if (usesSubmissionTime !== initialUsesSubmissionTime) return true;
    if (usesSubmissionTime) return false;

    if (Platform.OS === 'web') {
      const initialValue = recordTimeInputValues(initialDate);

      return (
        dateText !== initialValue.dateText || timeText !== initialValue.timeText
      );
    }

    return recordTimeInputKey(draftDate) !== recordTimeInputKey(initialDate);
  }, [
    dateText,
    draftDate,
    initialDate,
    initialUsesSubmissionTime,
    timeText,
    usesSubmissionTime,
  ]);

  const handleSubmit = React.useCallback(() => {
    if (!hasTimeChanges) {
      onClose();
      return;
    }

    handleSave();
  }, [handleSave, hasTimeChanges, onClose]);

  const showResetAction =
    (resetToNow && !hasResetToNow && !initialUsesSubmissionTime) ||
    (hasTimeChanges && !hasResetToNow);

  const handleResetAction = resetToNow
    ? handleResetToNow
    : handleResetRecordTime;

  const resetActionLabel = resetToNow ? 'Clear' : 'Revert';

  const resetActionAccessibilityLabel = resetToNow
    ? 'Clear record time'
    : 'Revert record time';

  const maxDateText = maxRecordDate
    ? recordTime.toRecordDateInputValue(maxRecordDate)
    : undefined;

  const maxTimeText =
    maxRecordDate && dateText === maxDateText
      ? recordTime.toRecordTimeInputValue(maxRecordDate)
      : undefined;

  const canSubtractDay = canApplyOffset(-DAY_MS);
  const canSubtractHour = canApplyOffset(-HOUR_MS);
  const canAddHour = canApplyOffset(HOUR_MS);
  const canAddDay = canApplyOffset(DAY_MS);

  const isShowingImplicitRecordTime =
    usesSubmissionTime || (resetToNow && hasResetToNow);

  return (
    <Sheet
      className="md:max-w-sm"
      onDismiss={onClose}
      open={open}
      portalName="record-time"
    >
      <View className="mx-auto max-h-full max-w-md min-h-0 w-full">
        <View className="max-h-full min-h-0 p-4 pb-4 gap-3 md:p-4">
          <View className="min-h-0 shrink">
            {Platform.OS === 'web' ? (
              <inputGroup.InputGroup className="h-10 w-full">
                <WebDateTimeInput
                  accessibilityLabel="Record date"
                  max={maxDateText}
                  onChange={handleDateTextChange}
                  type="date"
                  value={dateText}
                  wrapperClassName="basis-0 flex-1 min-w-0"
                  textClassName={
                    isShowingImplicitRecordTime ? 'text-placeholder' : undefined
                  }
                />
                <WebDateTimeInput
                  accessibilityLabel="Record time"
                  max={maxTimeText}
                  onChange={handleTimeTextChange}
                  type="time"
                  value={timeText}
                  wrapperClassName="basis-0 flex-1 max-w-32 min-w-0 border-l border-border-secondary"
                  textClassName={
                    isShowingImplicitRecordTime ? 'text-placeholder' : undefined
                  }
                />
                {showResetAction && (
                  <inputGroup.InputGroupButton
                    accessibilityLabel={resetActionAccessibilityLabel}
                    className="h-10 px-3"
                    onPress={handleResetAction}
                    size="sm"
                    variant="ghost"
                  >
                    <Text>{resetActionLabel}</Text>
                  </inputGroup.InputGroupButton>
                )}
              </inputGroup.InputGroup>
            ) : (
              <View className="gap-2">
                <DateTimePicker
                  accentColor={accentColor}
                  display={Platform.OS === 'ios' ? 'compact' : 'spinner'}
                  maximumDate={maxRecordDate}
                  mode="datetime"
                  onValueChange={handlePickerChange}
                  presentation="inline"
                  value={draftDate}
                />
                {showResetAction && (
                  <View className="items-end">
                    <Button
                      accessibilityLabel={resetActionAccessibilityLabel}
                      onPress={handleResetAction}
                      size="xs"
                      variant="secondary"
                    >
                      <Text>{resetActionLabel}</Text>
                    </Button>
                  </View>
                )}
              </View>
            )}
          </View>
          <View className="flex-row px-4 gap-3 items-center shrink-0">
            <View className="flex-1 flex-row min-w-0 gap-1.5 items-center">
              <buttonGroup.ButtonGroup className="shrink-0">
                <buttonGroup.ButtonGroupButton
                  className="w-12 px-1"
                  disabled={!canSubtractDay}
                  onPress={() => handleApplyOffset(-DAY_MS)}
                  size="xs"
                >
                  <Text>-24h</Text>
                </buttonGroup.ButtonGroupButton>
                <buttonGroup.ButtonGroupButton
                  className="w-12 px-1"
                  disabled={!canSubtractHour}
                  onPress={() => handleApplyOffset(-HOUR_MS)}
                  showSeparator
                  size="xs"
                >
                  <Text>-1h</Text>
                </buttonGroup.ButtonGroupButton>
                <buttonGroup.ButtonGroupButton
                  className="w-12 px-1"
                  disabled={!canAddHour}
                  onPress={() => handleApplyOffset(HOUR_MS)}
                  showSeparator
                  size="xs"
                >
                  <Text>+1h</Text>
                </buttonGroup.ButtonGroupButton>
                <buttonGroup.ButtonGroupButton
                  className="w-12 px-1"
                  disabled={!canAddDay}
                  onPress={() => handleApplyOffset(DAY_MS)}
                  showSeparator
                  size="xs"
                >
                  <Text>+24h</Text>
                </buttonGroup.ButtonGroupButton>
              </buttonGroup.ButtonGroup>
            </View>
            <View className="flex-row gap-2 items-center shrink-0">
              <Button
                onPress={handleSubmit}
                size="xs"
                variant="secondary"
                className={cn(
                  hasTimeChanges && accentColorClassName,
                  hasTimeChanges && 'border-transparent'
                )}
              >
                <Text className={cn(hasTimeChanges && 'text-white')}>
                  {hasTimeChanges ? 'Update' : 'Done'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Sheet>
  );
};
