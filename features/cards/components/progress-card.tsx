import * as cardChart from '@/domain/cards/chart';
import type { CardChart, CardOutput } from '@/domain/cards/output';
import type { LogCard } from '@/features/cards/types/card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/time';
import { resolveSpectrumColor, SPECTRUM, type Color } from '@/theme/spectrum';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import * as cardDisplay from '@/features/cards/lib/card-display';
import * as metricDisplay from '@/features/cards/lib/metric-display';

import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
  type TextProps,
} from 'react-native-svg';

import {
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

const MAX_Y_AXIS_TICKS = 6;
const CHART_SCROLL_LOCK_DISTANCE = 8;
const AXIS_LABEL_FONT_SIZE = 11;

const AXIS_LABEL_FONT_FAMILY =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const AXIS_LABEL_SVG_FONT_FAMILY =
  Platform.OS === 'web' ? AXIS_LABEL_FONT_FAMILY : undefined;

// `alignment-baseline` is honored on <text> only inconsistently across browsers
// (some position the "hanging" label correctly, others ignore it and let it ride
// up onto the axis). `dominant-baseline` is the reliable one everywhere. rn-svg
// forwards it to the DOM on web but doesn't type it; native ignores it and
// positions via the typed alignmentBaseline prop instead — so spread it on as
// extra props alongside alignmentBaseline.
const SVG_TEXT_HANGING_BASELINE = { dominantBaseline: 'hanging' } as TextProps;
const AXIS_TICK_SIZE = 4;
const X_AXIS_TICK_LABEL_GAP = 5;

const X_AXIS_LABEL_BOTTOM_PADDING =
  AXIS_TICK_SIZE + X_AXIS_TICK_LABEL_GAP + AXIS_LABEL_FONT_SIZE;

const X_AXIS_LABEL_MIN_GAP = 8;
const Y_AXIS_TICK_LABEL_GAP = 8;

const CHART_PADDING = {
  bottom: X_AXIS_LABEL_BOTTOM_PADDING,
  left: 0,
  right: 0,
  top: 12,
};

const COMPACT_CHART_PADDING = { bottom: 4, left: 0, right: 0, top: 4 };
const NATIVE_LINE_CHART_MARKER_EDGE_PADDING = 4;

const COMPACT_BAR_CHART_PADDING = {
  bottom: X_AXIS_LABEL_BOTTOM_PADDING,
  left: 0,
  right: 0,
  top: 8,
};

const HIDDEN_X_AXIS_BOTTOM_PADDING = 8;
const LINE_DOMAIN_PADDING = 0.08;
const CHART_GRID_OPACITY = 0.35;
const COMPACT_CHART_GRID_OPACITY = 0.24;
const DETAIL_LINE_CHART_HEIGHT = 144;
const DETAIL_STACKED_LINE_CHART_HEIGHT = 116;
const AXIS_LABEL_HORIZONTAL_PADDING = 8;
const MIN_AXIS_LABEL_MAX_LENGTH = 10;
const BAR_CORNER_RADIUS = 5;
const BAR_MAX_WIDTH = 44;
const BAR_IDLE_OPACITY = 0.9;
const BAR_DIMMED_OPACITY = 0.62;

export const PROGRESS_CARD_PREVIEW_HEIGHT = 208;

const HORIZONTAL_BAR_COMPACT_MIN_HEIGHT = 64;
const HORIZONTAL_BAR_ROW_HEIGHT = 20;
const HORIZONTAL_BAR_HEIGHT = 8;
const HORIZONTAL_BAR_COMPACT_SLOTS_PER_PREVIEW_ROW = 2;
const VERTICAL_BAR_MAX_CATEGORICAL_ITEMS = 4;
const HORIZONTAL_BAR_LABEL_GAP = 8;
const HORIZONTAL_BAR_VALUE_GAP = HORIZONTAL_BAR_LABEL_GAP;
const HORIZONTAL_BAR_LABEL_MAX_WIDTH = 220;
const HORIZONTAL_BAR_MIN_TRACK_WIDTH = 56;
const HORIZONTAL_BAR_VALUE_MIN_WIDTH = 0;
const CHART_TOOLTIP_WIDTH = 128;
const CHART_TOOLTIP_HEIGHT = 46;
const COMPACT_CHART_TOOLTIP_WIDTH = 112;
const COMPACT_CHART_TOOLTIP_HEIGHT = 40;
const CHART_TOOLTIP_GAP = 12;
const BAR_CHART_TOOLTIP_GAP = 6;
const CHART_TOOLTIP_HORIZONTAL_OVERFLOW = 16;
const NATIVE_CHART_TOOLTIP_FALLBACK_MS = 900;

const CHART_WEB_NO_SELECT_STYLE =
  Platform.OS === 'web'
    ? ({
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      } as const)
    : undefined;

const CHART_SVG_STYLE = {
  overflow: 'visible',
  pointerEvents: 'none',
  ...CHART_WEB_NO_SELECT_STYLE,
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
type BarChartOrientation = 'horizontal' | 'vertical';
type XAxisLabelAnchor = 'end' | 'middle' | 'start';

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

const getPreviewChartRows = ({
  hasMetrics,
  hasMilestones,
  hasSummary,
}: {
  hasMetrics: boolean;
  hasMilestones: boolean;
  hasSummary: boolean;
}) => (hasMetrics || hasMilestones || hasSummary ? 2 : SUMMARY_ROW_COUNT);

const getPreviewSections = (output: CardOutput): PreviewSection[] => {
  const hasChart = cardChart.isRenderableChart(output.chart);
  const hasMetrics = output.metrics.length > 0;
  const hasMilestones = output.milestones.length > 0;

  const structuredSectionCount =
    Number(hasChart) + Number(hasMetrics) + Number(hasMilestones);

  const hasSummary = !!output.summary?.trim() && structuredSectionCount <= 1;

  if (hasChart) {
    const chartRows = getPreviewChartRows({
      hasMetrics,
      hasMilestones,
      hasSummary,
    });

    const companionRows = SUMMARY_ROW_COUNT - chartRows;

    if (hasMetrics && chartRows < SUMMARY_ROW_COUNT) {
      return addPreviewSpacer([
        {
          key: 'metrics',
          limit:
            companionRows > 1
              ? SUMMARY_METRICS_ONLY_LIMIT
              : SUMMARY_METRIC_LIMIT,
          rows: companionRows,
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
        sections.push({
          key: 'summary',
          lines: companionRows * 2,
          rows: companionRows,
          type: 'summary',
        });
      } else if (hasMilestones) {
        sections.push({
          key: 'milestones',
          limit: companionRows,
          rows: companionRows,
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
        { key: 'milestones', limit: 2, rows: 2, type: 'milestones' },
        { key: 'summary', lines: 2, rows: 1, type: 'summary' },
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
) => {
  const measuredWidth = measureAxisLabelWidth(label, fontSize);
  if (measuredWidth != null) return measuredWidth;

  const units = [...label].reduce((total, character) => {
    if (/\s/.test(character)) return total + 0.28;
    if (/[ilI1.,:;|!]/.test(character)) return total + 0.32;
    if (/[mwMW@#%&]/.test(character)) return total + 0.86;
    if (/[A-Z0-9]/.test(character)) return total + 0.62;
    return total + 0.52;
  }, 0);

  return units * fontSize;
};

let axisLabelMeasureCanvas: HTMLCanvasElement | undefined;

const measureAxisLabelWidth = (label: string, fontSize: number) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return undefined;
  }

  axisLabelMeasureCanvas ??= document.createElement('canvas');
  const context = axisLabelMeasureCanvas.getContext('2d');
  if (!context) return undefined;
  context.font = `${fontSize}px ${AXIS_LABEL_FONT_FAMILY}`;
  return context.measureText(label).width;
};

const truncateAxisLabelToWidth = ({
  fontSize = AXIS_LABEL_FONT_SIZE,
  label,
  width,
}: {
  fontSize?: number;
  label: string;
  width: number;
}) => {
  if (width <= 0) return '';
  const trimmed = label.trim();

  if (!trimmed || estimateAxisLabelWidth(trimmed, fontSize) <= width) {
    return trimmed;
  }

  const suffix = '...';
  const suffixWidth = estimateAxisLabelWidth(suffix, fontSize);
  if (suffixWidth > width) return '';
  const maxTextWidth = Math.max(0, width - suffixWidth);
  let result = '';

  for (const character of trimmed) {
    const next = `${result}${character}`;
    if (estimateAxisLabelWidth(next, fontSize) > maxTextWidth) break;
    result = next;
  }

  const truncated = result.trimEnd();
  return truncated ? `${truncated}${suffix}` : suffix;
};

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

  if (type === 'bar' && count <= VERTICAL_BAR_MAX_CATEGORICAL_ITEMS) {
    return getVisibleLabelIndexes(count, count);
  }

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

const getLabelAnchor = (index: number, count: number): XAxisLabelAnchor => {
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'middle';
};

const getCenteredXAxisLabels = ({
  fontSize,
  innerWidth,
  labels,
  positions,
  visibleLabelIndexes,
}: {
  fontSize: number;
  innerWidth: number;
  labels: string[];
  positions: number[];
  visibleLabelIndexes: Set<number>;
}) => {
  const visibleIndexes = [...visibleLabelIndexes]
    .filter((index) => positions[index] != null)
    .sort((a, b) => a - b);

  const visibleOrders = new Map(
    visibleIndexes.map((index, order) => [index, order])
  );

  return labels.map((label, index) => {
    const position = positions[index] ?? 0;
    const visibleOrder = visibleOrders.get(index);
    if (visibleOrder == null) return '';
    const previousPosition = positions[visibleIndexes[visibleOrder - 1] ?? -1];
    const nextPosition = positions[visibleIndexes[visibleOrder + 1] ?? -1];

    return truncateAxisLabelToWidth({
      fontSize,
      label,
      width: getCenteredXAxisLabelWidth({
        innerWidth,
        nextPosition,
        position,
        previousPosition,
      }),
    });
  });
};

const getCenteredXAxisLabelWidth = ({
  innerWidth,
  nextPosition,
  position,
  previousPosition,
}: {
  innerWidth: number;
  nextPosition?: number;
  position: number;
  previousPosition?: number;
}) => {
  const edgeWidth = Math.min(position, innerWidth - position) * 2;

  const previousWidth =
    previousPosition == null
      ? Number.POSITIVE_INFINITY
      : position - previousPosition - X_AXIS_LABEL_MIN_GAP;

  const nextWidth =
    nextPosition == null
      ? Number.POSITIVE_INFINITY
      : nextPosition - position - X_AXIS_LABEL_MIN_GAP;

  return Math.max(0, Math.min(edgeWidth, previousWidth, nextWidth));
};

const getVerticalBarGapBounds = ({
  barWidth,
  count,
  edgeGap,
  innerWidth,
}: {
  barWidth: number;
  count: number;
  edgeGap: number;
  innerWidth: number;
}) => {
  const resolvedEdgeGap = Math.min(
    Math.max(0, edgeGap),
    Math.max(0, (innerWidth - count) / 2)
  );

  const availableWidth = Math.max(1, innerWidth - resolvedEdgeGap * 2);
  const totalRequestedGap = X_AXIS_LABEL_MIN_GAP * (count - 1);
  const maxTotalGap = Math.max(0, availableWidth - count);
  const totalGap = Math.min(totalRequestedGap, maxTotalGap);
  const minimumGap = count > 1 ? totalGap / (count - 1) : 0;

  const maximumGap =
    count > 1
      ? Math.max(
          minimumGap,
          Math.max(0, (availableWidth - count * barWidth) / (count - 1))
        )
      : minimumGap;

  return { availableWidth, maximumGap, minimumGap, resolvedEdgeGap };
};

const getVerticalBarLabelPositions = ({
  availableWidth,
  barWidth,
  count,
  gap,
  resolvedEdgeGap,
}: {
  availableWidth: number;
  barWidth: number;
  count: number;
  gap: number;
  resolvedEdgeGap: number;
}) => {
  const groupWidth = count * barWidth + (count - 1) * gap;
  const groupOffset = Math.max(0, (availableWidth - groupWidth) / 2);

  return Array.from(
    { length: count },
    (_, index) =>
      resolvedEdgeGap + groupOffset + barWidth / 2 + index * (barWidth + gap)
  );
};

const getXAxisLabelFitScore = ({
  innerWidth,
  labelWidths,
  positions,
  visibleIndexes,
}: {
  innerWidth: number;
  labelWidths: Map<number, number>;
  positions: number[];
  visibleIndexes: number[];
}) => {
  let allFit = true;
  let minimumRatio = Number.POSITIVE_INFINITY;
  let totalShortfall = 0;

  visibleIndexes.forEach((index, visibleOrder) => {
    const width = getCenteredXAxisLabelWidth({
      innerWidth,
      nextPosition: positions[visibleIndexes[visibleOrder + 1] ?? -1],
      position: positions[index] ?? 0,
      previousPosition: positions[visibleIndexes[visibleOrder - 1] ?? -1],
    });

    const labelWidth = labelWidths.get(index) ?? 0;
    const shortfall = Math.max(0, labelWidth - width);
    if (shortfall > 0.5) allFit = false;
    totalShortfall += shortfall;

    minimumRatio = Math.min(
      minimumRatio,
      labelWidth > 0 ? Math.min(1, width / labelWidth) : 1
    );
  });

  return { allFit, minimumRatio, totalShortfall };
};

const getVerticalBarGapCandidates = ({
  maximumGap,
  minimumGap,
}: {
  maximumGap: number;
  minimumGap: number;
}) => {
  const candidates = new Set<number>([minimumGap, maximumGap]);
  const start = Math.ceil(minimumGap);
  const end = Math.floor(maximumGap);

  for (let gap = start; gap <= end; gap++) {
    candidates.add(gap);
  }

  return [...candidates].sort((a, b) => a - b);
};

const getVerticalBarLabelGap = ({
  barWidth,
  edgeGap,
  fontSize,
  innerWidth,
  labels,
  visibleLabelIndexes,
}: {
  barWidth: number;
  edgeGap: number;
  fontSize: number;
  innerWidth: number;
  labels: string[];
  visibleLabelIndexes: Set<number>;
}) => {
  const visibleIndexes = [...visibleLabelIndexes]
    .filter((index) => labels[index] != null)
    .sort((a, b) => a - b);

  const count = labels.length;
  if (count <= 1 || visibleIndexes.length <= 1) return X_AXIS_LABEL_MIN_GAP;

  const labelWidths = new Map(
    visibleIndexes.map((index) => [
      index,
      estimateAxisLabelWidth(labels[index] ?? '', fontSize),
    ])
  );

  const { availableWidth, maximumGap, minimumGap, resolvedEdgeGap } =
    getVerticalBarGapBounds({ barWidth, count, edgeGap, innerWidth });

  if (maximumGap <= minimumGap) return minimumGap;

  const scoreGap = (gap: number) =>
    getXAxisLabelFitScore({
      innerWidth,
      labelWidths,
      positions: getVerticalBarLabelPositions({
        availableWidth,
        barWidth,
        count,
        gap,
        resolvedEdgeGap,
      }),
      visibleIndexes,
    });

  let bestGap = minimumGap;
  let bestScore = scoreGap(bestGap);

  for (const gap of getVerticalBarGapCandidates({ maximumGap, minimumGap })) {
    const score = scoreGap(gap);
    if (score.allFit) return gap;

    if (
      score.minimumRatio > bestScore.minimumRatio ||
      (score.minimumRatio === bestScore.minimumRatio &&
        score.totalShortfall < bestScore.totalShortfall)
    ) {
      bestGap = gap;
      bestScore = score;
    }
  }

  return bestGap;
};

const getSeriesColor = (colors: ChartPalette, index: number) =>
  colors.series[index % colors.series.length];

const getSeriesFill = (colors: ChartPalette, index: number) =>
  colors.fills[index % colors.fills.length];

const getBarChartOrientation = (
  data: cardChart.ResolvedChartSeries['data']
): BarChartOrientation => {
  if (!data.length) return 'vertical';

  if (data.some((item) => cardChart.parseChartLabelDate(item.label))) {
    return 'vertical';
  }

  if (data.length <= VERTICAL_BAR_MAX_CATEGORICAL_ITEMS) return 'vertical';

  return cardChart.hasNonNegativeValues(data.map((item) => item.value))
    ? 'horizontal'
    : 'vertical';
};

const getHorizontalBarChartHeight = ({
  compact,
  count,
}: {
  compact?: boolean;
  count: number;
}) =>
  compact
    ? Math.max(
        HORIZONTAL_BAR_COMPACT_MIN_HEIGHT,
        count * HORIZONTAL_BAR_ROW_HEIGHT
      )
    : Math.max(
        0,
        (count - 1) * HORIZONTAL_BAR_ROW_HEIGHT + HORIZONTAL_BAR_HEIGHT
      );

type HorizontalBarLayoutItem = cardChart.BarChartItem & { labelY: number };

const getHorizontalBarLayout = ({
  chartHeight,
  chartWidth,
  compact,
  compactSlotCount,
  data,
  decimals,
}: {
  chartHeight: number;
  chartWidth: number;
  compact?: boolean;
  compactSlotCount?: number;
  data: cardChart.ResolvedChartSeries['data'];
  decimals?: NonNullable<CardChart['yAxis']>['decimals'];
}) => {
  const labelFontSize = AXIS_LABEL_FONT_SIZE;
  const values = data.map((item) => item.value);

  const valueLabels = data.map((item) =>
    cardChart.formatChartAxisValue({ decimals, value: item.value })
  );

  const displayLabels = data.map((item) =>
    cardChart.formatChartTickLabel(item.label, {
      maxLength: Number.POSITIVE_INFINITY,
    })
  );

  const valueLabelWidth = Math.ceil(
    Math.max(
      HORIZONTAL_BAR_VALUE_MIN_WIDTH,
      ...valueLabels.map((label) =>
        estimateAxisLabelWidth(label, labelFontSize)
      )
    )
  );

  const availableLabelWidth = Math.max(
    0,
    chartWidth -
      HORIZONTAL_BAR_MIN_TRACK_WIDTH -
      HORIZONTAL_BAR_LABEL_GAP -
      HORIZONTAL_BAR_VALUE_GAP -
      valueLabelWidth
  );

  const maxLabelWidth = Math.min(
    HORIZONTAL_BAR_LABEL_MAX_WIDTH,
    availableLabelWidth
  );

  const labelWidth = Math.ceil(
    Math.min(
      maxLabelWidth,
      Math.max(
        0,
        ...displayLabels.map((label) =>
          estimateAxisLabelWidth(label, labelFontSize)
        )
      )
    )
  );

  const labels = displayLabels.map((label) =>
    truncateAxisLabelToWidth({
      fontSize: labelFontSize,
      label,
      width: labelWidth,
    })
  );

  const barX = labelWidth + HORIZONTAL_BAR_LABEL_GAP;

  const barWidth = Math.max(
    1,
    chartWidth -
      labelWidth -
      HORIZONTAL_BAR_LABEL_GAP -
      HORIZONTAL_BAR_VALUE_GAP -
      valueLabelWidth
  );

  const maxValue = Math.max(1, ...values);
  const verticalPadding = compact ? 2 : 6;
  const availableHeight = Math.max(1, chartHeight - verticalPadding * 2);
  const slotCount = compactSlotCount ?? data.length;

  const rowStep = compact
    ? availableHeight / Math.max(1, slotCount)
    : HORIZONTAL_BAR_ROW_HEIGHT;

  const barHeight = compact
    ? Math.min(HORIZONTAL_BAR_HEIGHT, Math.max(4, rowStep * 0.46))
    : HORIZONTAL_BAR_HEIGHT;

  const barGroupHeight = (data.length - 1) * rowStep + barHeight;

  const barStackTop = compact
    ? verticalPadding + Math.max(0, (availableHeight - barGroupHeight) / 2)
    : Math.max(0, chartHeight - barGroupHeight);

  const bars: HorizontalBarLayoutItem[] = data.map((item, index) => {
    const rawWidth = (item.value / maxValue) * barWidth;
    const width = item.value <= 0 ? 1 : Math.max(1, rawWidth);
    const y = barStackTop + index * rowStep;

    return {
      height: barHeight,
      label: item.label,
      labelY: y + barHeight / 2,
      value: item.value,
      width,
      x: barX,
      y,
    };
  });

  return { bars, barWidth, labelFontSize, labels, labelWidth, valueLabels };
};

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
  barOrientation = 'vertical',
  color,
  colors,
  compact,
  compactRows,
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
  barOrientation?: BarChartOrientation;
  color: string;
  colors: ChartPalette;
  compact?: boolean;
  compactRows?: number;
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

  const nativeTooltipFallbackTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const touchScrollLockRef = React.useRef<ChartTouchScrollLock | null>(null);
  const hoverTargetRef = React.useRef(hoverTarget);
  hoverTargetRef.current = hoverTarget;

  const isHorizontalBar =
    type === 'bar' && barOrientation === 'horizontal' && data.length > 0;

  const compactHorizontalBarLimit =
    compact && isHorizontalBar && compactRows
      ? Math.max(
          1,
          Math.floor(compactRows * HORIZONTAL_BAR_COMPACT_SLOTS_PER_PREVIEW_ROW)
        )
      : undefined;

  const horizontalBarData =
    isHorizontalBar && compactHorizontalBarLimit
      ? data.slice(0, compactHorizontalBarLimit)
      : data;

  const stackedXAxisReserve =
    !compact && stacked && showXAxisLabels
      ? CHART_PADDING.bottom - HIDDEN_X_AXIS_BOTTOM_PADDING
      : 0;

  const fallbackChartHeight = isHorizontalBar
    ? getHorizontalBarChartHeight({ compact, count: horizontalBarData.length })
    : compact
      ? stacked
        ? 30
        : 64
      : stacked
        ? (type === 'line' ? DETAIL_STACKED_LINE_CHART_HEIGHT : 104) +
          stackedXAxisReserve
        : type === 'line'
          ? DETAIL_LINE_CHART_HEIGHT
          : 128;

  const chartHeight =
    fillHeight && containerSize.height
      ? Math.max(1, containerSize.height)
      : fallbackChartHeight;

  const chartWidth = Math.max(0, containerSize.width);
  const showAxes = !isHorizontalBar && (!compact || type === 'bar');
  const showAxisXAxisLabels = showAxes && showXAxisLabels;
  const axisLabelFontSize = AXIS_LABEL_FONT_SIZE;
  const values = data.map((item) => item.value);
  const interactive = !compact;

  const sharedLineHover =
    interactive && type === 'line' && !!onHoverTargetChange;

  const hoveredIndex = React.useMemo(() => {
    if (!interactive) return null;
    if (!sharedLineHover) return localHoveredIndex;
    if (!hoverTarget) return null;

    const matchingLabelIndex = data.findIndex(
      (item) => item.label === hoverTarget.label
    );

    if (matchingLabelIndex >= 0) return matchingLabelIndex;
    return data[hoverTarget.index] ? hoverTarget.index : null;
  }, [data, hoverTarget, interactive, localHoveredIndex, sharedLineHover]);

  const clearNativeTooltipFallbackTimeout = React.useCallback(() => {
    if (!nativeTooltipFallbackTimeoutRef.current) return;
    clearTimeout(nativeTooltipFallbackTimeoutRef.current);
    nativeTooltipFallbackTimeoutRef.current = null;
  }, []);

  React.useEffect(
    () => clearNativeTooltipFallbackTimeout,
    [clearNativeTooltipFallbackTimeout]
  );

  const updateHoveredIndex = React.useCallback(
    (index: number | null) => {
      if (!interactive) return;

      if (sharedLineHover) {
        const currentHoverTarget = hoverTargetRef.current;

        if (index == null) {
          if (!currentHoverTarget) return;
          onHoverTargetChange(null);
          return;
        }

        const label = data[index]?.label ?? '';

        if (
          currentHoverTarget?.index === index &&
          currentHoverTarget.label === label
        ) {
          return;
        }

        onHoverTargetChange({ index, label });
        return;
      }

      setLocalHoveredIndex((currentIndex) =>
        currentIndex === index ? currentIndex : index
      );
    },
    [data, interactive, onHoverTargetChange, sharedLineHover]
  );

  const scheduleNativeTooltipFallback = React.useCallback(() => {
    if (Platform.OS === 'web') return;
    clearNativeTooltipFallbackTimeout();

    nativeTooltipFallbackTimeoutRef.current = setTimeout(() => {
      updateHoveredIndex(null);
      nativeTooltipFallbackTimeoutRef.current = null;
    }, NATIVE_CHART_TOOLTIP_FALLBACK_MS);
  }, [clearNativeTooltipFallbackTimeout, updateHoveredIndex]);

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

  const lineMarkerEdgePadding =
    Platform.OS === 'web' || type !== 'line'
      ? 0
      : NATIVE_LINE_CHART_MARKER_EDGE_PADDING;

  const xAxisLabelY =
    chartHeight - basePadding.bottom + AXIS_TICK_SIZE + X_AXIS_TICK_LABEL_GAP;

  const yAxisLabelGap = showAxes ? Y_AXIS_TICK_LABEL_GAP : 0;

  const padding: ChartPadding = {
    ...basePadding,
    left: showAxes
      ? yAxisLabelWidth + AXIS_TICK_SIZE + yAxisLabelGap
      : basePadding.left + lineMarkerEdgePadding,
    right: basePadding.right + lineMarkerEdgePadding,
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
        ? { flex: 1, minHeight: compact ? 0 : fallbackChartHeight }
        : { height: fallbackChartHeight }),
      overflow: 'visible' as const,
      ...CHART_WEB_NO_SELECT_STYLE,
      ...(Platform.OS === 'web' && !isHorizontalBar
        ? { touchAction: 'pan-y' as const }
        : undefined),
      width: '100%' as const,
    }),
    [compact, fallbackChartHeight, fillHeight, isHorizontalBar]
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
      if (Platform.OS !== 'web' || isHorizontalBar) return;

      touchScrollLockRef.current = {
        locked: false,
        startX: event.nativeEvent.pageX,
        startY: event.nativeEvent.pageY,
      };
    },
    [isHorizontalBar]
  );

  const handleChartTouchMove = React.useCallback(
    (event: GestureResponderEvent) => {
      if (Platform.OS !== 'web' || isHorizontalBar) return;
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
    [isHorizontalBar]
  );

  const resetChartTouchScrollLock = React.useCallback(() => {
    touchScrollLockRef.current = null;
  }, []);

  const clearHoveredIndex = React.useCallback(() => {
    clearNativeTooltipFallbackTimeout();
    updateHoveredIndex(null);
  }, [clearNativeTooltipFallbackTimeout, updateHoveredIndex]);

  const handleChartTouchCancel = React.useCallback(() => {
    resetChartTouchScrollLock();
    if (Platform.OS !== 'web') clearHoveredIndex();
  }, [clearHoveredIndex, resetChartTouchScrollLock]);

  const makeChartTouchHandlers = (
    pointerTarget: (event: GestureResponderEvent) => void
  ) => ({
    onTouchEnd: handleChartTouchCancel,
    onTouchMove: (event: GestureResponderEvent) => {
      handleChartTouchMove(event);
      if (Platform.OS !== 'web') pointerTarget(event);
    },
    onTouchStart: (event: GestureResponderEvent) => {
      handleChartTouchStart(event);
      if (Platform.OS !== 'web') pointerTarget(event);
    },
  });

  const renderTooltip = ({
    gap = CHART_TOOLTIP_GAP,
    index,
    x,
    y,
  }: {
    gap?: number;
    index: number | null;
    x: number;
    y: number;
  }) => {
    if (index == null) return null;
    const item = data[index];
    if (!item) return null;

    const formattedValue = cardChart.formatChartAxisValue({
      decimals: yAxis?.decimals,
      value: item.value,
    });

    const trimmedUnit = unit?.trim();

    const value = trimmedUnit
      ? `${formattedValue} ${trimmedUnit}`
      : formattedValue;

    const tooltipWidth = compact
      ? COMPACT_CHART_TOOLTIP_WIDTH
      : CHART_TOOLTIP_WIDTH;

    const tooltipHeight = compact
      ? COMPACT_CHART_TOOLTIP_HEIGHT
      : CHART_TOOLTIP_HEIGHT;

    const tooltipHalfWidth = tooltipWidth / 2;
    const minLeft = tooltipHalfWidth - CHART_TOOLTIP_HORIZONTAL_OVERFLOW;

    const maxLeft =
      chartWidth - tooltipHalfWidth + CHART_TOOLTIP_HORIZONTAL_OVERFLOW;

    const left =
      maxLeft < minLeft
        ? chartWidth / 2
        : Math.max(minLeft, Math.min(maxLeft, x));

    const top = Math.max(
      -tooltipHeight - 8,
      Math.min(chartHeight + 8, y - tooltipHeight - gap)
    );

    return (
      <View
        className="absolute z-10 px-2 py-1 border-border-secondary rounded-lg bg-popover shadow-sm pointer-events-none border web:-translate-x-1/2"
        pointerEvents="none"
        style={
          Platform.OS === 'web'
            ? { left, maxWidth: tooltipWidth, top }
            : { left: left - tooltipHalfWidth, top, width: tooltipWidth }
        }
      >
        <Text
          className={cn('font-medium', compact ? 'text-[11px]' : 'text-xs')}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text
          numberOfLines={1}
          className={cn(
            'text-muted-foreground',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}
        >
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
              fontFamily={AXIS_LABEL_SVG_FONT_FAMILY}
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
    if (isHorizontalBar) {
      const horizontalLayout = getHorizontalBarLayout({
        chartHeight,
        chartWidth,
        compact,
        compactSlotCount: compactHorizontalBarLimit,
        data: horizontalBarData,
        decimals: yAxis?.decimals,
      });

      return (
        <View
          className="overflow-visible w-full"
          onLayout={handleLayout}
          onTouchCancel={interactive ? handleChartTouchCancel : undefined}
          onTouchEnd={interactive ? handleChartTouchCancel : undefined}
          onTouchMove={interactive ? handleChartTouchMove : undefined}
          onTouchStart={interactive ? handleChartTouchStart : undefined}
          style={chartContainerStyle}
        >
          <Svg
            height={chartHeight}
            style={CHART_SVG_STYLE}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            width="100%"
          >
            {horizontalLayout.bars.map((bar, index) => {
              const barFill = barFills?.[index] ?? fill;

              return (
                <React.Fragment key={`${bar.label}-${index}`}>
                  <SvgText
                    alignmentBaseline="middle"
                    fill={colors.text}
                    fontFamily={AXIS_LABEL_SVG_FONT_FAMILY}
                    fontSize={horizontalLayout.labelFontSize}
                    textAnchor="end"
                    x={horizontalLayout.labelWidth}
                    y={bar.labelY}
                  >
                    {horizontalLayout.labels[index]}
                  </SvgText>
                  <Rect
                    fill={colors.axis}
                    height={bar.height}
                    opacity={compact ? 0.16 : 0.18}
                    rx={bar.height / 2}
                    width={horizontalLayout.barWidth}
                    x={bar.x}
                    y={bar.y}
                  />
                  <Rect
                    fill={barFill}
                    height={bar.height}
                    opacity={BAR_IDLE_OPACITY}
                    rx={bar.height / 2}
                    width={bar.width}
                    x={bar.x}
                    y={bar.y}
                  />
                  <SvgText
                    alignmentBaseline="middle"
                    fill={colors.text}
                    fontFamily={AXIS_LABEL_SVG_FONT_FAMILY}
                    fontSize={horizontalLayout.labelFontSize}
                    textAnchor="start"
                    y={bar.labelY}
                    x={
                      bar.x +
                      horizontalLayout.barWidth +
                      HORIZONTAL_BAR_VALUE_GAP
                    }
                  >
                    {horizontalLayout.valueLabels[index]}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      );
    }

    const verticalBarEdgeGap = compact ? 0 : 6;

    const baseBars = cardChart.getBarChartItems({
      chart: { data, ...(unit && { unit }) },
      domain: yAxisScale.domain,
      edgeGap: verticalBarEdgeGap,
      height: innerHeight,
      maxBarWidth: BAR_MAX_WIDTH,
      width: innerWidth,
    });

    const bars = cardChart.getBarChartItems({
      chart: { data, ...(unit && { unit }) },
      domain: yAxisScale.domain,
      edgeGap: verticalBarEdgeGap,
      height: innerHeight,
      maxBarGap: getVerticalBarLabelGap({
        barWidth: baseBars[0]?.width ?? BAR_MAX_WIDTH,
        edgeGap: verticalBarEdgeGap,
        fontSize: axisLabelFontSize,
        innerWidth,
        labels: fullXAxisLabels,
        visibleLabelIndexes: showAxisXAxisLabels
          ? visibleLabelIndexes
          : new Set<number>(),
      }),
      maxBarWidth: BAR_MAX_WIDTH,
      width: innerWidth,
    });

    if (!bars.length) return null;

    const barXAxisLabels = getCenteredXAxisLabels({
      fontSize: axisLabelFontSize,
      innerWidth,
      labels: fullXAxisLabels,
      positions: bars.map((bar) => bar.x + bar.width / 2),
      visibleLabelIndexes,
    });

    const handleBarPointerTarget = (event: unknown) => {
      const pointerX = readChartPointerX(event);
      if (pointerX == null) return;

      updateHoveredIndex(
        getNearestPositionIndex(
          pointerX - padding.left,
          bars.map((bar) => bar.x + bar.width / 2)
        )
      );

      scheduleNativeTooltipFallback();
    };

    const barTouchHandlers = makeChartTouchHandlers(handleBarPointerTarget);

    const hoveredBar =
      hoveredIndex == null ? undefined : (bars[hoveredIndex] ?? undefined);

    return (
      <View
        className="overflow-visible w-full"
        onLayout={handleLayout}
        onTouchCancel={interactive ? handleChartTouchCancel : undefined}
        onTouchEnd={interactive ? barTouchHandlers.onTouchEnd : undefined}
        onTouchMove={interactive ? barTouchHandlers.onTouchMove : undefined}
        onTouchStart={interactive ? barTouchHandlers.onTouchStart : undefined}
        style={chartContainerStyle}
        onPointerDown={
          Platform.OS === 'web' && interactive
            ? handleBarPointerTarget
            : undefined
        }
        onPointerLeave={
          Platform.OS === 'web' && interactive ? clearHoveredIndex : undefined
        }
        onPointerMove={
          Platform.OS === 'web' && interactive
            ? handleBarPointerTarget
            : undefined
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
            const isHovered = hoveredIndex === index;

            const opacity =
              hoveredIndex == null || hoveredIndex === index
                ? BAR_IDLE_OPACITY
                : BAR_DIMMED_OPACITY;

            return (
              <React.Fragment key={`${bar.label}-${index}`}>
                <Path
                  fill={barFill}
                  opacity={isHovered ? 1 : opacity}
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
                      {...SVG_TEXT_HANGING_BASELINE}
                      alignmentBaseline="hanging"
                      fill={colors.text}
                      fontFamily={AXIS_LABEL_SVG_FONT_FAMILY}
                      fontSize={axisLabelFontSize}
                      textAnchor="middle"
                      x={padding.left + bar.x + bar.width / 2}
                      y={xAxisLabelY}
                    >
                      {barXAxisLabels[index] ?? xAxisLabels[index]}
                    </SvgText>
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
        {hoveredBar &&
          renderTooltip({
            gap: BAR_CHART_TOOLTIP_GAP,
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

    scheduleNativeTooltipFallback();
  };

  const lineTouchHandlers = makeChartTouchHandlers(handleLinePointerTarget);
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
      onTouchCancel={interactive ? handleChartTouchCancel : undefined}
      onTouchEnd={interactive ? lineTouchHandlers.onTouchEnd : undefined}
      onTouchMove={interactive ? lineTouchHandlers.onTouchMove : undefined}
      onTouchStart={interactive ? lineTouchHandlers.onTouchStart : undefined}
      style={chartContainerStyle}
      onPointerDown={
        Platform.OS === 'web' && interactive
          ? handleLinePointerTarget
          : undefined
      }
      onPointerLeave={
        Platform.OS === 'web' && interactive ? clearHoveredIndex : undefined
      }
      onPointerMove={
        Platform.OS === 'web' && interactive
          ? handleLinePointerTarget
          : undefined
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
                    {...SVG_TEXT_HANGING_BASELINE}
                    alignmentBaseline="hanging"
                    fill={colors.text}
                    fontFamily={AXIS_LABEL_SVG_FONT_FAMILY}
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
                  index === hoveredIndex
                    ? compact
                      ? 3
                      : 4
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
  compactRows,
  logColorIndex,
  tags,
}: {
  chart: CardChart;
  compact?: boolean;
  compactRows?: number;
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

  const barOrientation =
    chart.type === 'bar'
      ? getBarChartOrientation(series[0]?.data ?? [])
      : 'vertical';

  const barFills =
    chart.type === 'bar'
      ? getBarFills({ colorScheme, colors, data: series[0]?.data ?? [], tags })
      : undefined;

  const showAxes =
    barOrientation === 'horizontal' ? false : !compact || chart.type === 'bar';

  const axisLabelFontSize = AXIS_LABEL_FONT_SIZE;
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
          barOrientation={barOrientation}
          color={getSeriesColor(colors, index)}
          colors={colors}
          compact={compact}
          compactRows={compactRows}
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
  card: Pick<LogCard, 'tags' | 'title'>;
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
  const isSummary = variant === 'summary';
  const summary = resolvedOutput?.summary?.trim();
  const hasRenderableChart = cardChart.isRenderableChart(resolvedOutput?.chart);

  const hasHorizontalBarChart =
    resolvedOutput?.chart?.type === 'bar' &&
    getBarChartOrientation(
      cardChart.getRenderableChartSeries(resolvedOutput.chart)[0]?.data ?? []
    ) === 'horizontal';

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
      <View
        className={cn(
          'flex-row flex-wrap',
          isSummary ? 'gap-x-4 gap-y-2' : 'gap-2'
        )}
      >
        {metrics.map((metric) => {
          const display = metricDisplay.formatMetricDisplay(metric);

          return (
            <View
              key={metric.label}
              className={cn(
                isSummary
                  ? 'flex-1 min-w-0 gap-0.5'
                  : 'gap-0.5 px-3 py-1.5 border-continuous rounded-xl bg-input'
              )}
              style={
                isSummary && rows > 1
                  ? { flexBasis: '48%' as const }
                  : undefined
              }
            >
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {display.label}
              </Text>
              <View className="flex-row min-w-0 gap-2 items-center">
                <Text
                  className="font-semibold text-sm shrink"
                  numberOfLines={1}
                >
                  {display.value}
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
          );
        })}
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
    const formattedSummary = cardDisplay.formatCardSummaryText(summary);

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
            compactRows={section.rows}
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

  if (!cardDisplay.hasDisplayableCardOutput(resolvedOutput)) return null;

  const body = (
    <React.Fragment>
      <View className="flex-row gap-3 items-start">
        <View
          className={cn('flex-1 min-w-0', !!actionMenu && '-mt-0.5 md:mt-0')}
        >
          <Text
            numberOfLines={1}
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
          <View className="-mr-1.5 -mt-1.5">{actionMenu}</View>
        ) : null}
      </View>
      {resolvedOutput ? (
        isSummary ? (
          <View className="flex-1 mt-3 w-full gap-2 self-stretch">
            {previewSections.map(renderPreviewSection)}
          </View>
        ) : (
          <View className="mt-8 w-full gap-8 self-stretch">
            {renderMetrics()}
            {hasRenderableChart && resolvedOutput.chart && (
              <View
                className={cn(
                  'w-full self-stretch',
                  hasHorizontalBarChart ? 'gap-4' : 'gap-2'
                )}
              >
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
            {resolvedOutput.milestones.length > 0 && renderMilestones()}
            {renderSummary()}
          </View>
        )
      ) : null}
    </React.Fragment>
  );

  const previewHeightStyle = isSummary
    ? { height: PROGRESS_CARD_PREVIEW_HEIGHT }
    : undefined;

  const content = isFramed ? (
    <Card className={cn('p-4', className)} style={previewHeightStyle}>
      {body}
    </Card>
  ) : (
    <View
      className={cn('w-full self-stretch', className)}
      style={previewHeightStyle}
    >
      {body}
    </View>
  );

  return onPress ? (
    <Pressable
      className="w-full rounded-2xl"
      onPress={onPress}
      style={previewHeightStyle}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
};
