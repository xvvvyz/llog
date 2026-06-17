import MiniSearch, { type Options, type SearchOptions } from 'minisearch';

const DEFAULT_SEARCH_OPTIONS = {
  fuzzy: 0.2,
  prefix: true,
} satisfies SearchOptions;

const DEFAULT_NAMED_SEARCH_OPTIONS = {
  ...DEFAULT_SEARCH_OPTIONS,
  boost: { name: 2 },
} satisfies SearchOptions;

export const normalizeSearchText = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export type SearchFilterKey = 'author' | 'log' | 'tag';

export type ParsedSearchQuery = {
  filters: Record<SearchFilterKey, string[]>;
  text: string;
};

// Record tags don't propagate to replies, so any tag filter scopes the search
// to records only and excludes replies. Shared by the MCP and client search
// engines so the rule stays consistent across both surfaces.
export const tagFiltersExcludeReplies = (
  filters: ParsedSearchQuery['filters']
) => filters.tag.length > 0;

const SEARCH_FILTER_KEYS = new Set<SearchFilterKey>(['author', 'log', 'tag']);

const tokenizeSearchQuery = (query: string) => {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;

  for (const char of query.trim()) {
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }

      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
};

export const parseSearchQuery = (query: string): ParsedSearchQuery => {
  const filters: ParsedSearchQuery['filters'] = {
    author: [],
    log: [],
    tag: [],
  };

  const textTokens: string[] = [];

  for (const token of tokenizeSearchQuery(query)) {
    const separatorIndex = token.indexOf(':');

    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      textTokens.push(token);
      continue;
    }

    const key = normalizeSearchText(token.slice(0, separatorIndex));
    const value = token.slice(separatorIndex + 1).trim();

    if (SEARCH_FILTER_KEYS.has(key as SearchFilterKey) && value) {
      filters[key as SearchFilterKey].push(value);
    } else {
      textTokens.push(token);
    }
  }

  return { filters, text: textTokens.join(' ') };
};

export const createSearchIndex = <T extends { id: string }>({
  documents,
  searchOptions = DEFAULT_NAMED_SEARCH_OPTIONS,
  ...options
}: Options<T> & { documents: T[] }) => {
  const miniSearch = new MiniSearch<T>({
    processTerm: normalizeSearchText,
    ...options,
    searchOptions,
  });

  miniSearch.addAll(documents);
  return miniSearch;
};
