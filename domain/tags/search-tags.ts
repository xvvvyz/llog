import type { Tag } from '@/instant.entities';
import { createSearchIndex, normalizeSearchText } from '@/lib/search';
import type MiniSearch from 'minisearch';

type SearchableTag = Pick<Tag, 'id' | 'name'>;
type TagSearchIndex = MiniSearch<SearchableTag>;

export const createTagSearchIndex = <T extends SearchableTag>(tags: T[]) =>
  createSearchIndex<SearchableTag>({
    documents: tags.map((tag) => ({ id: tag.id, name: tag.name })),
    fields: ['name'],
    storeFields: ['id'],
  });

export const findExactTagId = <T extends SearchableTag>(
  tags: T[],
  query: string
) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return;

  return tags.find((tag) => normalizeSearchText(tag.name) === normalizedQuery)
    ?.id;
};

export const searchTagsWithIndex = <T extends SearchableTag>({
  index,
  query,
  tags,
}: {
  index: TagSearchIndex;
  query: string;
  tags: T[];
}) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return tags;
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  return index
    .search(trimmedQuery)
    .map((result) => tagById.get(String(result.id)))
    .filter((tag): tag is T => !!tag);
};

export const searchTags = <T extends SearchableTag>(tags: T[], query: string) =>
  searchTagsWithIndex({ index: createTagSearchIndex(tags), query, tags });
