const LOG_SORT_VALUES = ['serverCreatedAt', 'name', 'color'] as const;

export type SortBy = (typeof LOG_SORT_VALUES)[number];

export const isSortBy = (value: unknown): value is SortBy =>
  typeof value === 'string' &&
  LOG_SORT_VALUES.some((sortValue) => sortValue === value);
