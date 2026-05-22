const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ISO_DATE_TIME_WITH_ZONE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|([+-])(\d{2}):(\d{2}))$/;

const isDateOnlyString = (value) =>
  typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim());

const isIsoDateTimeWithZone = (value) => {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE_TIME_WITH_ZONE_PATTERN.exec(value.trim());
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText == null ? 0 : Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59 &&
    Number.isFinite(new Date(value).getTime())
  );
};

const isDateLikeString = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim());

module.exports = { isDateLikeString, isDateOnlyString, isIsoDateTimeWithZone };
