import type { ParsedSearchQuery } from '@/lib/search';
import { normalizeSearchText } from '@/lib/search';
import type * as searchTypes from '@/features/search/types/search';

export type SearchFilterDocument = {
  authorId?: string;
  authorName?: string;
  logId?: string;
  logName?: string;
  tagItems: searchTypes.SearchTag[];
  type: searchTypes.SearchResultType;
};

const includesNormalized = (value: string | undefined, query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(value ?? '').includes(normalizedQuery);
};

const matchesEveryFilter = (
  filters: string[],
  values: (string | undefined)[]
) =>
  filters.every((filter) =>
    values.some((value) => includesNormalized(value, filter))
  );

export const getMatchingSearchTags = (
  tags: searchTypes.SearchTag[] | undefined,
  filters: string[]
) => {
  if (!tags?.length || filters.length === 0) return [];

  return tags.filter((tag) =>
    filters.some(
      (filter) =>
        includesNormalized(tag.name, filter) ||
        includesNormalized(tag.id, filter)
    )
  );
};

export const uniqueSearchTags = (tags: searchTypes.SearchTag[]) => {
  const seen = new Set<string>();
  const unique: searchTypes.SearchTag[] = [];

  for (const tag of tags) {
    const key = tag.id || normalizeSearchText(tag.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(tag);
  }

  return unique;
};

export const matchesSearchFilters = (
  document: SearchFilterDocument,
  filters: ParsedSearchQuery['filters']
) => {
  if (
    !matchesEveryFilter(
      filters.log,
      [document.logName, document.logId].filter(Boolean)
    )
  ) {
    return false;
  }

  if (
    !matchesEveryFilter(
      filters.tag,
      document.tagItems.flatMap((tag) => [tag.name, tag.id])
    )
  ) {
    return false;
  }

  if (
    filters.author.length &&
    (document.type === 'log' ||
      !matchesEveryFilter(filters.author, [
        document.authorName,
        document.authorId,
      ]))
  ) {
    return false;
  }

  return true;
};
