import {
  format,
  formatDistance,
  isSameDay,
  isSameYear,
  isThisYear,
  isToday,
  isYesterday,
  subDays,
} from 'date-fns';
import {
  ISO_DATE_TIME_SOURCE,
  ISO_DATE_TIME_TOKEN_PATTERN,
  parseIsoDateTime,
} from '@/lib/iso-date-time';

const parseLocalDateOnly = (value: string) => {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
};

const getLocalDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

const ISO_DATE_TIME_TEXT_PATTERN = new RegExp(
  String.raw`(?:\b([Oo]n)\s+)?\b(${ISO_DATE_TIME_SOURCE})\b`,
  'g'
);

const relativeDateLabels = new Set(['Today', 'Yesterday']);

export type DateTimeDisplay = 'date' | 'datetime';

const isSentenceStart = (text: string, index: number) => {
  const before = text.slice(0, index).trimEnd();
  return !before || /[.!?]$/.test(before);
};

const formatDateLabelInText = ({
  label,
  offset,
  onPrefix,
  source,
}: {
  label: string;
  offset: number;
  onPrefix?: string;
  source: string;
}) => {
  if (!relativeDateLabels.has(label)) {
    return `${onPrefix ? `${onPrefix} ` : ''}${label}`;
  }

  const relativeLabel = isSentenceStart(source, offset)
    ? label
    : label.toLowerCase();

  return relativeLabel;
};

const formatIsoDateTimeText = (
  text: string,
  getDisplay: (value: string, date: Date) => DateTimeDisplay
) =>
  text.replace(
    ISO_DATE_TIME_TEXT_PATTERN,
    (
      match,
      onPrefix: string | undefined,
      value: string,
      offset: number,
      source: string
    ) => {
      const date = parseIsoDateTime(value);
      if (!date) return match;
      const display = getDisplay(value, date);

      const label =
        display === 'date' ? getDateLabel(date) : formatDateTime(date);

      return display === 'date'
        ? formatDateLabelInText({ label, offset, onPrefix, source })
        : `${onPrefix ? `${onPrefix} ` : ''}${label}`;
    }
  );

export { parseIsoDateTime };

export const getDateLabel = (date?: Date | string | number): string => {
  if (!date) return '';

  if (typeof date === 'string' || typeof date === 'number') {
    date =
      typeof date === 'string'
        ? (parseLocalDateOnly(date) ?? new Date(date))
        : new Date(date);
  }

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisYear(date)) return format(date, 'MMMM d');
  return format(date, 'MMMM d, yyyy');
};

export const hasTimeComponent = (date?: Date | string | number) =>
  date instanceof Date ||
  typeof date === 'number' ||
  (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(date));

export const formatDateTime = (date?: Date | string | number) => {
  if (!date) return '';
  const hasTime = hasTimeComponent(date);

  if (typeof date === 'string' || typeof date === 'number') {
    date =
      typeof date === 'string'
        ? (parseLocalDateOnly(date) ?? new Date(date))
        : new Date(date);
  }

  if (!hasTime) return getDateLabel(date);
  if (isThisYear(date)) return format(date, "MMM d 'at' h:mm a");
  return format(date, "MMM d, yyyy 'at' h:mm a");
};

export const formatIsoDateTimeValue = (
  value: string,
  display: DateTimeDisplay = 'datetime'
) => {
  const date = parseIsoDateTime(value);
  if (!date) return undefined;
  return display === 'date' ? getDateLabel(date) : formatDateTime(date);
};

export const formatIsoDateTimeInText = (
  text: string,
  display: DateTimeDisplay = 'datetime'
) => formatIsoDateTimeText(text, () => display);

export const formatIsoDateTimeInTextByDay = (text: string) => {
  const timestampsByDay = new Map<string, Set<number>>();

  for (const value of text.match(ISO_DATE_TIME_TOKEN_PATTERN) ?? []) {
    const date = parseIsoDateTime(value);
    if (!date) continue;
    const key = getLocalDateKey(date);
    const timestamps = timestampsByDay.get(key) ?? new Set<number>();
    timestamps.add(date.getTime());
    timestampsByDay.set(key, timestamps);
  }

  if (!timestampsByDay.size) return text;

  return formatIsoDateTimeText(text, (_value, date) => {
    const timestamps = timestampsByDay.get(getLocalDateKey(date));
    return (timestamps?.size ?? 0) > 1 ? 'datetime' : 'date';
  });
};

const capitalizeInitialLowercase = (value: string) =>
  value.replace(/^[a-z]/, (letter) => letter.toUpperCase());

const formatRelativeTimeLabel = (date: Date | number, now: Date) =>
  capitalizeInitialLowercase(
    formatDistance(date, now, { addSuffix: true }).replace(/^about /, '')
  );

export const formatDate = (
  date?: Date | string | number,
  options?: { now?: Date | string | number }
) => {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  const now = options?.now == null ? new Date() : new Date(options.now);
  if (isSameDay(date, now)) return formatRelativeTimeLabel(date, now);

  if (isSameDay(date, subDays(now, 1))) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }

  if (isSameYear(date, now)) return format(date, "MMM d 'at' h:mm a");
  return format(date, "MMM d, yyyy 'at' h:mm a");
};
