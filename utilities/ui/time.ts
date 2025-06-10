import {
  format,
  formatDistanceToNow,
  isThisYear,
  isToday,
  isYesterday,
} from 'date-fns';

export const formatDate = (date: Date | string | number) => {
  if (typeof date === 'string') date = new Date(date);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
  if (isThisYear(date)) return format(date, "MMM d 'at' h:mm a");
  return format(date, "MMM d, yyyy 'at' h:mm a");
};
