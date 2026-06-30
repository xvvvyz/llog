import type { SortDirection } from '@/lib/sort-direction';

const LOG_SORT_VALUES = ['serverCreatedAt', 'name', 'color'] as const;

export type SortBy = (typeof LOG_SORT_VALUES)[number];

export const DEFAULT_SORT_BY: SortBy = 'serverCreatedAt';

export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

export const isSortBy = (value: unknown): value is SortBy =>
  typeof value === 'string' &&
  LOG_SORT_VALUES.some((sortValue) => sortValue === value);

export const isDefaultLogsSort = (
  sortBy: SortBy,
  sortDirection: SortDirection
) => sortBy === DEFAULT_SORT_BY && sortDirection === DEFAULT_SORT_DIRECTION;
