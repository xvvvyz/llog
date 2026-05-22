import type { CardOutput } from '@/domain/cards/output';
import * as time from '@/lib/time';

type Metric = CardOutput['metrics'][number];

export const formatCardText = (value: string) =>
  time.formatIsoDateTimeInText(value);

export const formatMetricValue = ({
  unit,
  value,
  valueFormat,
}: Pick<Metric, 'unit' | 'value' | 'valueFormat'>) => {
  if (typeof value === 'number') return `${value}${unit ? ` ${unit}` : ''}`;

  if (valueFormat) {
    return (
      time.formatIsoDateTimeValue(value, valueFormat) ??
      time.formatIsoDateTimeInText(value, valueFormat)
    );
  }

  return time.formatIsoDateTimeInText(value);
};
