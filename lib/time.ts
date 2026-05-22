import {
  format,
  formatDistanceToNow,
  isValid,
  isThisYear,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';

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

const ISO_DATE_TIME_SOURCE = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})`;
const ISO_DATE_TIME_PATTERN = new RegExp(`^${ISO_DATE_TIME_SOURCE}$`);

const ISO_DATE_TIME_TOKEN_PATTERN = new RegExp(
  String.raw`\b${ISO_DATE_TIME_SOURCE}\b`,
  'g'
);

export type DateTimeDisplay = 'date' | 'datetime';

export const parseIsoDateTime = (value: string) => {
  const trimmed = value.trim();
  if (!ISO_DATE_TIME_PATTERN.test(trimmed)) return undefined;
  const date = parseISO(trimmed);
  return isValid(date) ? date : undefined;
};

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
) =>
  text.replace(
    ISO_DATE_TIME_TOKEN_PATTERN,
    (value) => formatIsoDateTimeValue(value, display) ?? value
  );

export const formatDate = (date?: Date | string | number) => {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);

  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true }).replace('about ', '');
  }

  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
  if (isThisYear(date)) return format(date, "MMM d 'at' h:mm a");
  return format(date, "MMM d, yyyy 'at' h:mm a");
};
