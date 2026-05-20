import {
  format,
  formatDistanceToNow,
  isThisYear,
  isToday,
  isYesterday,
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
