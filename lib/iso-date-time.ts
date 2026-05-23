import { isValid, parseISO } from 'date-fns';

export const ISO_DATE_TIME_SOURCE = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})`;

export const ISO_DATE_TIME_PATTERN = new RegExp(`^${ISO_DATE_TIME_SOURCE}$`);

export const ISO_DATE_TIME_TOKEN_PATTERN = new RegExp(
  String.raw`\b${ISO_DATE_TIME_SOURCE}\b`,
  'g'
);

export const parseIsoDateTime = (value: string) => {
  const trimmed = value.trim();
  if (!ISO_DATE_TIME_PATTERN.test(trimmed)) return undefined;
  const date = parseISO(trimmed);
  return isValid(date) ? date : undefined;
};
