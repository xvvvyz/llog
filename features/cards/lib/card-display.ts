import * as cardChart from '@/domain/cards/chart';
import type { CardOutput } from '@/domain/cards/output';
import * as time from '@/lib/time';

type Metric = CardOutput['metrics'][number];
const EMPTY_CARD_SUMMARY = 'No matching records yet';

export const formatCardText = (value: string) =>
  time.formatIsoDateTimeInText(value);

export const hasDisplayableCardOutput = (output?: CardOutput | null) => {
  if (!output) return false;
  const summary = output.summary?.trim();

  return (
    cardChart.isRenderableChart(output.chart) ||
    output.metrics.length > 0 ||
    output.milestones.length > 0 ||
    (!!summary && summary !== EMPTY_CARD_SUMMARY)
  );
};

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
