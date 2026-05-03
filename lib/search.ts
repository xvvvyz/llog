import MiniSearch, { type Options, type SearchOptions } from 'minisearch';

export const DEFAULT_SEARCH_OPTIONS = {
  fuzzy: 0.2,
  prefix: true,
} satisfies SearchOptions;

export const DEFAULT_NAMED_SEARCH_OPTIONS = {
  ...DEFAULT_SEARCH_OPTIONS,
  boost: { name: 2 },
} satisfies SearchOptions;

export const normalizeSearchText = (text: string) => text.trim().toLowerCase();

export const createSearchIndex = <T extends { id: string }>({
  documents,
  searchOptions = DEFAULT_NAMED_SEARCH_OPTIONS,
  ...options
}: Options<T> & { documents: T[] }) => {
  const miniSearch = new MiniSearch<T>({ ...options, searchOptions });
  miniSearch.addAll(documents);
  return miniSearch;
};
