import {
  format,
  formatDistanceToNow,
  isThisYear,
  isToday,
  isYesterday,
} from 'date-fns';

export const getDateLabel = (date?: Date | string | number): string => {
  if (!date) return '';

  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date);
  }

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisYear(date)) return format(date, 'MMMM d');
  return format(date, 'MMMM d, yyyy');
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
