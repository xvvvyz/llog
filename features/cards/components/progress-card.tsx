import * as cardChart from '@/domain/cards/chart';
import type { CardChart, CardOutput } from '@/domain/cards/output';
import type { LogCard } from '@/features/cards/types/card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/time';
import { resolveSpectrumColor, SPECTRUM, type Color } from '@/theme/spectrum';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import * as cardDisplay from '@/features/cards/lib/card-display';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import {
  MagnifyingGlass,
  Minus,
  TrendDown,
  TrendUp,
  type IconProps,
} from 'phosphor-react-native';

import {
  Platform,
  Pressable,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

const CHART_PADDING = { bottom: 24, left: 0, right: 0, top: 12 };
const COMPACT_CHART_PADDING = { bottom: 4, left: 0, right: 0, top: 4 };
const COMPACT_BAR_CHART_PADDING = { bottom: 24, left: 0, right: 0, top: 8 };
const HIDDEN_X_AXIS_BOTTOM_PADDING = 8;
const MAX_Y_AXIS_TICKS = 6;
const CHART_SCROLL_LOCK_DISTANCE = 8;
const AXIS_LABEL_FONT_SIZE = 10;
const COMPACT_AXIS_LABEL_FONT_SIZE = 9;
const AXIS_TICK_SIZE = 4;
const X_AXIS_TICK_LABEL_GAP = 5;
const Y_AXIS_TICK_LABEL_GAP = 8;
const LINE_DOMAIN_PADDING = 0.08;
const CHART_GRID_OPACITY = 0.35;
const COMPACT_CHART_GRID_OPACITY = 0.24;
const AXIS_LABEL_HORIZONTAL_PADDING = 8;
const MIN_AXIS_LABEL_MAX_LENGTH = 10;
const BAR_CORNER_RADIUS = 5;
const BAR_MAX_WIDTH = 44;
const BAR_IDLE_OPACITY = 0.9;
const BAR_DIMMED_OPACITY = 0.62;
const CHART_TOOLTIP_WIDTH = 128;
const CHART_TOOLTIP_HEIGHT = 46;
const CHART_TOOLTIP_HORIZONTAL_OVERFLOW = 16;

const CHART_SVG_STYLE = {
  overflow: 'visible',
  pointerEvents: 'none',
  userSelect: 'none',
} as const;

const chartChromeColors = {
  dark: { axis: '#3f3f46', text: '#a1a1aa' },
  light: { axis: '#d4d4d8', text: '#71717a' },
};

const DEFAULT_CHART_COLOR = 5 satisfies Color;
const SKIPPED_CHART_COLOR_INDEXES = new Set<Color>([10, 11]);
const SUMMARY_METRIC_LIMIT = 2;
const SUMMARY_METRICS_ONLY_LIMIT = 4;
const SUMMARY_MILESTONE_LIMIT = 3;
const SUMMARY_ROW_COUNT = 3;
const MILESTONE_DOT_SIZE = 8;
const MILESTONE_DOT_TOP = 4;
const MILESTONE_DOT_CENTER = MILESTONE_DOT_TOP + MILESTONE_DOT_SIZE / 2;
const MILESTONE_RAIL_LEFT = MILESTONE_DOT_SIZE / 2 - 0.5;
const MILESTONE_RAIL_OPACITY = 0.35;
const EMPTY_CARD_SUMMARY = 'No matching records yet';

type PreviewSection =
  | { key: string; rows: number; type: 'chart' }
  | { key: string; limit: number; rows: number; type: 'metrics' }
  | { key: string; lines: number; rows: number; type: 'summary' }
  | { key: string; limit: number; rows: number; type: 'milestones' }
  | { key: string; rows: number; type: 'spacer' };

type Milestone = CardOutput['milestones'][number];
type MilestoneAlignment = 'center' | 'end' | 'start';
type MetricTrend = NonNullable<CardOutput['metrics'][number]['trend']>;

type ChartLabelTag = Pick<
  NonNullable<LogCard['tags']>[number],
  'color' | 'name'
>;

const CardStatusPill = ({
  className,
  icon,
  isLoading,
  label,
}: {
  className?: string;
  icon?: React.ComponentType<IconProps>;
  isLoading?: boolean;
  label: string;
}) => (
  <View
    className={cn(
      'flex-row max-w-full min-w-0 px-1.5 py-0.5 border-continuous rounded-full bg-secondary gap-1.5 items-center self-start',
      className
    )}
  >
    <View className="size-3 items-center justify-center">
      {isLoading ? (
        <Spinner className="text-muted-foreground" size="xxs" />
      ) : icon ? (
        <Icon className="text-muted-foreground" icon={icon} size={12} />
      ) : null}
    </View>
    <Text
      className="font-normal text-muted-foreground text-xs shrink"
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const getCompactMilestoneAlignment = (
  index: number,
  count: number
): MilestoneAlignment => {
  if (count === 1) return 'center';
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'center';
};

const getAlignedOffset = ({
  alignment,
  contentHeight,
  rowHeight,
}: {
  alignment: MilestoneAlignment;
  contentHeight: number;
  rowHeight: number;
}) => {
  const availableHeight = Math.max(0, rowHeight - contentHeight);
  if (alignment === 'center') return availableHeight / 2;
  if (alignment === 'end') return availableHeight;
  return 0;
};

const getJustifyClass = (alignment: MilestoneAlignment) => {
  if (alignment === 'end') return 'justify-end';
  if (alignment === 'start') return 'justify-start';
  return 'justify-center';
};

const getChartColorIndexes = (logColorIndex?: Color, count = 4) => {
  const firstColor = resolveSpectrumColor(logColorIndex, DEFAULT_CHART_COLOR);
  const indexes: Color[] = [firstColor];
  let nextColor = (firstColor + 1) % SPECTRUM.light.length;

  while (indexes.length < count) {
    if (!SKIPPED_CHART_COLOR_INDEXES.has(nextColor as Color)) {
      indexes.push(nextColor as Color);
    }

    nextColor = (nextColor + 1) % SPECTRUM.light.length;
  }

  return indexes;
};

const getChartPalette = ({
  colorScheme,
  colorCount,
  logColorIndex,
}: {
  colorScheme: keyof typeof SPECTRUM;
  colorCount?: number;
  logColorIndex?: Color;
}) => {
  const indexes = getChartColorIndexes(logColorIndex, colorCount);
  const spectrum = SPECTRUM[colorScheme];

  return {
    ...chartChromeColors[colorScheme],
    fills: indexes.map((index) =>
      colorScheme === 'dark' ? spectrum[index].darker : spectrum[index].lighter
    ),
    series: indexes.map((index) => spectrum[index].default),
  };
};

type ChartPalette = ReturnType<typeof getChartPalette>;
type ChartHoverTarget = { index: number; label: string };

const trendIcons = {
  down: TrendDown,
  flat: Minus,
  up: TrendUp,
} satisfies Record<MetricTrend, React.ComponentType<IconProps>>;

const addPreviewSpacer = (
  sections: PreviewSection[],
  placement: 'end' | 'start' = 'end'
) => {
  const usedRows = sections.reduce((total, section) => total + section.rows, 0);
  const remainingRows = SUMMARY_ROW_COUNT - usedRows;
  if (remainingRows <= 0) return sections;

  const spacer: PreviewSection = {
    key: `spacer-${placement}`,
    rows: remainingRows,
    type: 'spacer',
  };

  return placement === 'start' ? [spacer, ...sections] : [...sections, spacer];
};

const getPreviewSectionAlignment = (
  sections: PreviewSection[],
  sectionIndex: number
): MilestoneAlignment => {
  const startRow = sections
    .slice(0, sectionIndex)
    .reduce((total, section) => total + section.rows, 0);

  const endRow = startRow + sections[sectionIndex].rows;
  if (endRow >= SUMMARY_ROW_COUNT) return 'end';
  if (startRow === 0) return 'start';
  return 'center';
};

const getPreviewSections = (output: CardOutput): PreviewSection[] => {
  const hasChart = cardChart.isRenderableChart(output.chart);
  const hasMetrics = output.metrics.length > 0;
  const hasMilestones = output.milestones.length > 0;

  const structuredSectionCount =
    Number(hasChart) + Number(hasMetrics) + Number(hasMilestones);

  const hasSummary = !!output.summary?.trim() && structuredSectionCount <= 1;

  if (hasChart) {
    const chartRows =
      hasMetrics || hasMilestones || hasSummary ? 2 : SUMMARY_ROW_COUNT;

    if (hasMetrics && chartRows < SUMMARY_ROW_COUNT) {
      return addPreviewSpacer([
        {
          key: 'metrics',
          limit: SUMMARY_METRIC_LIMIT,
          rows: 1,
          type: 'metrics',
        },
        { key: 'chart', rows: chartRows, type: 'chart' },
      ]);
    }

    const sections: PreviewSection[] = [
      { key: 'chart', rows: chartRows, type: 'chart' },
    ];

    if (chartRows < SUMMARY_ROW_COUNT) {
      if (hasSummary) {
        sections.push({ key: 'summary', lines: 2, rows: 1, type: 'summary' });
      } else if (hasMilestones) {
        sections.push({
          key: 'milestones',
          limit: 1,
          rows: 1,
          type: 'milestones',
        });
      }
    }

    return addPreviewSpacer(sections);
  }

  if (hasMetrics && hasMilestones) {
    return [
      { key: 'metrics', limit: SUMMARY_METRIC_LIMIT, rows: 1, type: 'metrics' },
      { key: 'milestones', limit: 2, rows: 2, type: 'milestones' },
    ];
  }

  if (hasMetrics) {
    if (hasSummary) {
      return [
        {
          key: 'metrics',
          limit: SUMMARY_METRICS_ONLY_LIMIT,
          rows: 2,
          type: 'metrics',
        },
        { key: 'summary', lines: 2, rows: 1, type: 'summary' },
      ];
    }

    return addPreviewSpacer(
      [
        {
          key: 'metrics',
          limit: SUMMARY_METRICS_ONLY_LIMIT,
          rows: 2,
          type: 'metrics',
        },
      ],
      'start'
    );
  }

  if (hasMilestones) {
    if (hasSummary) {
      return [
        { key: 'summary', lines: 2, rows: 1, type: 'summary' },
        { key: 'milestones', limit: 2, rows: 2, type: 'milestones' },
      ];
    }

    return [
      {
        key: 'milestones',
        limit: SUMMARY_MILESTONE_LIMIT,
        rows: SUMMARY_ROW_COUNT,
        type: 'milestones',
      },
    ];
  }

  if (hasSummary) {
    return [
      { key: 'summary', lines: 6, rows: SUMMARY_ROW_COUNT, type: 'summary' },
    ];
  }

  return [];
};

const getVisibleLabelIndexes = (count: number, maxLabels: number) => {
  if (count <= maxLabels) return new Set([...Array(count)].map((_, i) => i));
  const indexes = new Set<number>([0, count - 1]);
  const steps = maxLabels - 1;

  for (let i = 1; i < steps; i++) {
    indexes.add(Math.round((i * (count - 1)) / steps));
  }

  return indexes;
};

const estimateAxisLabelWidth = (
  label: string,
  fontSize = AXIS_LABEL_FONT_SIZE
) => label.length * fontSize * 0.58;

const getXAxisLabelSlotWidth = ({
  count,
  innerWidth,
  type,
}: {
  count: number;
  innerWidth: number;
  type: CardChart['type'];
}) => {
  if (count <= 1) return innerWidth;
  return type === 'bar' ? innerWidth / count : innerWidth / (count - 1);
};

const getXAxisLabelIndexes = ({
  innerWidth,
  labels,
  mode,
  type,
}: {
  innerWidth: number;
  labels: string[];
  mode?: NonNullable<CardChart['xAxis']>['labelMode'];
  type: CardChart['type'];
}) => {
  const count = labels.length;
  if (!count) return new Set<number>();
  if (count === 1) return new Set([0]);
  const slotWidth = getXAxisLabelSlotWidth({ count, innerWidth, type });
  const widestLabel = Math.max(...labels.map(estimateAxisLabelWidth));
  const canShowAll = widestLabel + 8 <= slotWidth;
  if (mode === 'all' && canShowAll) return getVisibleLabelIndexes(count, count);

  if (mode === 'sparse' || mode === 'all') {
    return getVisibleLabelIndexes(count, Math.min(4, count));
  }

  if (canShowAll) return getVisibleLabelIndexes(count, count);

  return getVisibleLabelIndexes(
    count,
    Math.max(2, Math.min(4, Math.floor(innerWidth / 72)))
  );
};

const getXAxisLabelMaxLength = ({
  fontSize,
  innerWidth,
  labels,
  type,
  visibleLabelIndexes,
}: {
  fontSize: number;
  innerWidth: number;
  labels: string[];
  type: CardChart['type'];
  visibleLabelIndexes: Set<number>;
}) => {
  const count = labels.length;
  if (!count) return MIN_AXIS_LABEL_MAX_LENGTH;
  const fullLabelLength = Math.max(0, ...labels.map((label) => label.length));

  if (fullLabelLength <= MIN_AXIS_LABEL_MAX_LENGTH) {
    return MIN_AXIS_LABEL_MAX_LENGTH;
  }

  const slotWidth = getXAxisLabelSlotWidth({ count, innerWidth, type });
  const visibleCount = visibleLabelIndexes.size || count;

  const effectiveSlotWidth =
    visibleCount < count
      ? Math.max(slotWidth, innerWidth / Math.max(1, visibleCount))
      : slotWidth;

  const characterBudget = Math.floor(
    (effectiveSlotWidth - AXIS_LABEL_HORIZONTAL_PADDING) / (fontSize * 0.58)
  );

  return Math.max(
    MIN_AXIS_LABEL_MAX_LENGTH,
    Math.min(fullLabelLength, characterBudget)
  );
};

const getLabelAnchor = (index: number, count: number) => {
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'middle';
};

const getSeriesColor = (colors: ChartPalette, index: number) =>
  colors.series[index % colors.series.length];

const getSeriesFill = (colors: ChartPalette, index: number) =>
  colors.fills[index % colors.fills.length];

const normalizeChartLabelName = (value?: string | null) =>
  (value ?? '').trim().replace(/^#/, '').replace(/\s+/g, ' ').toLowerCase();

const getTagColorIndexesByName = (tags?: ChartLabelTag[]) => {
  const colorsByName = new Map<string, Color>();

  for (const tag of tags ?? []) {
    const name = normalizeChartLabelName(tag.name);
    if (!name || colorsByName.has(name)) continue;
    colorsByName.set(name, resolveSpectrumColor(tag.color));
  }

  return colorsByName;
};

const getBarFills = ({
  colorScheme,
  colors,
  data,
  tags,
}: {
  colorScheme: keyof typeof SPECTRUM;
  colors: ChartPalette;
  data: cardChart.ResolvedChartSeries['data'];
  tags?: ChartLabelTag[];
}) => {
  if (data.length <= 1) return undefined;
  const tagColorsByName = getTagColorIndexesByName(tags);

  const hasTagColorMatch = data.some((item) =>
    tagColorsByName.has(normalizeChartLabelName(item.label))
  );

  const hasDateLabels = data.some((item) =>
    cardChart.parseChartLabelDate(item.label)
  );

  if (hasDateLabels) {
    if (!hasTagColorMatch) return undefined;

    return data.map((item) => {
      const tagColorIndex = tagColorsByName.get(
        normalizeChartLabelName(item.label)
      );

      return tagColorIndex == null
        ? undefined
        : SPECTRUM[colorScheme][tagColorIndex].default;
    });
  }

  return data.map((item, index) => {
    const tagColorIndex = tagColorsByName.get(
      normalizeChartLabelName(item.label)
    );

    if (tagColorIndex != null) {
      return SPECTRUM[colorScheme][tagColorIndex].default;
    }

    return getSeriesColor(colors, index);
  });
};

type ChartPadding = typeof CHART_PADDING;

const buildPath = (points: cardChart.ChartPoint[], padding: ChartPadding) =>
  points
    .map((point, index) => {
      const x = padding.left + point.x;
      const y = padding.top + point.y;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

const buildAreaPath = (
  points: cardChart.ChartPoint[],
  padding: ChartPadding,
  baselineY: number
) => {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points.at(-1);
  if (!last) return '';

  return [
    `M ${padding.left + first.x} ${baselineY}`,
    buildPath(points, padding).replace(/^M/, 'L'),
    `L ${padding.left + last.x} ${baselineY}`,
    'Z',
  ].join(' ');
};

const buildBarPath = ({
  height,
  radius,
  value,
  width,
  x,
  y,
}: cardChart.BarChartItem & { radius: number }) => {
  const right = x + width;
  const bottom = y + height;
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) return `M ${x} ${y} H ${right} V ${bottom} H ${x} Z`;

  if (value < 0) {
    return [
      `M ${x} ${y}`,
      `H ${right}`,
      `V ${bottom - r}`,
      `Q ${right} ${bottom} ${right - r} ${bottom}`,
      `H ${x + r}`,
      `Q ${x} ${bottom} ${x} ${bottom - r}`,
      `V ${y}`,
      'Z',
    ].join(' ');
  }

  return [
    `M ${x} ${bottom}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `H ${right - r}`,
    `Q ${right} ${y} ${right} ${y + r}`,
    `V ${bottom}`,
    'Z',
  ].join(' ');
};

const getAxisLabelFontSize = ({
  compact,
  type,
}: {
  compact?: boolean;
  type: CardChart['type'];
}) =>
  compact && type !== 'bar'
    ? COMPACT_AXIS_LABEL_FONT_SIZE
    : AXIS_LABEL_FONT_SIZE;

const getYAxisTickCount = ({
  compact,
  yAxis,
}: {
  compact?: boolean;
  yAxis?: CardChart['yAxis'];
}) => yAxis?.tickCount ?? (compact ? 3 : 5);

const ceilAxisTickValue = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  const rounded = Math.ceil(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const getNiceAxisStep = (roughStep: number, decimals?: number) => {
  if (!Number.isFinite(roughStep) || roughStep <= 0) return 1;

  if (decimals != null) {
    const minimumStep = 10 ** -decimals;
    return Math.max(minimumStep, ceilAxisTickValue(roughStep, decimals));
  }

  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;

  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return niceFraction * magnitude;
};

const getAxisTickPrecision = (step: number, decimals?: number) => {
  if (decimals != null) return decimals;
  if (!Number.isFinite(step) || step <= 0) return 0;
  return Math.max(0, Math.min(4, Math.ceil(-Math.log10(step)) + 1));
};

const getNiceYAxisTicks = ({
  clampMinAtZero,
  domain,
  tickCount,
  yAxis,
}: {
  clampMinAtZero: boolean;
  domain: cardChart.ChartDomain;
  tickCount: number;
  yAxis?: CardChart['yAxis'];
}) => {
  const min = clampMinAtZero ? Math.max(0, domain.min) : domain.min;
  const max = Math.max(domain.max, min);
  if (tickCount <= 1) return [max];

  const step = getNiceAxisStep(
    (max - min || 1) / (tickCount - 1),
    yAxis?.decimals
  );

  const precision = getAxisTickPrecision(step, yAxis?.decimals);

  const niceMin = clampMinAtZero
    ? Math.max(0, Math.floor(min / step) * step)
    : Math.floor(min / step) * step;

  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  const limit = Math.min(MAX_Y_AXIS_TICKS, tickCount + 4);

  for (
    let tick = niceMax;
    tick >= niceMin - step / 2 && ticks.length < limit;
    tick -= step
  ) {
    ticks.push(Number(tick.toFixed(precision)));
  }

  return ticks.length
    ? ticks
    : cardChart.getChartTicks({ count: tickCount, max, min });
};

const getYAxisScale = ({
  domain,
  tickCount,
  values,
  yAxis,
}: {
  domain: cardChart.ChartDomain;
  tickCount: number;
  values: number[];
  yAxis?: CardChart['yAxis'];
}) => {
  const clampMinAtZero = cardChart.hasNonNegativeValues(values);

  const baseDomain = {
    max: domain.max,
    min: clampMinAtZero ? Math.max(0, domain.min) : domain.min,
  };

  const ticks = getNiceYAxisTicks({
    clampMinAtZero,
    domain: baseDomain,
    tickCount,
    yAxis,
  });

  const finiteValues = values.filter(Number.isFinite);

  const valueMin = finiteValues.length
    ? Math.min(...finiteValues)
    : baseDomain.min;

  const valueMax = finiteValues.length
    ? Math.max(...finiteValues)
    : baseDomain.max;

  const scaleDomain = {
    max: Math.max(baseDomain.max, valueMax, ...ticks),
    min: clampMinAtZero
      ? Math.max(0, Math.min(baseDomain.min, valueMin, ...ticks))
      : Math.min(baseDomain.min, valueMin, ...ticks),
  };

  if (scaleDomain.max <= scaleDomain.min) scaleDomain.max = scaleDomain.min + 1;

  return {
    domain: scaleDomain,
    tickLabels: ticks.map((tick) =>
      cardChart.formatChartAxisValue({ decimals: yAxis?.decimals, value: tick })
    ),
    ticks,
  };
};

const getYAxisLabelWidth = ({
  fontSize,
  labels,
}: {
  fontSize: number;
  labels: string[];
}) =>
  Math.ceil(
    Math.max(
      0,
      ...labels.map((label) => estimateAxisLabelWidth(label, fontSize))
    )
  );

type ChartPointerEvent = {
  nativeEvent?: { locationX?: unknown; offsetX?: unknown };
};

type ChartTouchScrollLock = { locked: boolean; startX: number; startY: number };

const readChartPointerX = (event: unknown) => {
  const nativeEvent = (event as ChartPointerEvent).nativeEvent;
  const x = nativeEvent?.locationX ?? nativeEvent?.offsetX;
  return typeof x === 'number' ? x : undefined;
};

const getNearestPositionIndex = (x: number, positions: number[]) => {
  if (!positions.length) return null;
  let nearestIndex = 0;
  let nearestDistance = Math.abs(x - positions[0]);

  for (let index = 1; index < positions.length; index++) {
    const distance = Math.abs(x - positions[index]);
    if (distance >= nearestDistance) continue;
    nearestIndex = index;
    nearestDistance = distance;
  }

  return nearestIndex;
};

const formatChartTooltipLabel = (label: string) => {
  if (!cardChart.parseChartLabelDate(label)) return label.trim();
  return formatDateTime(label);
};

const ChartLegend = ({
  chart,
  compact,
  logColorIndex,
  tags,
}: {
  chart: CardChart;
  compact?: boolean;
  logColorIndex?: Color;
  tags?: ChartLabelTag[];
}) => {
  const colorScheme = useColorScheme();
  const series = cardChart.getRenderableChartSeries(chart);

  const colors = getChartPalette({
    colorCount:
      chart.type === 'bar' ? Math.max(4, series[0]?.data.length ?? 0) : 4,
    colorScheme,
    logColorIndex,
  });

  if (!series.length) return null;

  const usesPerBarFills =
    chart.type === 'bar' &&
    !!getBarFills({ colorScheme, colors, data: series[0]?.data ?? [], tags });

  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1">
      {series.map((item, index) => {
        const label = cardChart.formatChartLegendLabel({
          label: item.label,
          unit: item.unit ?? chart.unit,
        });

        const formattedLabel = cardDisplay.formatCardText(label);

        return (
          <View
            key={`${label}-${index}`}
            className="flex-row min-w-0 gap-1.5 items-center"
          >
            {!usesPerBarFills && (
              <View
                className="size-1.5 rounded-full"
                style={{ backgroundColor: getSeriesColor(colors, index) }}
              />
            )}
            <Text
              numberOfLines={1}
              className={cn(
                'text-muted-foreground',
                compact ? 'text-[11px]' : 'text-xs'
              )}
            >
              {formattedLabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const SingleSeriesChart = ({
  barFills,
  color,
  colors,
  compact,
  data,
  domain: domainOverride,
  fill,
  fillHeight,
  showXAxisLabels = true,
  stacked,
  type,
  unit,
  hoverTarget,
  onHoverTargetChange,
  xAxis,
  yAxis,
  yAxisLabelWidth: sharedYAxisLabelWidth,
}: {
  barFills?: (string | undefined)[];
  color: string;
  colors: ChartPalette;
  compact?: boolean;
  data: cardChart.ResolvedChartSeries['data'];
  domain?: cardChart.ChartDomain;
  fill: string;
  fillHeight?: boolean;
  showXAxisLabels?: boolean;
  stacked?: boolean;
  type: CardChart['type'];
  unit?: string;
  hoverTarget?: ChartHoverTarget | null;
  onHoverTargetChange?: (target: ChartHoverTarget | null) => void;
  xAxis?: CardChart['xAxis'];
  yAxis?: CardChart['yAxis'];
  yAxisLabelWidth?: number;
}) => {
  const [containerSize, setContainerSize] = React.useState({
    height: 0,
    width: 0,
  });

  const [localHoveredIndex, setLocalHoveredIndex] = React.useState<
    number | null
  >(null);

  const touchScrollLockRef = React.useRef<ChartTouchScrollLock | null>(null);

  const stackedXAxisReserve =
    !compact && stacked && showXAxisLabels
      ? CHART_PADDING.bottom - HIDDEN_X_AXIS_BOTTOM_PADDING
      : 0;

  const fallbackChartHeight = compact
    ? stacked
      ? 30
      : 64
    : stacked
      ? 104 + stackedXAxisReserve
      : 128;

  const chartHeight =
    fillHeight && containerSize.height
      ? Math.max(1, containerSize.height)
      : fallbackChartHeight;

  const chartWidth = Math.max(0, containerSize.width);
  const showAxes = !compact || type === 'bar';
  const showAxisXAxisLabels = showAxes && showXAxisLabels;
  const axisLabelFontSize = getAxisLabelFontSize({ compact, type });
  const values = data.map((item) => item.value);
  const sharedLineHover = type === 'line' && !!onHoverTargetChange;

  const hoveredIndex = React.useMemo(() => {
    if (!sharedLineHover) return localHoveredIndex;
    if (!hoverTarget) return null;

    const matchingLabelIndex = data.findIndex(
      (item) => item.label === hoverTarget.label
    );

    if (matchingLabelIndex >= 0) return matchingLabelIndex;
    return data[hoverTarget.index] ? hoverTarget.index : null;
  }, [data, hoverTarget, localHoveredIndex, sharedLineHover]);

  const updateHoveredIndex = React.useCallback(
    (index: number | null) => {
      if (sharedLineHover) {
        onHoverTargetChange(
          index == null ? null : { index, label: data[index]?.label ?? '' }
        );

        return;
      }

      setLocalHoveredIndex(index);
    },
    [data, onHoverTargetChange, sharedLineHover]
  );

  const domain =
    domainOverride ??
    (type === 'line'
      ? cardChart.padChartDomain(
          cardChart.getLineChartDomain(values),
          LINE_DOMAIN_PADDING,
          { clampMinAtZero: cardChart.hasNonNegativeValues(values) }
        )
      : cardChart.getChartDomain(values));

  const yAxisTickCount = getYAxisTickCount({ compact, yAxis });

  const yAxisScale = getYAxisScale({
    domain,
    tickCount: yAxisTickCount,
    values,
    yAxis,
  });

  const yAxisTicks = yAxisScale.ticks;
  const yAxisTickLabels = yAxisScale.tickLabels;

  const yAxisLabelWidth = showAxes
    ? (sharedYAxisLabelWidth ??
      getYAxisLabelWidth({
        fontSize: axisLabelFontSize,
        labels: yAxisTickLabels,
      }))
    : 0;

  const compactPadding = {
    ...(type === 'bar' ? COMPACT_BAR_CHART_PADDING : COMPACT_CHART_PADDING),
    bottom:
      type === 'bar'
        ? showXAxisLabels
          ? COMPACT_BAR_CHART_PADDING.bottom
          : HIDDEN_X_AXIS_BOTTOM_PADDING
        : COMPACT_CHART_PADDING.bottom,
  };

  const basePadding = compact
    ? compactPadding
    : {
        ...CHART_PADDING,
        bottom: showXAxisLabels
          ? CHART_PADDING.bottom
          : HIDDEN_X_AXIS_BOTTOM_PADDING,
      };

  const xAxisLabelY =
    chartHeight - basePadding.bottom + AXIS_TICK_SIZE + X_AXIS_TICK_LABEL_GAP;

  const yAxisLabelGap = showAxes ? Y_AXIS_TICK_LABEL_GAP : 0;

  const padding: ChartPadding = {
    ...basePadding,
    left: showAxes
      ? yAxisLabelWidth + AXIS_TICK_SIZE + yAxisLabelGap
      : basePadding.left,
  };

  const innerWidth = Math.max(1, chartWidth - padding.left - padding.right);
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const yAxisTickPositions = yAxisTicks.map(
    (tick) =>
      padding.top +
      cardChart.scaleChartValue({
        height: innerHeight,
        max: yAxisScale.domain.max,
        min: yAxisScale.domain.min,
        value: tick,
      })
  );

  const fullXAxisLabels = data.map((item) =>
    cardChart.formatChartTickLabel(item.label, {
      maxLength: Number.POSITIVE_INFINITY,
    })
  );

  const visibleLabelIndexes = getXAxisLabelIndexes({
    innerWidth,
    labels: fullXAxisLabels,
    mode: xAxis?.labelMode,
    type,
  });

  const xAxisLabelMaxLength = getXAxisLabelMaxLength({
    fontSize: axisLabelFontSize,
    innerWidth,
    labels: fullXAxisLabels,
    type,
    visibleLabelIndexes,
  });

  const xAxisLabels = data.map((item) =>
    cardChart.formatChartTickLabel(item.label, {
      maxLength: xAxisLabelMaxLength,
    })
  );

  const chartContainerStyle = React.useMemo(
    () => ({
      alignSelf: 'stretch' as const,
      ...(fillHeight
        ? { flex: 1, minHeight: fallbackChartHeight }
        : { height: fallbackChartHeight }),
      overflow: 'visible' as const,
      ...(Platform.OS === 'web' && !compact
        ? { touchAction: 'pan-y' as const }
        : undefined),
      width: '100%' as const,
    }),
    [compact, fallbackChartHeight, fillHeight]
  );

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    const nextHeight = Math.floor(event.nativeEvent.layout.height);

    setContainerSize((currentSize) =>
      currentSize.width === nextWidth && currentSize.height === nextHeight
        ? currentSize
        : { height: nextHeight, width: nextWidth }
    );
  }, []);

  const handleChartTouchStart = React.useCallback(
    (event: GestureResponderEvent) => {
      if (Platform.OS !== 'web' || compact) return;

      touchScrollLockRef.current = {
        locked: false,
        startX: event.nativeEvent.pageX,
        startY: event.nativeEvent.pageY,
      };
    },
    [compact]
  );

  const handleChartTouchMove = React.useCallback(
    (event: GestureResponderEvent) => {
      if (Platform.OS !== 'web' || compact) return;
      const touchState = touchScrollLockRef.current;
      if (!touchState) return;

      if (touchState.locked) {
        event.preventDefault();
        return;
      }

      const deltaX = event.nativeEvent.pageX - touchState.startX;
      const deltaY = event.nativeEvent.pageY - touchState.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX < CHART_SCROLL_LOCK_DISTANCE || absX <= absY) return;
      touchState.locked = true;
      event.preventDefault();
    },
    [compact]
  );

  const resetChartTouchScrollLock = React.useCallback(() => {
    touchScrollLockRef.current = null;
  }, []);

  const clearHoveredIndex = React.useCallback(() => {
    updateHoveredIndex(null);
  }, [updateHoveredIndex]);

  const renderTooltip = ({
    index,
    x,
    y,
  }: {
    index: number | null;
    x: number;
    y: number;
  }) => {
    if (index == null || Platform.OS !== 'web' || compact) return null;
    const item = data[index];
    if (!item) return null;

    const value = cardChart.formatChartAxisValue({
      decimals: yAxis?.decimals,
      value: item.value,
    });

    const tooltipHalfWidth = CHART_TOOLTIP_WIDTH / 2;
    const minLeft = tooltipHalfWidth - CHART_TOOLTIP_HORIZONTAL_OVERFLOW;

    const maxLeft =
      chartWidth - tooltipHalfWidth + CHART_TOOLTIP_HORIZONTAL_OVERFLOW;

    const left =
      maxLeft < minLeft
        ? chartWidth / 2
        : Math.max(minLeft, Math.min(maxLeft, x));

    const top = Math.max(
      -CHART_TOOLTIP_HEIGHT - 8,
      Math.min(chartHeight + 8, y - CHART_TOOLTIP_HEIGHT - 12)
    );

    return (
      <View
        className="absolute z-10 px-2 py-1 border-border-secondary rounded-lg bg-popover shadow-sm pointer-events-none border web:-translate-x-1/2"
        style={{ left, maxWidth: CHART_TOOLTIP_WIDTH, top }}
      >
        <Text className="font-medium text-xs" numberOfLines={1}>
          {value}
        </Text>
        <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
          {formatChartTooltipLabel(item.label)}
        </Text>
      </View>
    );
  };

  const axes = (
    <React.Fragment>
      {yAxisTickPositions.map((y, index) =>
        index === yAxisTickPositions.length - 1 ? null : (
          <Line
            key={`grid-${index}`}
            stroke={colors.axis}
            strokeWidth={1}
            x1={padding.left}
            x2={chartWidth - padding.right}
            y1={y}
            y2={y}
            strokeOpacity={
              compact ? COMPACT_CHART_GRID_OPACITY : CHART_GRID_OPACITY
            }
          />
        )
      )}
      <Line
        stroke={colors.axis}
        strokeWidth={1}
        x1={padding.left}
        x2={chartWidth - padding.right}
        y1={padding.top + innerHeight}
        y2={padding.top + innerHeight}
      />
      <Line
        stroke={colors.axis}
        strokeWidth={1}
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={padding.top + innerHeight}
      />
      {yAxisTicks.map((tick, index) => {
        const y = yAxisTickPositions[index];

        return (
          <React.Fragment key={`${tick}-${index}`}>
            <Line
              stroke={colors.axis}
              strokeWidth={1}
              x1={padding.left - AXIS_TICK_SIZE}
              x2={padding.left}
              y1={y}
              y2={y}
            />
            <SvgText
              fill={colors.text}
              fontSize={axisLabelFontSize}
              textAnchor="end"
              x={padding.left - AXIS_TICK_SIZE - yAxisLabelGap}
              y={y + 3}
            >
              {yAxisTickLabels[index]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );

  if (!data.length) return null;

  if (!chartWidth) {
    return (
      <View
        className="overflow-visible w-full"
        onLayout={handleLayout}
        style={chartContainerStyle}
      />
    );
  }

  if (type === 'bar') {
    const bars = cardChart.getBarChartItems({
      chart: { data, ...(unit && { unit }) },
      domain: yAxisScale.domain,
      edgeGap: compact ? 0 : undefined,
      height: innerHeight,
      maxBarWidth: BAR_MAX_WIDTH,
      width: innerWidth,
    });

    if (!bars.length) return null;

    const handleBarPointerTarget = (event: unknown) => {
      const pointerX = readChartPointerX(event);
      if (pointerX == null) return;

      updateHoveredIndex(
        getNearestPositionIndex(
          pointerX - padding.left,
          bars.map((bar) => bar.x + bar.width / 2)
        )
      );
    };

    const hoveredBar =
      hoveredIndex == null ? undefined : (bars[hoveredIndex] ?? undefined);

    return (
      <View
        className="overflow-visible w-full"
        onLayout={handleLayout}
        onPointerLeave={Platform.OS === 'web' ? clearHoveredIndex : undefined}
        onTouchCancel={resetChartTouchScrollLock}
        onTouchEnd={resetChartTouchScrollLock}
        onTouchMove={handleChartTouchMove}
        onTouchStart={handleChartTouchStart}
        style={chartContainerStyle}
        onPointerDown={
          Platform.OS === 'web' && !compact ? handleBarPointerTarget : undefined
        }
        onPointerMove={
          Platform.OS === 'web' && !compact ? handleBarPointerTarget : undefined
        }
      >
        <Svg
          height={chartHeight}
          style={CHART_SVG_STYLE}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width="100%"
        >
          {axes}
          {bars.map((bar, index) => {
            const barFill = barFills?.[index] ?? fill;
            const isHovered = hoveredIndex === index && !compact;

            const opacity =
              hoveredIndex == null || hoveredIndex === index
                ? BAR_IDLE_OPACITY
                : BAR_DIMMED_OPACITY;

            return (
              <React.Fragment key={`${bar.label}-${index}`}>
                <Path
                  fill={barFill}
                  opacity={isHovered ? 1 : opacity}
                  stroke={isHovered ? barFill : undefined}
                  strokeOpacity={isHovered ? 0.5 : 0}
                  strokeWidth={isHovered ? 1.5 : 0}
                  d={buildBarPath({
                    ...bar,
                    radius: BAR_CORNER_RADIUS,
                    x: padding.left + bar.x,
                    y: padding.top + bar.y,
                  })}
                />
                {showAxisXAxisLabels && visibleLabelIndexes.has(index) && (
                  <React.Fragment>
                    <Line
                      stroke={colors.axis}
                      strokeWidth={1}
                      x1={padding.left + bar.x + bar.width / 2}
                      x2={padding.left + bar.x + bar.width / 2}
                      y1={padding.top + innerHeight}
                      y2={padding.top + innerHeight + AXIS_TICK_SIZE}
                    />
                    <SvgText
                      alignmentBaseline="hanging"
                      fill={colors.text}
                      fontSize={axisLabelFontSize}
                      textAnchor="middle"
                      x={padding.left + bar.x + bar.width / 2}
                      y={xAxisLabelY}
                    >
                      {xAxisLabels[index]}
                    </SvgText>
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
        {hoveredBar &&
          renderTooltip({
            index: hoveredIndex,
            x: padding.left + hoveredBar.x + hoveredBar.width / 2,
            y: padding.top + hoveredBar.y,
          })}
      </View>
    );
  }

  const points = cardChart.getLineChartPoints({
    chart: { data, ...(unit && { unit }) },
    domain: yAxisScale.domain,
    height: innerHeight,
    width: innerWidth,
  });

  if (!points.length) return null;

  const handleLinePointerTarget = (event: unknown) => {
    const pointerX = readChartPointerX(event);
    if (pointerX == null) return;

    updateHoveredIndex(
      getNearestPositionIndex(
        pointerX - padding.left,
        points.map((point) => point.x)
      )
    );
  };

  const baselineY = padding.top + innerHeight;
  const areaPath = buildAreaPath(points, padding, baselineY);

  const hoveredPoint =
    hoveredIndex == null ? undefined : (points[hoveredIndex] ?? undefined);

  const lastPoint = points.at(-1);
  const lastItem = data.at(-1);

  const lastValueLabel =
    !compact && lastItem
      ? cardChart.formatChartAxisValue({
          decimals: yAxis?.decimals,
          value: lastItem.value,
        })
      : undefined;

  const lastValueTextWidth = lastValueLabel
    ? Math.max(
        32,
        estimateAxisLabelWidth(lastValueLabel, axisLabelFontSize) + 8
      )
    : 0;

  return (
    <View
      className="overflow-visible w-full"
      onLayout={handleLayout}
      onPointerLeave={Platform.OS === 'web' ? clearHoveredIndex : undefined}
      onTouchCancel={resetChartTouchScrollLock}
      onTouchEnd={resetChartTouchScrollLock}
      onTouchMove={handleChartTouchMove}
      onTouchStart={handleChartTouchStart}
      style={chartContainerStyle}
      onPointerDown={
        Platform.OS === 'web' && !compact ? handleLinePointerTarget : undefined
      }
      onPointerMove={
        Platform.OS === 'web' && !compact ? handleLinePointerTarget : undefined
      }
    >
      <Svg
        height={chartHeight}
        style={CHART_SVG_STYLE}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
      >
        {!!areaPath && (
          <Path d={areaPath} fill={color} opacity={compact ? 0.08 : 0.1} />
        )}
        {showAxes && axes}
        {!!hoveredPoint && !compact && (
          <Line
            stroke={color}
            strokeDasharray="4 4"
            strokeOpacity={0.45}
            strokeWidth={1}
            x1={padding.left + hoveredPoint.x}
            x2={padding.left + hoveredPoint.x}
            y1={padding.top}
            y2={padding.top + innerHeight}
          />
        )}
        <Path
          d={buildPath(points, padding)}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
        {points.map((point, index) => {
          const item = data[index];

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {showAxisXAxisLabels && visibleLabelIndexes.has(index) && (
                <React.Fragment>
                  <Line
                    stroke={colors.axis}
                    strokeWidth={1}
                    x1={padding.left + point.x}
                    x2={padding.left + point.x}
                    y1={padding.top + innerHeight}
                    y2={padding.top + innerHeight + AXIS_TICK_SIZE}
                  />
                  <SvgText
                    alignmentBaseline="hanging"
                    fill={colors.text}
                    fontSize={axisLabelFontSize}
                    textAnchor={getLabelAnchor(index, data.length)}
                    x={padding.left + point.x}
                    y={xAxisLabelY}
                  >
                    {xAxisLabels[index]}
                  </SvgText>
                </React.Fragment>
              )}
              <Circle
                cx={padding.left + point.x}
                cy={padding.top + point.y}
                fill={color}
                r={
                  index === hoveredIndex && !compact
                    ? 4
                    : index === points.length - 1 && !compact
                      ? 3.5
                      : 2
                }
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {!!lastPoint && !!lastValueLabel && (
        <Text
          className="absolute text-center text-xs pointer-events-none"
          numberOfLines={1}
          style={{
            color: colors.text,
            fontSize: axisLabelFontSize,
            left: padding.left + lastPoint.x - lastValueTextWidth / 2,
            top: Math.max(
              -axisLabelFontSize - 4,
              Math.min(
                chartHeight - padding.bottom - axisLabelFontSize,
                padding.top + lastPoint.y - axisLabelFontSize - 9
              )
            ),
            width: lastValueTextWidth,
          }}
        >
          {lastValueLabel}
        </Text>
      )}
      {hoveredPoint &&
        renderTooltip({
          index: hoveredIndex,
          x: padding.left + hoveredPoint.x,
          y: padding.top + hoveredPoint.y,
        })}
    </View>
  );
};

const Chart = ({
  chart,
  compact,
  logColorIndex,
  tags,
}: {
  chart: CardChart;
  compact?: boolean;
  logColorIndex?: Color;
  tags?: ChartLabelTag[];
}) => {
  const colorScheme = useColorScheme();
  const series = cardChart.getRenderableChartSeries(chart);

  const colors = getChartPalette({
    colorCount:
      chart.type === 'bar' ? Math.max(4, series[0]?.data.length ?? 0) : 4,
    colorScheme,
    logColorIndex,
  });

  const [hoverTarget, setHoverTarget] = React.useState<ChartHoverTarget | null>(
    null
  );

  const stacked = series.length > 1;
  if (!series.length) return null;

  const barFills =
    chart.type === 'bar'
      ? getBarFills({ colorScheme, colors, data: series[0]?.data ?? [], tags })
      : undefined;

  const showAxes = !compact || chart.type === 'bar';
  const axisLabelFontSize = getAxisLabelFontSize({ compact, type: chart.type });
  const yAxisTickCount = getYAxisTickCount({ compact, yAxis: chart.yAxis });

  const shouldShareLineDomain =
    chart.type === 'line' &&
    !cardChart.hasMixedChartUnits(
      series.map((item) => ({ unit: item.unit ?? chart.unit }))
    );

  const sharedLineDomain =
    shouldShareLineDomain && series.length > 1
      ? (() => {
          const values = cardChart.getChartValues(series);

          return cardChart.padChartDomain(
            cardChart.getLineChartDomain(values),
            LINE_DOMAIN_PADDING,
            { clampMinAtZero: cardChart.hasNonNegativeValues(values) }
          );
        })()
      : undefined;

  const domains = series.map((item) => {
    const values = item.data.map((datum) => datum.value);

    return chart.type === 'line'
      ? (sharedLineDomain ??
          cardChart.padChartDomain(
            cardChart.getLineChartDomain(values),
            LINE_DOMAIN_PADDING,
            { clampMinAtZero: cardChart.hasNonNegativeValues(values) }
          ))
      : cardChart.getChartDomain(values);
  });

  const yAxisScales = series.map((item, index) =>
    getYAxisScale({
      domain: domains[index],
      tickCount: yAxisTickCount,
      values: item.data.map((datum) => datum.value),
      yAxis: chart.yAxis,
    })
  );

  const yAxisLabelWidth = showAxes
    ? Math.max(
        0,
        ...yAxisScales.map((scale) =>
          getYAxisLabelWidth({
            fontSize: axisLabelFontSize,
            labels: scale.tickLabels,
          })
        )
      )
    : undefined;

  const enableSharedHover = chart.type === 'line' && !compact;

  return (
    <View
      className={cn(
        'w-full overflow-visible',
        compact && 'flex-1',
        stacked && (compact ? 'gap-0.5' : 'gap-1.5')
      )}
    >
      {series.map((item, index) => (
        <SingleSeriesChart
          key={`${item.label}-${index}`}
          barFills={index === 0 ? barFills : undefined}
          color={getSeriesColor(colors, index)}
          colors={colors}
          compact={compact}
          data={item.data}
          domain={domains[index]}
          fill={getSeriesFill(colors, index)}
          fillHeight={compact}
          hoverTarget={enableSharedHover ? hoverTarget : undefined}
          onHoverTargetChange={enableSharedHover ? setHoverTarget : undefined}
          showXAxisLabels={!stacked || index === series.length - 1}
          stacked={stacked}
          type={chart.type}
          unit={item.unit ?? chart.unit}
          xAxis={chart.xAxis}
          yAxis={chart.yAxis}
          yAxisLabelWidth={yAxisLabelWidth}
        />
      ))}
    </View>
  );
};

const MilestoneTimelineItem = ({
  alignment: alignmentOverride,
  compact,
  count,
  dotColor,
  index,
  milestone,
}: {
  alignment?: MilestoneAlignment;
  compact?: boolean;
  count: number;
  dotColor: string;
  index: number;
  milestone: Milestone;
}) => {
  const [rowHeight, setRowHeight] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);

  const alignment = compact
    ? count === 1 && alignmentOverride
      ? alignmentOverride
      : getCompactMilestoneAlignment(index, count)
    : 'start';

  const contentOffset =
    compact && rowHeight > 0 && contentHeight > 0
      ? getAlignedOffset({ alignment, contentHeight, rowHeight })
      : 0;

  const dotCenter = contentOffset + MILESTONE_DOT_CENTER;

  const handleRowLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);

    setRowHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
  }, []);

  const handleContentLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);

    setContentHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
  }, []);

  return (
    <View
      className={cn('flex-row gap-3', compact && 'min-h-0')}
      onLayout={compact ? handleRowLayout : undefined}
      style={compact && count > 1 ? { flex: 1 } : undefined}
    >
      <View className="relative w-2 self-stretch">
        {index > 0 && (
          <View
            className="absolute"
            style={{
              backgroundColor: dotColor,
              height: dotCenter,
              left: MILESTONE_RAIL_LEFT,
              opacity: MILESTONE_RAIL_OPACITY,
              top: 0,
              width: 1,
            }}
          />
        )}
        {index < count - 1 && (
          <View
            className="absolute"
            style={{
              backgroundColor: dotColor,
              bottom: 0,
              left: MILESTONE_RAIL_LEFT,
              opacity: MILESTONE_RAIL_OPACITY,
              top: dotCenter,
              width: 1,
            }}
          />
        )}
        <View
          className="absolute rounded-full"
          style={{
            backgroundColor: dotColor,
            height: MILESTONE_DOT_SIZE,
            left: 0,
            top: contentOffset + MILESTONE_DOT_TOP,
            width: MILESTONE_DOT_SIZE,
          }}
        />
      </View>
      <View className="flex-1 min-w-0 self-stretch">
        <View
          onLayout={compact ? handleContentLayout : undefined}
          style={compact ? { marginTop: contentOffset } : undefined}
          className={cn(
            compact ? 'gap-0.5' : 'gap-1',
            !compact && index < count - 1 && 'pb-4'
          )}
        >
          {!!milestone.date && (
            <Text
              className="leading-4 text-muted-foreground text-xs"
              numberOfLines={1}
            >
              {formatDateTime(milestone.date)}
            </Text>
          )}
          <Text
            className="font-medium text-sm web:text-balance"
            numberOfLines={2}
          >
            {cardDisplay.formatCardText(milestone.title)}
          </Text>
          {!compact && !!milestone.detail && (
            <Text className="leading-snug text-muted-foreground text-sm web:text-balance">
              {cardDisplay.formatCardText(milestone.detail)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export const ProgressCard = ({
  actionMenu,
  card,
  chartTags,
  className,
  frame = 'card',
  logColorIndex,
  onPress,
  output,
  showChartKey = true,
  variant = 'summary',
}: {
  actionMenu?: React.ReactNode;
  card: Pick<LogCard, 'error' | 'isGenerating' | 'tags' | 'title'>;
  chartTags?: ChartLabelTag[];
  className?: string;
  frame?: 'card' | 'none';
  logColorIndex?: Color;
  onPress?: () => void;
  output?: CardOutput | null;
  showChartKey?: boolean;
  variant?: 'detail' | 'summary';
}) => {
  const colorScheme = useColorScheme();
  const resolvedOutput = output ?? null;
  const isGenerating = !!card.isGenerating;
  const isSummary = variant === 'summary';
  const summary = resolvedOutput?.summary?.trim();
  const hasRenderableChart = cardChart.isRenderableChart(resolvedOutput?.chart);

  const isEmptyOutput =
    !!resolvedOutput &&
    summary === EMPTY_CARD_SUMMARY &&
    !resolvedOutput.metrics.length &&
    !resolvedOutput.milestones.length &&
    !hasRenderableChart;

  const showEmptyState = !isGenerating && !resolvedOutput && !card.error;

  const milestoneDotColor =
    SPECTRUM[colorScheme][
      resolveSpectrumColor(logColorIndex, DEFAULT_CHART_COLOR)
    ].default;

  const previewSections =
    isSummary && resolvedOutput ? getPreviewSections(resolvedOutput) : [];

  const isFramed = frame === 'card';
  const resolvedChartTags = chartTags ?? card.tags;

  const renderMetrics = ({
    limit,
    rows = 1,
  }: { limit?: number; rows?: number } = {}) => {
    if (!resolvedOutput?.metrics.length) return null;

    const metrics = resolvedOutput.metrics.slice(
      0,
      limit ?? resolvedOutput.metrics.length
    );

    return (
      <View className="flex-row flex-wrap gap-2">
        {metrics.map((metric) => (
          <View
            key={metric.label}
            className={cn(
              isSummary
                ? 'flex-1 min-w-0 gap-0.5'
                : 'gap-0.5 px-3 py-1.5 border-continuous rounded-xl bg-input'
            )}
            style={
              isSummary && rows > 1 ? { flexBasis: '48%' as const } : undefined
            }
          >
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>
              {cardDisplay.formatCardText(metric.label)}
            </Text>
            <View className="flex-row min-w-0 gap-2 items-center">
              <Text className="font-semibold text-sm shrink" numberOfLines={1}>
                {cardDisplay.formatMetricValue(metric)}
              </Text>
              {!!metric.trend && (
                <Icon
                  icon={trendIcons[metric.trend]}
                  size={16}
                  className={
                    metric.trend === 'flat'
                      ? 'text-muted-foreground'
                      : undefined
                  }
                  color={
                    metric.trend === 'flat' ? undefined : milestoneDotColor
                  }
                />
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderMilestones = ({
    alignment,
    compact,
    limit,
  }: {
    alignment?: MilestoneAlignment;
    compact?: boolean;
    limit?: number;
  } = {}) => {
    const milestones =
      resolvedOutput?.milestones.slice(0, limit ?? undefined) ?? [];

    if (!milestones.length) return null;

    return (
      <View
        className={cn(
          compact && 'flex-1 min-h-0',
          compact &&
            milestones.length === 1 &&
            getJustifyClass(alignment ?? 'center')
        )}
      >
        {milestones.map((milestone, index) => (
          <MilestoneTimelineItem
            key={`${milestone.title}-${milestone.date ?? ''}`}
            alignment={alignment}
            compact={compact}
            count={milestones.length}
            dotColor={milestoneDotColor}
            index={index}
            milestone={milestone}
          />
        ))}
      </View>
    );
  };

  const renderSummary = ({ lines }: { lines?: number } = {}) => {
    if (!summary) return null;
    const formattedSummary = cardDisplay.formatCardText(summary);

    if (isEmptyOutput) {
      return <CardStatusPill icon={MagnifyingGlass} label={formattedSummary} />;
    }

    return (
      <Text
        numberOfLines={lines}
        className={cn(
          'web:text-pretty',
          isSummary && 'text-sm',
          'leading-snug'
        )}
      >
        {formattedSummary}
      </Text>
    );
  };

  const renderPreviewSection = (
    section: PreviewSection,
    sectionIndex: number
  ) => {
    if (!resolvedOutput) return null;
    const alignment = getPreviewSectionAlignment(previewSections, sectionIndex);

    return (
      <View
        key={section.key}
        className="min-h-0 w-full self-stretch"
        style={{ flex: section.rows }}
      >
        {section.type === 'spacer' ? null : section.type === 'chart' &&
          hasRenderableChart &&
          resolvedOutput.chart ? (
          <Chart
            chart={resolvedOutput.chart}
            compact
            logColorIndex={logColorIndex}
            tags={resolvedChartTags}
          />
        ) : section.type === 'metrics' ? (
          <View className={cn('flex-1', getJustifyClass(alignment))}>
            {renderMetrics({ limit: section.limit, rows: section.rows })}
          </View>
        ) : section.type === 'summary' && summary ? (
          <View className={cn('flex-1', getJustifyClass(alignment))}>
            {renderSummary({ lines: section.lines })}
          </View>
        ) : section.type === 'milestones' ? (
          renderMilestones({ alignment, compact: true, limit: section.limit })
        ) : null}
      </View>
    );
  };

  const body = (
    <React.Fragment>
      <View className="flex-row gap-3 items-start">
        <View
          className={cn(
            'flex-1 min-w-0',
            isSummary && !!actionMenu && '-mt-0.5 md:mt-0'
          )}
        >
          <Text
            numberOfLines={isSummary ? 1 : undefined}
            className={cn(
              'font-semibold',
              isSummary ? 'text-base' : 'text-lg',
              'leading-snug'
            )}
          >
            {card.title ? cardDisplay.formatCardText(card.title) : card.title}
          </Text>
        </View>
        {actionMenu ? (
          <View className={cn(!isSummary && '-mt-1.5')}>{actionMenu}</View>
        ) : null}
      </View>
      {isGenerating && !resolvedOutput ? (
        <View
          className={cn(
            'items-start justify-end',
            isSummary ? 'flex-1' : 'h-24'
          )}
        >
          <CardStatusPill isLoading label="Generating..." />
        </View>
      ) : showEmptyState ? (
        <View
          className={cn(
            'items-start justify-end',
            isSummary ? 'flex-1' : 'h-24'
          )}
        >
          <CardStatusPill icon={MagnifyingGlass} label={EMPTY_CARD_SUMMARY} />
        </View>
      ) : resolvedOutput ? (
        isSummary ? (
          <View className="flex-1 mt-3 w-full gap-2 self-stretch">
            {previewSections.map(renderPreviewSection)}
          </View>
        ) : (
          <View className="mt-8 w-full gap-8 self-stretch">
            {renderMetrics()}
            {hasRenderableChart && resolvedOutput.chart && (
              <View className="w-full gap-2 self-stretch">
                {showChartKey && (
                  <ChartLegend
                    chart={resolvedOutput.chart}
                    logColorIndex={logColorIndex}
                    tags={resolvedChartTags}
                  />
                )}
                <Chart
                  chart={resolvedOutput.chart}
                  logColorIndex={logColorIndex}
                  tags={resolvedChartTags}
                />
              </View>
            )}
            {renderSummary()}
            {resolvedOutput.milestones.length > 0 && renderMilestones()}
          </View>
        )
      ) : (
        <View
          className={cn(
            'items-center justify-center',
            isSummary ? 'flex-1' : 'h-24'
          )}
        >
          <Text
            className="text-center text-muted-foreground"
            numberOfLines={isSummary ? 4 : undefined}
          >
            Failed to generate card.
          </Text>
        </View>
      )}
    </React.Fragment>
  );

  const content = isFramed ? (
    <Card className={cn('p-4', isSummary && 'h-52', className)}>{body}</Card>
  ) : (
    <View className={cn('w-full self-stretch', className)}>{body}</View>
  );

  return onPress ? (
    <Pressable className="w-full rounded-2xl" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
};
