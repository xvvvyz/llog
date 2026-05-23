import { z } from 'zod/v4';

export const DATE_FILTER_UNITS = ['day', 'week', 'month', 'year'] as const;

export const dateBoundSchema = z.union([
  z
    .object({ type: z.literal('iso'), value: z.string().min(1).max(64) })
    .strict(),
  z
    .object({
      offset: z
        .object({ amount: z.number().int(), unit: z.enum(DATE_FILTER_UNITS) })
        .strict()
        .optional(),
      type: z.literal('generationTime'),
    })
    .strict(),
]);

export const analysisDateFilterSchema = z
  .object({
    endExclusive: dateBoundSchema.optional(),
    field: z.literal('record.date'),
    id: z.string().min(1).max(48),
    label: z.string().min(1).max(80).optional(),
    startInclusive: dateBoundSchema.optional(),
  })
  .strict()
  .refine((value) => value.startInclusive || value.endExclusive);

export type AnalysisDateFilter = z.infer<typeof analysisDateFilterSchema>;

export type DateBound = z.infer<typeof dateBoundSchema>;

export type ResolvedAnalysisDateFilter = {
  endExclusive?: string;
  id: string;
  label?: string;
  startInclusive?: string;
};

type DateFilterSpec = { filters?: AnalysisDateFilter[] };
type DateFilterRecord = { date?: Date | number | string | null; id: string };
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_OR_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[tT].+)?$/;

const MONTH_INDEX_BY_TOKEN: Record<string, number> = {
  apr: 3,
  april: 3,
  aug: 7,
  august: 7,
  dec: 11,
  december: 11,
  feb: 1,
  february: 1,
  jan: 0,
  january: 0,
  jul: 6,
  july: 6,
  jun: 5,
  june: 5,
  mar: 2,
  march: 2,
  may: 4,
  nov: 10,
  november: 10,
  oct: 9,
  october: 9,
  sep: 8,
  sept: 8,
  september: 8,
};

const MONTH_PATTERN =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

const normalizeText = (value: unknown, maxLength = Infinity) => {
  const text =
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim().replace(/\s+/g, ' ')
      : '';

  return text.length <= maxLength ? text : text.slice(0, maxLength).trim();
};

