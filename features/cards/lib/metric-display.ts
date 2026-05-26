import * as cardOutput from '@/domain/cards/output';
import type { CardOutput } from '@/domain/cards/output';
import * as displayText from '@/features/cards/lib/display-text';
import * as time from '@/lib/time';

import {
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';

type Metric = CardOutput['metrics'][number];

type MetricValueInput = Pick<Metric, 'unit' | 'value' | 'valueFormat'> &
  Partial<Pick<Metric, 'label'>>;

type MetricScale = { max: string; min: string };
const GENERIC_SCALE_UNITS = new Set(['level', 'rating', 'score']);

const UNIT_TOKEN_ALIASES = new Map([
  ['hour', 'hr'],
  ['hrs', 'hr'],
  ['minute', 'min'],
  ['mins', 'min'],
  ['month', 'mo'],
  ['mos', 'mo'],
  ['pct', 'percent'],
  ['percentage', 'percent'],
  ['second', 'sec'],
  ['secs', 'sec'],
  ['week', 'wk'],
  ['wks', 'wk'],
  ['year', 'yr'],
  ['yrs', 'yr'],
]);

const normalizeUnitToken = (token: string) => {
  const normalized =
    token.length > 3 && token.endsWith('s') && !token.endsWith('ss')
      ? token.slice(0, -1)
      : token;

  return UNIT_TOKEN_ALIASES.get(normalized) ?? normalized;
};

const unitTokens = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .replace(/%/g, ' percent ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeUnitToken);

const scaleRangePattern = String.raw`(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)`;
const unitScalePattern = new RegExp(`^${scaleRangePattern}$`, 'i');
const trailingScalePattern = new RegExp(`(?:^|\\s)${scaleRangePattern}$`, 'i');

const formatBaseLabel = (value: string) =>
  displayText.formatComparisonOperators(
    cardOutput.normalizeCardDisplayLabel({
      maxLength: cardOutput.MAX_CARD_METRIC_LABEL_LENGTH,
      value,
    }) ?? time.formatIsoDateTimeInText(value)
  );

const readScale = (value?: string): MetricScale | undefined => {
  const text = value
    ?.replace(/[()[\]{}"'“”‘’`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const match = text?.match(unitScalePattern);
  return match ? { max: match[2], min: match[1] } : undefined;
};

const splitTrailingScale = (label: string) => {
  const match = label.match(trailingScalePattern);
  if (!match) return { label };

  return {
    label: label.slice(0, match.index).trim() || 'Value',
    scale: { max: match[2], min: match[1] },
  };
};

const isGenericScaleUnit = (unit?: string) => {
  const tokens = unitTokens(unit);

  return (
    tokens.length > 0 && tokens.every((token) => GENERIC_SCALE_UNITS.has(token))
  );
};

const metricScale = (
  { label, unit, value, valueFormat }: MetricValueInput,
  displayLabel = label ? formatBaseLabel(label) : undefined
): MetricScale | undefined => {
  if (typeof value !== 'number' || valueFormat) return undefined;
  const unitScale = readScale(unit);
  if (unitScale) return unitScale;
  if (!isGenericScaleUnit(unit) || !displayLabel) return undefined;
  return splitTrailingScale(displayLabel).scale;
};

const isPercentUnit = (unit?: string) => {
  const tokens = unitTokens(unit);
  return tokens.length === 1 && tokens[0] === 'percent';
};

const metricUnitValueText = (unit?: string) =>
  isPercentUnit(unit) ? '%' : (unit?.trim() ?? '');

const stripTrailingTokens = ({
  label,
  tokens,
}: {
  label: string;
  tokens: string[];
}) => {
  if (!tokens.length) return label;
  const words = label.split(' ').filter(Boolean);
  let tokenIndex = tokens.length - 1;
  let removeWordCount = 0;

  for (
    let index = words.length - 1;
    index >= 0 && tokenIndex >= 0;
    index -= 1
  ) {
    const wordTokens = unitTokens(words[index]);
    if (!wordTokens.length) break;

    for (
      let wordTokenIndex = wordTokens.length - 1;
      wordTokenIndex >= 0;
      wordTokenIndex -= 1
    ) {
      if (wordTokens[wordTokenIndex] !== tokens[tokenIndex]) return label;
      tokenIndex -= 1;
    }

    removeWordCount += 1;
  }

  if (tokenIndex >= 0 || removeWordCount === 0) return label;
  return words.slice(0, -removeWordCount).join(' ') || 'Value';
};

export const formatMetricLabel = (
  metric: Pick<Metric, 'label' | 'unit' | 'value' | 'valueFormat'>
) => {
  let label = formatBaseLabel(metric.label);
  const scale = metricScale(metric, label);
  if (scale) label = splitTrailingScale(label).label;

  if (metric.valueFormat && metric.valueFormat !== 'durationSince') {
    return label;
  }

  return typeof metric.value === 'number' ||
    metric.valueFormat === 'durationSince'
    ? stripTrailingTokens({ label, tokens: unitTokens(metric.unit) })
    : label;
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

const formatScaleValue = (value: number, scale: MetricScale) =>
  `${value}/${scale.max}`;

const formatNumberValue = (metric: MetricValueInput) => {
  const { unit, value } = metric;
  if (typeof value !== 'number') return '';
  const scale = metricScale(metric);
  if (scale) return formatScaleValue(value, scale);
  if (!unit || isGenericScaleUnit(unit)) return String(value);
  const unitText = metricUnitValueText(unit);
  if (!unitText) return String(value);
  return isPercentUnit(unit) ? `${value}${unitText}` : `${value} ${unitText}`;
};

export const formatMetricValue = (
  metric: MetricValueInput,
  now = new Date()
) => {
  const { unit, value, valueFormat } = metric;
  if (typeof value === 'number') return formatNumberValue(metric);

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

export const formatMetricDisplay = (
  metric: Pick<Metric, 'label' | 'unit' | 'value' | 'valueFormat'>,
  now = new Date()
) => ({
  label: formatMetricLabel(metric),
  value: formatMetricValue(metric, now),
});
