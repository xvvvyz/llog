import * as recordTime from '@/features/records/lib/record-time';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
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

const WebDateTimeInput = ({
  accessibilityLabel,
  onChange,
  type,
  value,
  wrapperClassName,
}: {
  accessibilityLabel: string;
  onChange: (value: string) => void;
  type: 'date' | 'time';
  value: string;
  wrapperClassName?: string;
}) => (
  <View className={wrapperClassName}>
    {React.createElement('input', {
      'aria-label': accessibilityLabel,
      className:
        'box-border h-10 min-w-0 w-full appearance-none rounded-xl border border-border-secondary border-continuous bg-input px-3 text-base text-foreground web:focus-visible:outline-hidden',
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
      weight="fill"
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
  onChange,
  onClose,
  open,
  value,
}: {
  accentColor?: string;
  accentColorClassName?: string;
  canUseSubmissionTime: boolean;
  onChange: (date?: string) => void;
  onClose: () => void;
  open: boolean;
  value?: string;
}) => {
  const [draftDate, setDraftDate] = React.useState(() => new Date());
  const [dateText, setDateText] = React.useState('');
  const [timeText, setTimeText] = React.useState('');
  const [usesSubmissionTime, setUsesSubmissionTime] = React.useState(false);
  const [initialDate, setInitialDate] = React.useState(() => new Date());

  const [initialUsesSubmissionTime, setInitialUsesSubmissionTime] =
    React.useState(false);

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
    setDraftRecordDate(nextDate, { submissionTime: nextUsesSubmissionTime });
  }, [canUseSubmissionTime, open, setDraftRecordDate, value]);

  const handleUseSubmissionTime = React.useCallback(() => {
    onChange(undefined);
    onClose();
  }, [onChange, onClose]);

  const handleApplyOffset = React.useCallback(
    (offsetMs: number) => {
      onChange(new Date(Date.now() - offsetMs).toISOString());
      onClose();
    },
    [onChange, onClose]
  );

  const handlePickerChange = React.useCallback(
    (_event: unknown, date: Date) => {
      setDraftRecordDate(date);
    },
    [setDraftRecordDate]
  );

  const handleSave = React.useCallback(() => {
    if (usesSubmissionTime) {
      onChange(undefined);
      onClose();
      return;
    }

    if (Platform.OS !== 'web') {
      onChange(draftDate.toISOString());
      onClose();
      return;
    }

    const date = recordTime.parseRecordDateTimeInput({ dateText, timeText });
    if (!date) return;
    onChange(date.toISOString());
    onClose();
  }, [dateText, draftDate, onChange, onClose, timeText, usesSubmissionTime]);

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

  const showSubmissionTimeAction = canUseSubmissionTime && !usesSubmissionTime;

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
              <View className="flex-row overflow-hidden min-w-0 w-full gap-2">
                <WebDateTimeInput
                  accessibilityLabel="Record date"
                  type="date"
                  value={dateText}
                  wrapperClassName="basis-0 flex-1 min-w-0 shrink"
                  onChange={(text) => {
                    setUsesSubmissionTime(false);
                    setDateText(text);
                  }}
                />
                <WebDateTimeInput
                  accessibilityLabel="Record time"
                  type="time"
                  value={timeText}
                  wrapperClassName="basis-0 flex-1 max-w-32 min-w-0 shrink"
                  onChange={(text) => {
                    setUsesSubmissionTime(false);
                    setTimeText(text);
                  }}
                />
              </View>
            ) : (
              <DateTimePicker
                accentColor={accentColor}
                display={Platform.OS === 'ios' ? 'compact' : 'spinner'}
                mode="datetime"
                onValueChange={handlePickerChange}
                presentation="inline"
                value={draftDate}
              />
            )}
          </View>
          <View className="flex-row px-4 gap-3 items-center shrink-0">
            <View className="flex-1 flex-row flex-wrap gap-2 items-center">
              {showSubmissionTimeAction ? (
                <Button
                  onPress={handleUseSubmissionTime}
                  size="xs"
                  variant="secondary"
                >
                  <Text>Use time of submission</Text>
                </Button>
              ) : (
                <>
                  <Button
                    onPress={() => handleApplyOffset(24 * 60 * 60 * 1000)}
                    size="xs"
                    variant="secondary"
                  >
                    <Text>24h ago</Text>
                  </Button>
                  <Button
                    onPress={() => handleApplyOffset(60 * 60 * 1000)}
                    size="xs"
                    variant="secondary"
                  >
                    <Text>1h ago</Text>
                  </Button>
                  <Button
                    onPress={() => handleApplyOffset(15 * 60 * 1000)}
                    size="xs"
                    variant="secondary"
                  >
                    <Text>15m ago</Text>
                  </Button>
                </>
              )}
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
                  {hasTimeChanges ? 'Save' : 'Done'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Sheet>
  );
};