const normalizeToken = (value: unknown) =>
  normalizeText(value)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeId = (value: unknown, fallback: string) => {
  const token = normalizeToken(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  return token || fallback;
};

const uniqueId = (id: string, used: Set<string>) => {
  let candidate = id;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${id}_${suffix}`.slice(0, 48);
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const padDatePart = (value: number) => String(value).padStart(2, '0');

const dateOnlyString = (year: number, monthIndex: number, day: number) => {
  const date = new Date(Date.UTC(year, monthIndex, day));

  return `${date.getUTCFullYear()}-${padDatePart(
    date.getUTCMonth() + 1
  )}-${padDatePart(date.getUTCDate())}`;
};

const exactDateOnlyString = (year: number, monthIndex: number, day: number) => {
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return;
  }

  return dateOnlyString(year, monthIndex, day);
};

const dateOnlyFromDate = (date: Date) =>
  dateOnlyString(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const startOfDateOnlyIso = (value: string) =>
  resolveIsoDateBound(value, 'start')?.toISOString() ?? value;

const validDate = (value?: Date | number | string | null) => {
  if (value == null) return;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

const generationAnchor = (value?: Date | number | string | null) =>
  validDate(value) ?? new Date();

const addUtcMonths = (date: Date, amount: number) => {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + amount);

  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();

  next.setUTCDate(Math.min(day, lastDay));
  return next;
};

const addUtcOffset = (
  date: Date,
  offset?: { amount: number; unit: (typeof DATE_FILTER_UNITS)[number] }
) => {
  if (!offset) return new Date(date);
  const next = new Date(date);

  if (offset.unit === 'day') {
    next.setUTCDate(next.getUTCDate() + offset.amount);
    return next;
  }

  if (offset.unit === 'week') {
    next.setUTCDate(next.getUTCDate() + offset.amount * 7);
    return next;
  }

  return addUtcMonths(next, offset.amount * (offset.unit === 'year' ? 12 : 1));
};

const resolveIsoDateBound = (
  value: string,
  boundary: 'end' | 'start'
): Date | undefined => {
  const text = normalizeText(value, 64);
  if (!ISO_DATE_OR_DATETIME_PATTERN.test(text)) return;

  if (ISO_DATE_ONLY_PATTERN.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return;
    }

    if (boundary === 'end') date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  return validDate(text);
};

const normalizeDateBound = (value: unknown): DateBound | undefined => {
  const parsed = dateBoundSchema.safeParse(value);
  if (!parsed.success) return;

  if (parsed.data.type === 'iso') {
    const text = normalizeText(parsed.data.value, 64);
    const date = resolveIsoDateBound(text, 'start');
    if (!date) return;

    return ISO_DATE_ONLY_PATTERN.test(text)
      ? { type: 'iso', value: text }
      : { type: 'iso', value: date.toISOString() };
  }

  return {
    ...(parsed.data.offset && { offset: parsed.data.offset }),
    type: 'generationTime',
  };
};

export const normalizeDateFilters = (value: unknown): AnalysisDateFilter[] => {
  const usedIds = new Set<string>();

  return asArray(value).flatMap((item, index) => {
    const parsed = analysisDateFilterSchema.safeParse(item);
    if (!parsed.success) return [];
    const startInclusive = normalizeDateBound(parsed.data.startInclusive);
    const endExclusive = normalizeDateBound(parsed.data.endExclusive);
    if (!startInclusive && !endExclusive) return [];

    return {
      ...(endExclusive && { endExclusive }),
      field: 'record.date' as const,
      id: uniqueId(
        normalizeId(parsed.data.id, `date_filter_${index + 1}`),
        usedIds
      ),
      ...(parsed.data.label && { label: normalizeText(parsed.data.label, 80) }),
      ...(startInclusive && { startInclusive }),
    };
  });
};

const resolveDateBound = ({
  anchor,
  bound,
  boundary,
}: {
  anchor: Date;
  bound: DateBound;
  boundary: 'end' | 'start';
}) =>
  bound.type === 'iso'
    ? resolveIsoDateBound(bound.value, boundary)
    : addUtcOffset(anchor, bound.offset);

export const resolveAnalysisDateFilters = ({
  analysisSpec,
  generationTime,
}: {
  analysisSpec?: DateFilterSpec;
  generationTime?: Date | number | string | null;
}): ResolvedAnalysisDateFilter[] => {
  const anchor = generationAnchor(generationTime);

  return (analysisSpec?.filters ?? []).flatMap((filter) => {
    const start = filter.startInclusive
      ? resolveDateBound({
          anchor,
          bound: filter.startInclusive,
          boundary: 'start',
        })
      : undefined;

    const end = filter.endExclusive
      ? resolveDateBound({
          anchor,
          bound: filter.endExclusive,
          boundary: 'end',
        })
      : undefined;

    if (!start && !end) return [];
    if (start && end && start.getTime() >= end.getTime()) return [];

    return {
      ...(end && { endExclusive: end.toISOString() }),
      id: filter.id,
      ...(filter.label && { label: filter.label }),
      ...(start && { startInclusive: start.toISOString() }),
    };
  });
};

export const filterRecordsByAnalysisDate = <T extends DateFilterRecord>({
  analysisSpec,
  generationTime,
  records,
}: {
  analysisSpec?: DateFilterSpec;
  generationTime?: Date | number | string | null;
  records: T[];
}) => {
  const filters = resolveAnalysisDateFilters({ analysisSpec, generationTime });
  if (!filters.length) return records;

  return records.filter((record) => {
    const date = validDate(record.date);
    if (!date) return false;
    const time = date.getTime();

    return filters.every((filter) => {
      const start = filter.startInclusive
        ? new Date(filter.startInclusive).getTime()
        : -Infinity;

      const end = filter.endExclusive
        ? new Date(filter.endExclusive).getTime()
        : Infinity;

      return time >= start && time < end;
    });
  });
};

const monthIndexForToken = (value: string) =>
  MONTH_INDEX_BY_TOKEN[value.toLowerCase()];

type DatePhraseParts = {
  day: number;
  hasYear: boolean;
  monthIndex: number;
  year?: number;
};

const parseDatePhraseParts = (value: string): DatePhraseParts | undefined => {
  const text = value.trim().replace(/,\s*/g, ' ').replace(/\s+/g, ' ');
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (iso) {
    const year = Number(iso[1]);
    const monthIndex = Number(iso[2]) - 1;
    const day = Number(iso[3]);

    return exactDateOnlyString(year, monthIndex, day)
      ? { day, hasYear: true, monthIndex, year }
      : undefined;
  }

  const numeric = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(text);

  if (numeric) {
    const monthIndex = Number(numeric[1]) - 1;
    const day = Number(numeric[2]);
    const yearToken = numeric[3];

    const year = yearToken
      ? Number(yearToken.length === 2 ? `20${yearToken}` : yearToken)
      : undefined;

    return {
      day,
      hasYear: year != null,
      monthIndex,
      ...(year != null && { year }),
    };
  }

  const monthDay = new RegExp(
    `^(${MONTH_PATTERN})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?$`,
    'i'
  ).exec(text);

  if (!monthDay) return;
  const monthIndex = monthIndexForToken(monthDay[1] ?? '');
  if (monthIndex == null) return;
  const day = Number(monthDay[2]);
  const year = monthDay[3] ? Number(monthDay[3]) : undefined;

  return {
    day,
    hasYear: year != null,
    monthIndex,
    ...(year != null && { year }),
  };
};

const monthDayComesBefore = (
  left: Pick<DatePhraseParts, 'day' | 'monthIndex'>,
  right: Pick<DatePhraseParts, 'day' | 'monthIndex'>
) =>
  left.monthIndex < right.monthIndex ||
  (left.monthIndex === right.monthIndex && left.day < right.day);

const resolvePromptDateRange = ({
  anchor,
  endPhrase,
  startPhrase,
}: {
  anchor: Date;
  endPhrase: string;
  startPhrase: string;
}) => {
  const start = parseDatePhraseParts(startPhrase);
  const end = parseDatePhraseParts(endPhrase);
  if (!start || !end) return;
  let startYear = start.year ?? end.year ?? anchor.getUTCFullYear();
  let endYear = end.year ?? start.year ?? anchor.getUTCFullYear();
  if (!end.hasYear && monthDayComesBefore(end, start)) endYear = startYear + 1;

  if (!start.hasYear && end.hasYear && monthDayComesBefore(end, start)) {
    startYear = endYear - 1;
  }

  const resolvedStart = exactDateOnlyString(
    startYear,
    start.monthIndex,
    start.day
  );

  const resolvedEnd = exactDateOnlyString(endYear, end.monthIndex, end.day);
  if (!resolvedStart || !resolvedEnd) return;

  if (!start.hasYear || !end.hasYear) {
    const endDate = resolveIsoDateBound(resolvedEnd, 'end');

    if (endDate && endDate.getTime() > anchor.getTime()) {
      startYear -= 1;
      endYear -= 1;
    }
  }

  const finalStart = exactDateOnlyString(
    startYear,
    start.monthIndex,
    start.day
  );

  const finalEnd = exactDateOnlyString(endYear, end.monthIndex, end.day);
  if (!finalStart || !finalEnd) return;

  return {
    endExclusive: { type: 'iso', value: finalEnd },
    field: 'record.date' as const,
    id: normalizeId(`from_${finalStart}_to_${finalEnd}`, 'date_range'),
    label: `${finalStart} to ${finalEnd}`,
    startInclusive: { type: 'iso', value: finalStart },
  } satisfies AnalysisDateFilter;
};

const startOfUtcWeek = (date: Date) => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  const weekday = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - weekday + 1);
  return start;
};

const thisUnitFilter = (
  unit: (typeof DATE_FILTER_UNITS)[number],
  anchor: Date
): AnalysisDateFilter | undefined => {
  let start: string | undefined;

  if (unit === 'week') {
    start = dateOnlyFromDate(startOfUtcWeek(anchor));
  } else if (unit === 'month') {
    start = dateOnlyString(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1);
  } else if (unit === 'year') {
    start = dateOnlyString(anchor.getUTCFullYear(), 0, 1);
  }

  return start
    ? {
        endExclusive: { type: 'generationTime' },
        field: 'record.date',
        id: `this_${unit}`,
        label: `This ${unit}`,
        startInclusive: { type: 'iso', value: start },
      }
    : undefined;
};

const lastUnitFilter = (
  unit: 'month' | 'week' | 'year',
  anchor: Date
): AnalysisDateFilter | undefined => {
  let start: string | undefined;
  let end: string | undefined;

  if (unit === 'week') {
    const currentStart = startOfUtcWeek(anchor);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - 7);
    start = dateOnlyFromDate(previousStart);
    end = dateOnlyFromDate(currentStart);
  } else if (unit === 'month') {
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth();
    start = dateOnlyString(year, month - 1, 1);
    end = dateOnlyString(year, month, 1);
  } else {
    const year = anchor.getUTCFullYear();
    start = dateOnlyString(year - 1, 0, 1);
    end = dateOnlyString(year, 0, 1);
  }

  return start && end
    ? {
        endExclusive: { type: 'iso', value: startOfDateOnlyIso(end) },
        field: 'record.date',
        id: `last_${unit}`,
        label: `Last ${unit}`,
        startInclusive: { type: 'iso', value: start },
      }
    : undefined;
};

const calendarMonthFilter = ({
  anchor,
  month,
  year,
}: {
  anchor: Date;
  month: string;
  year?: string;
}): AnalysisDateFilter | undefined => {
  const monthIndex = monthIndexForToken(month);
  if (monthIndex == null) return;

  const resolvedYear =
    year != null
      ? Number(year)
      : monthIndex <= anchor.getUTCMonth()
        ? anchor.getUTCFullYear()
        : anchor.getUTCFullYear() - 1;

  const start = dateOnlyString(resolvedYear, monthIndex, 1);
  const end = dateOnlyString(resolvedYear, monthIndex + 1, 1);
  if (!start || !end) return;

  return {
    endExclusive: { type: 'iso', value: startOfDateOnlyIso(end) },
    field: 'record.date',
    id: normalizeId(`${month}_${resolvedYear}`, 'calendar_month'),
    label: `${month} ${resolvedYear}`,
    startInclusive: { type: 'iso', value: start },
  };
};

export const parsePromptDateFilters = ({
  generationTime,
  prompt,
}: {
  generationTime?: Date | number | string | null;
  prompt: string;
}): AnalysisDateFilter[] => {
  const text = normalizeText(prompt);
  const anchor = generationAnchor(generationTime);

  const rolling =
    /\b(?:over|for|in|during)?\s*(?:the\s+)?(?:last|past)\s+(\d{1,3})\s+(days?|weeks?|months?|years?)\b/i.exec(
      text
    );

  if (rolling) {
    const amount = Number(rolling[1]);

    const unit = rolling[2]?.replace(/s$/i, '') as
      | (typeof DATE_FILTER_UNITS)[number]
      | undefined;

    if (amount > 0 && unit && DATE_FILTER_UNITS.includes(unit)) {
      return normalizeDateFilters([
        {
          endExclusive: { type: 'generationTime' },
          field: 'record.date',
          id: `last_${amount}_${unit}${amount === 1 ? '' : 's'}`,
          label: `Last ${amount} ${unit}${amount === 1 ? '' : 's'}`,
          startInclusive: {
            offset: { amount: -amount, unit },
            type: 'generationTime',
          },
        },
      ]);
    }
  }

  const thisUnit = /\bthis\s+(week|month|year)\b/i.exec(text);

  if (thisUnit) {
    return normalizeDateFilters([
      thisUnitFilter(thisUnit[1] as 'month' | 'week' | 'year', anchor),
    ]);
  }

  const lastUnit = /\blast\s+(week|month|year)\b/i.exec(text);

  if (lastUnit) {
    return normalizeDateFilters([
      lastUnitFilter(lastUnit[1] as 'month' | 'week' | 'year', anchor),
    ]);
  }

  const datePhrase = `(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|(?:${MONTH_PATTERN})\\s+\\d{1,2}(?:,?\\s+\\d{4})?)`;

  const range = new RegExp(
    `\\b(?:from|between)\\s+(${datePhrase})\\s+(?:to|through|and|-)\\s+(${datePhrase})\\b`,
    'i'
  ).exec(text);

  if (range) {
    return normalizeDateFilters([
      resolvePromptDateRange({
        anchor,
        endPhrase: range[2] ?? '',
        startPhrase: range[1] ?? '',
      }),
    ]);
  }

  const month = new RegExp(
    `\\b(?:in|during)\\s+(${MONTH_PATTERN})(?:\\s+(\\d{4}))?\\b`,
    'i'
  ).exec(text);

  if (month) {
    return normalizeDateFilters([
      calendarMonthFilter({
        anchor,
        month: month[1] ?? '',
        ...(month[2] && { year: month[2] }),
      }),
    ]);
  }

  return [];
};
