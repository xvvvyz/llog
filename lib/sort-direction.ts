const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const isSortDirection = (value: unknown): value is SortDirection =>
  typeof value === 'string' &&
  SORT_DIRECTIONS.some((direction) => direction === value);
