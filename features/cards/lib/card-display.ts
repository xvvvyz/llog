import * as cardChart from '@/domain/cards/chart';
import * as cardOutput from '@/domain/cards/output';
import type { CardOutput } from '@/domain/cards/output';
import * as time from '@/lib/time';

import {
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';

type Metric = CardOutput['metrics'][number];
const EMPTY_CARD_SUMMARY = 'No matching records yet';

export const formatCardText = (value: string) =>
  time.formatIsoDateTimeInText(value);

export const formatCardSummaryText = (value: string) =>
  time.formatIsoDateTimeInTextByDay(value);

export const formatCardDisplayLabel = (value: string) =>
  cardOutput.normalizeCardDisplayLabel({
    maxLength: cardOutput.MAX_CARD_METRIC_LABEL_LENGTH,
    value,
  }) ?? time.formatIsoDateTimeInText(value);

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

const durationUnit = (unit?: string) => {
  const normalized = unit?.trim().toLowerCase();

  if (
    normalized === 'week' ||
    normalized === 'weeks' ||
    normalized === 'wk' ||
    normalized === 'wks'
  ) {
    return 'weeks';
  }

  if (
    normalized === 'month' ||
    normalized === 'months' ||
    normalized === 'mo' ||
    normalized === 'mos'
  ) {
    return 'months';
  }

  if (
    normalized === 'year' ||
    normalized === 'years' ||
    normalized === 'yr' ||
    normalized === 'yrs'
  ) {
    return 'years';
  }

  return 'days';
};

const formatDurationSince = ({
  date,
  now,
  unit,
}: {
  date: Date;
  now: Date;
  unit?: string;
}) => {
  const normalizedUnit = durationUnit(unit);
  const days = Math.max(0, differenceInCalendarDays(now, date));

  const value =
    normalizedUnit === 'years'
      ? Math.max(0, differenceInYears(now, date))
      : normalizedUnit === 'months'
        ? Math.max(0, differenceInMonths(now, date))
        : normalizedUnit === 'weeks'
          ? Math.floor(days / 7)
          : days;

  const displayUnit =
    value === 1 ? normalizedUnit.slice(0, -1) : normalizedUnit;

  return `${value} ${displayUnit}`;
};

export const formatMetricValue = (
  { unit, value, valueFormat }: Pick<Metric, 'unit' | 'value' | 'valueFormat'>,
  now = new Date()
) => {
  if (typeof value === 'number') return `${value}${unit ? ` ${unit}` : ''}`;

  if (valueFormat === 'durationSince') {
    const date = time.parseIsoDateTime(value);
    if (!date) return time.formatIsoDateTimeInText(value);
    return formatDurationSince({ date, now, unit });
  }

  if (valueFormat) {
    return (
      time.formatIsoDateTimeValue(value, valueFormat) ??
      time.formatIsoDateTimeInText(value, valueFormat)
    );
  }

  return time.formatIsoDateTimeInText(value);
};
