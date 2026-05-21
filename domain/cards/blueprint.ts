import * as cardOutput from '@/domain/cards/output';
import { z } from 'zod/v4';

const metricBlueprintSchema = z
  .object({
    label: z.string().min(1).max(40),
    trend: z.boolean().optional(),
    unit: z.string().max(16).optional(),
    value: z.union([z.string().max(40), z.number()]),
  })
  .strict();

const chartSeriesBlueprintSchema = z
  .object({
    label: z.string().min(1).max(40),
    unit: z.string().max(16).optional(),
  })
  .strict();

const chartBlueprintSchema = z
  .object({
    kind: z.enum(['data', 'series']),
    series: z.array(chartSeriesBlueprintSchema).optional(),
    title: z.string().max(80).optional(),
    type: z.enum(['bar', 'line']),
    unit: z.string().max(16).optional(),
    xAxis: cardOutput.cardChartXAxisSchema.optional(),
    yAxis: cardOutput.cardChartYAxisSchema.optional(),
  })
  .strict();

export const cardBlueprintSchema = z
  .object({
    chart: chartBlueprintSchema.optional(),
    metrics: z
      .array(metricBlueprintSchema)
      .max(cardOutput.MAX_CARD_METRICS)
      .optional(),
    milestones: z.literal(true).optional(),
    summary: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (blueprint) =>
      !!blueprint.chart ||
      !!blueprint.metrics?.length ||
      blueprint.milestones === true ||
      blueprint.summary === true,
    { message: 'Card blueprint requires content' }
  );

export type CardBlueprint = z.infer<typeof cardBlueprintSchema>;

export const validateCardBlueprint = (value: unknown) =>
  cardBlueprintSchema.safeParse(value);

export const readCardBlueprint = (value: unknown) => {
  const parsed = validateCardBlueprint(value);
  return parsed.success ? parsed.data : undefined;
};

export const createCardBlueprint = (
  value: unknown
): CardBlueprint | undefined => {
  const parsed = cardOutput.validateCardOutput(value);
  if (!parsed.success) return;
  const output = parsed.data;
  const blueprint: CardBlueprint = {};

  if (output.chart) {
    blueprint.chart = {
      kind: output.chart.series?.length ? 'series' : 'data',
      ...(output.chart.series?.length && {
        series: output.chart.series.map((series) => ({
          label: series.label,
          ...(series.unit && { unit: series.unit }),
        })),
      }),
      ...(output.chart.title && { title: output.chart.title }),
      type: output.chart.type,
      ...(output.chart.unit && { unit: output.chart.unit }),
      ...(output.chart.xAxis && { xAxis: output.chart.xAxis }),
      ...(output.chart.yAxis && { yAxis: output.chart.yAxis }),
    };
  }

  if (output.metrics.length > 0) {
    blueprint.metrics = output.metrics.map((metric) => ({
      label: metric.label,
      ...(metric.trend && { trend: true }),
      ...(metric.unit && { unit: metric.unit }),
      value: metric.value,
    }));
  }

  if (output.milestones.length > 0) blueprint.milestones = true;
  if (output.summary?.trim()) blueprint.summary = true;
  return Object.keys(blueprint).length ? blueprint : undefined;
};
