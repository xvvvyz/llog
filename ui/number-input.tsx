import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { CaretDown, CaretUp } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, type GestureResponderEvent, View } from 'react-native';

type NumberInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  'keyboardType' | 'onChangeText'
> & {
  decrementAccessibilityLabel?: string;
  incrementAccessibilityLabel?: string;
  max?: number;
  min?: number;
  onChangeText?: (value: string) => void;
  step?: number;
  wrapperClassName?: string;
};

const STEP_REPEAT_DELAY_MS = 450;
const STEP_REPEAT_INITIAL_INTERVAL_MS = 220;
const STEP_REPEAT_MIN_INTERVAL_MS = 60;
const STEP_REPEAT_ACCELERATION = 0.9;

const webStepButtonStyle =
  Platform.OS === 'web'
    ? ({
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        userSelect: 'none',
      } as unknown as React.ComponentPropsWithoutRef<typeof Button>['style'])
    : undefined;

export const NumberInput = React.forwardRef<
  React.ComponentRef<typeof Input>,
  NumberInputProps
>(
  (
    {
      className,
      decrementAccessibilityLabel = 'Decrease value',
      defaultValue,
      editable,
      incrementAccessibilityLabel = 'Increase value',
      max,
      min,
      onChangeText,
      size,
      step = 1,
      value,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(
      value ?? defaultValue ?? ''
    );

    const localValueRef = React.useRef(value ?? defaultValue ?? '');

    const repeatDelayRef = React.useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    const repeatStepTimeoutRef = React.useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

    const ignoreNextPressTimeoutRef = React.useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

    const webStepRepeatEndCleanupRef = React.useRef<(() => void) | null>(null);
    const activeRepeatDirectionRef = React.useRef<1 | -1 | null>(null);
    const ignoreNextPressRef = React.useRef(false);

    const clearWebStepRepeatEndListeners = React.useCallback(() => {
      webStepRepeatEndCleanupRef.current?.();
      webStepRepeatEndCleanupRef.current = null;
    }, []);

    const clearStepRepeat = React.useCallback(() => {
      activeRepeatDirectionRef.current = null;
      clearWebStepRepeatEndListeners();

      if (repeatDelayRef.current) {
        clearTimeout(repeatDelayRef.current);
        repeatDelayRef.current = null;
      }

      if (repeatStepTimeoutRef.current) {
        clearTimeout(repeatStepTimeoutRef.current);
        repeatStepTimeoutRef.current = null;
      }
    }, [clearWebStepRepeatEndListeners]);

    const clearIgnoredPress = React.useCallback(() => {
      ignoreNextPressRef.current = false;

      if (ignoreNextPressTimeoutRef.current) {
        clearTimeout(ignoreNextPressTimeoutRef.current);
        ignoreNextPressTimeoutRef.current = null;
      }
    }, []);

    const ignoreNextPress = React.useCallback(() => {
      clearIgnoredPress();
      ignoreNextPressRef.current = true;

      ignoreNextPressTimeoutRef.current = setTimeout(() => {
        ignoreNextPressRef.current = false;
        ignoreNextPressTimeoutRef.current = null;
      }, 1000);
    }, [clearIgnoredPress]);

    const cancelStepRepeat = React.useCallback(() => {
      clearStepRepeat();
      clearIgnoredPress();
    }, [clearIgnoredPress, clearStepRepeat]);

    const startWebStepRepeatEndListeners = React.useCallback(() => {
      if (Platform.OS !== 'web') return;
      if (typeof window === 'undefined') return;
      clearWebStepRepeatEndListeners();
      const handleEnd = () => clearStepRepeat();
      window.addEventListener('pointerup', handleEnd, true);
      window.addEventListener('pointercancel', handleEnd, true);
      window.addEventListener('mouseup', handleEnd, true);
      window.addEventListener('touchend', handleEnd, true);
      window.addEventListener('touchcancel', handleEnd, true);
      window.addEventListener('blur', handleEnd, true);

      webStepRepeatEndCleanupRef.current = () => {
        window.removeEventListener('pointerup', handleEnd, true);
        window.removeEventListener('pointercancel', handleEnd, true);
        window.removeEventListener('mouseup', handleEnd, true);
        window.removeEventListener('touchend', handleEnd, true);
        window.removeEventListener('touchcancel', handleEnd, true);
        window.removeEventListener('blur', handleEnd, true);
      };
    }, [clearStepRepeat, clearWebStepRepeatEndListeners]);

    React.useEffect(() => cancelStepRepeat, [cancelStepRepeat]);

    React.useEffect(() => {
      if (value === undefined) return;
      localValueRef.current = value;
      setLocalValue(value);
    }, [value]);

    const normalizedStep =
      Number.isFinite(step) && step > 0 ? Math.abs(step) : 1;

    const handleChangeText = React.useCallback(
      (nextValue: string) => {
        localValueRef.current = nextValue;
        setLocalValue(nextValue);
        onChangeText?.(nextValue);
      },
      [onChangeText]
    );

    const applyStep = React.useCallback(
      (direction: 1 | -1) => {
        if (
          !canStepNumberInputValue({
            direction,
            max,
            min,
            step: normalizedStep,
            value: localValueRef.current,
          })
        ) {
          return false;
        }

        const nextValue = getSteppedNumberInputValue({
          direction,
          max,
          min,
          step: normalizedStep,
          value: localValueRef.current,
        });

        localValueRef.current = nextValue;
        setLocalValue(nextValue);
        onChangeText?.(nextValue);
        return true;
      },
      [max, min, normalizedStep, onChangeText]
    );

    const handleStep = React.useCallback(
      (direction: 1 | -1) => {
        if (ignoreNextPressRef.current) {
          clearIgnoredPress();
          return;
        }

        applyStep(direction);
      },
      [applyStep, clearIgnoredPress]
    );

    const startStepRepeat = React.useCallback(
      (direction: 1 | -1) => {
        if (activeRepeatDirectionRef.current === direction) return;
        clearStepRepeat();
        activeRepeatDirectionRef.current = direction;
        ignoreNextPress();
        startWebStepRepeatEndListeners();

        if (!applyStep(direction)) {
          activeRepeatDirectionRef.current = null;
          return;
        }

        const scheduleNextStep = (interval: number) => {
          repeatStepTimeoutRef.current = setTimeout(() => {
            repeatStepTimeoutRef.current = null;

            if (!applyStep(direction)) {
              clearStepRepeat();
              return;
            }

            scheduleNextStep(
              Math.max(
                STEP_REPEAT_MIN_INTERVAL_MS,
                interval * STEP_REPEAT_ACCELERATION
              )
            );
          }, interval);
        };

        repeatDelayRef.current = setTimeout(() => {
          repeatDelayRef.current = null;

          if (!applyStep(direction)) {
            clearStepRepeat();
            return;
          }

          scheduleNextStep(STEP_REPEAT_INITIAL_INTERVAL_MS);
        }, STEP_REPEAT_DELAY_MS);
      },
      [
        applyStep,
        clearStepRepeat,
        ignoreNextPress,
        startWebStepRepeatEndListeners,
      ]
    );

    const preventStepTouchDefault = React.useCallback(
      (event: GestureResponderEvent) => {
        event.preventDefault?.();

        const nativeEvent = event.nativeEvent as {
          preventDefault?: () => void;
        };

        nativeEvent.preventDefault?.();
      },
      []
    );

    const canDecrement =
      editable !== false &&
      canStepNumberInputValue({
        direction: -1,
        max,
        min,
        step: normalizedStep,
        value: localValue,
      });

    const canIncrement =
      editable !== false &&
      canStepNumberInputValue({
        direction: 1,
        max,
        min,
        step: normalizedStep,
        value: localValue,
      });

    const resolvedSize = size ?? 'sm';

    return (
      <View className={cn('relative', wrapperClassName)}>
        <Input
          ref={ref}
          className={cn('pr-20', className)}
          defaultValue={defaultValue}
          editable={editable}
          keyboardType="decimal-pad"
          onChangeText={handleChangeText}
          size={resolvedSize}
          value={localValue}
          {...props}
        />
        <View className="absolute right-1 top-1 flex-row select-none">
          <Button
            accessibilityLabel={incrementAccessibilityLabel}
            disabled={!canIncrement}
            onPress={() => handleStep(1)}
            onPressIn={() => startStepRepeat(1)}
            onPressOut={clearStepRepeat}
            onTouchCancel={cancelStepRepeat}
            size="icon"
            style={webStepButtonStyle}
            variant="ghost"
            wrapperClassName="rounded-lg border-continuous select-none"
            className={
              resolvedSize === 'lg'
                ? 'h-10 w-10 rounded-lg select-none'
                : resolvedSize === 'default'
                  ? 'h-9 w-9 rounded-lg select-none'
                  : 'h-8 w-8 rounded-lg select-none'
            }
            onTouchStart={(event) => {
              preventStepTouchDefault(event);
              startStepRepeat(1);
            }}
          >
            <Icon icon={CaretUp} size={16} />
          </Button>
          <Button
            accessibilityLabel={decrementAccessibilityLabel}
            disabled={!canDecrement}
            onPress={() => handleStep(-1)}
            onPressIn={() => startStepRepeat(-1)}
            onPressOut={clearStepRepeat}
            onTouchCancel={cancelStepRepeat}
            size="icon"
            style={webStepButtonStyle}
            variant="ghost"
            wrapperClassName="rounded-lg border-continuous select-none"
            className={
              resolvedSize === 'lg'
                ? 'h-10 w-10 rounded-lg select-none'
                : resolvedSize === 'default'
                  ? 'h-9 w-9 rounded-lg select-none'
                  : 'h-8 w-8 rounded-lg select-none'
            }
            onTouchStart={(event) => {
              preventStepTouchDefault(event);
              startStepRepeat(-1);
            }}
          >
            <Icon icon={CaretDown} size={16} />
          </Button>
        </View>
      </View>
    );
  }
);

NumberInput.displayName = 'NumberInput';

const canStepNumberInputValue = ({
  direction,
  max,
  min,
  step,
  value,
}: {
  direction: 1 | -1;
  max?: number;
  min?: number;
  step: number;
  value: string;
}) => {
  const currentValue = parseNumberInputValue(value);
  if (currentValue === undefined) return true;
  const nextValue = currentValue + direction * step;
  if (min !== undefined && nextValue < min) return false;
  if (max !== undefined && nextValue > max) return false;
  return true;
};

const getSteppedNumberInputValue = ({
  direction,
  max,
  min,
  step,
  value,
}: {
  direction: 1 | -1;
  max?: number;
  min?: number;
  step: number;
  value: string;
}) => {
  const currentValue = parseNumberInputValue(value) ?? 0;

  const nextValue = clampNumberInputValue(currentValue + direction * step, {
    max,
    min,
  });

  return formatNumberInputValue(nextValue, value, step);
};

const parseNumberInputValue = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;
  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const clampNumberInputValue = (
  value: number,
  { max, min }: { max?: number; min?: number }
) => {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};

const formatNumberInputValue = (
  value: number,
  currentValue: string,
  step: number
) => {
  const precision = Math.min(
    10,
    Math.max(getNumberPrecision(currentValue), getNumberPrecision(`${step}`))
  );

  return `${Number(value.toFixed(precision))}`;
};

const getNumberPrecision = (value: string) => {
  const decimal = value.trim().split('.')[1];
  return decimal?.length ?? 0;
};
