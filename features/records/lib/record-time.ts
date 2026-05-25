const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_INPUT_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?$/i;
const pad = (value: number) => value.toString().padStart(2, '0');

export const normalizeRecordDate = (date?: string | number | null) => {
  if (date == null) return undefined;
  if (typeof date === 'string') return date;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
};

export const getRecordDate = ({
  createdAt,
  recordDate,
}: {
  createdAt: string;
  recordDate?: string;
}) => recordDate ?? createdAt;

export const toRecordDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toRecordTimeInputValue = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const parseRecordDateTimeInput = ({
  dateText,
  timeText,
}: {
  dateText: string;
  timeText: string;
}) => {
  const dateMatch = DATE_INPUT_PATTERN.exec(dateText.trim());
  if (!dateMatch) return undefined;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const timeMatch = TIME_INPUT_PATTERN.exec(timeText.trim());
  if (!timeMatch) return undefined;
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? 0);
  const meridiem = timeMatch[3]?.toLowerCase();
  if (minute < 0 || minute > 59) return undefined;

  if (meridiem) {
    if (hour < 1 || hour > 12) return undefined;
    if (hour === 12) hour = 0;
    if (meridiem === 'pm') hour += 12;
  } else if (hour < 0 || hour > 23) return undefined;

  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return undefined;
  }

  return date;
};
