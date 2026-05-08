import * as mediaMetadata from '@/domain/files/media-metadata';
import { visibleFileQuery } from '@/domain/files/query';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import type * as searchTypes from '@/features/search/types/search';
import { useTeams } from '@/features/teams/queries/use-teams';
import { db } from '@/lib/db';
import { createSearchIndex, normalizeSearchText } from '@/lib/search';
import type { SearchResult as MiniSearchResult } from 'minisearch';
import * as React from 'react';

type SearchDocument = {
  id: string;
  type: searchTypes.SearchResultType;
  text: string;
  attachmentNames: string[];
  attachmentUrls: string[];
  attachmentText: string;
  mediaItems: mediaMetadata.MediaSearchItem[];
  mediaText: string;
  tagItems: searchTypes.SearchTag[];
  tagText: string;
  name: string;
  date?: string | number;
  logId?: string;
  logName?: string;
  logColor?: number;
  recordId?: string;
  authorId?: string;
  authorAvatarSeedId?: string;
  authorName?: string;
  authorImage?: string;
  people: string;
  files?: searchTypes.SearchFileItem[];
  profiles?: searchTypes.SearchProfile[];
};

const isSearchDocument = (
  result: MiniSearchResult
): result is MiniSearchResult & SearchDocument =>
  typeof result.id !== 'undefined' &&
  (result.type === 'record' ||
    result.type === 'reply' ||
    result.type === 'log') &&
  typeof result.text === 'string' &&
  Array.isArray(result.attachmentNames) &&
  Array.isArray(result.attachmentUrls) &&
  typeof result.attachmentText === 'string' &&
  Array.isArray(result.mediaItems) &&
  typeof result.mediaText === 'string' &&
  Array.isArray(result.tagItems) &&
  typeof result.tagText === 'string' &&
  typeof result.name === 'string' &&
  typeof result.people === 'string';

const getAttachmentNames = (
  files?: { name?: string | null }[] | null
): string[] =>
  files
    ?.map((item) => item.name?.trim())
    .filter((name): name is string => !!name) ?? [];

const getLinkLabels = (links?: { label?: string | null }[] | null): string[] =>
  links
    ?.map((item) => item.label?.trim())
    .filter((label): label is string => !!label) ?? [];

const getLinkUrls = (links?: { url?: string | null }[] | null): string[] =>
  links
    ?.map((item) => item.url?.trim())
    .filter((url): url is string => !!url) ?? [];

const getTagNames = (tags?: { name?: string | null }[] | null): string[] =>
  tags
    ?.map((item) => item.name?.trim())
    .filter((name): name is string => !!name) ?? [];

type SearchTagSource = Pick<searchTypes.SearchTag, 'id'> & {
  color?: searchTypes.SearchTag['color'] | null;
  name?: searchTypes.SearchTag['name'] | null;
  order?: searchTypes.SearchTag['order'] | null;
};

const getSearchTags = (
  tags?: SearchTagSource[] | null
): searchTypes.SearchTag[] =>
  tags?.flatMap((tag) => {
    const name = tag.name?.trim();
    if (!name) return [];
    return [{ color: tag.color ?? 0, id: tag.id, name, order: tag.order ?? 0 }];
  }) ?? [];

const getMediaItems = (
  files?: Array<{ tracks?: unknown; transcript?: unknown }> | null
) => files?.flatMap((file) => mediaMetadata.getMediaSearchItems(file)) ?? [];

const getMatchedTermsForField = (
  match: MiniSearchResult['match'],
  field: string
): string[] =>
  Object.entries(match)
    .filter(([, fields]) => fields.includes(field))
    .map(([term]) => term);

const filterMatchingItems = <Item>(
  items: Item[] | undefined,
  terms: string[],
  getText: (item: Item) => string
): Item[] => {
  if (!items?.length || terms.length === 0) return [];
  const normalizedTerms = terms.map(normalizeSearchText).filter(Boolean);
  if (!normalizedTerms.length) return [];

  return items.filter((item) => {
    const normalizedText = normalizeSearchText(getText(item));
    return normalizedTerms.some((term) => normalizedText.includes(term));
  });
};

const filterMatchingSearchValues = (
  values: string[] | undefined,
  terms: string[]
) => filterMatchingItems(values, terms, (value) => value);

const filterMatchingTags = (
  tags: searchTypes.SearchTag[] | undefined,
  terms: string[]
) => filterMatchingItems(tags, terms, (tag) => tag.name);

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const key = normalizeSearchText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }

  return unique;
};

export const useSearch = ({ query }: { query: string }) => {
  const { teams } = useTeams();
  const teamIds = React.useMemo(() => teams.map((team) => team.id), [teams]);

  const { data, isLoading } = db.useQuery(
    teamIds.length
      ? {
          records: {
            $: { where: { teamId: { $in: teamIds }, isDraft: false } },
            author: { image: {} },
            log: {},
            files: visibleFileQuery,
            links: {},
            tags: {
              $: {
                fields: ['color', 'id', 'name', 'order'],
                where: { type: 'record' },
              },
            },
          },
          replies: {
            $: { where: { teamId: { $in: teamIds }, isDraft: false } },
            author: { image: {} },
            record: { log: {} },
            files: visibleFileQuery,
            links: {},
          },
          logs: {
            $: { where: { teamId: { $in: teamIds } } },
            profiles: { image: {} },
            tags: {
              $: {
                fields: ['color', 'id', 'name', 'order'],
                where: { type: 'log' },
              },
            },
          },
        }
      : null
  );

  const documents = React.useMemo(() => {
    if (!data) return [];
    const docs: SearchDocument[] = [];

    for (const log of data.logs ?? []) {
      const tagItems = getSearchTags(log.tags);
      const tagNames = getTagNames(tagItems);

      docs.push({
        id: `log:${log.id}`,
        type: 'log',
        text: '',
        attachmentNames: [],
        attachmentUrls: [],
        attachmentText: '',
        mediaItems: [],
        mediaText: '',
        tagItems,
        tagText: tagNames.join(' '),
        name: log.name,
        logId: log.id,
        logName: log.name,
        logColor: log.color,
        people: log.profiles?.map((p) => p.name).join(' ') ?? '',
        profiles: log.profiles?.length
          ? log.profiles.map((p) => ({
              avatarSeedId: p.avatarSeedId,
              id: p.id,
              name: p.name,
              uri: p.image?.uri,
            }))
          : undefined,
      });
    }

    for (const record of data.records ?? []) {
      const text = trimDisplayText(record.text);

      const attachmentNames = [
        ...getAttachmentNames(record.files),
        ...getLinkLabels(record.links),
      ];

      const attachmentUrls = getLinkUrls(record.links);
      const attachmentText = [...attachmentNames, ...attachmentUrls].join(' ');
      const mediaItems = getMediaItems(record.files);
      const mediaText = mediaMetadata.getMediaSearchText(mediaItems);
      const tagItems = getSearchTags(record.tags);
      const tagNames = getTagNames(tagItems);
      const tagText = tagNames.join(' ');
      if (!text && !attachmentText && !mediaText && !tagText) continue;

      docs.push({
        id: `record:${record.id}`,
        type: 'record',
        text,
        attachmentNames,
        attachmentUrls,
        attachmentText,
        mediaItems,
        mediaText,
        tagItems,
        tagText,
        name: '',
        date: record.date,
        logId: record.log?.id,
        logName: record.log?.name,
        logColor: record.log?.color,
        recordId: record.id,
        people: record.author?.name ?? '',
        authorId: record.author?.id,
        authorAvatarSeedId: record.author?.avatarSeedId,
        authorName: record.author?.name,
        authorImage: record.author?.image?.uri,
        files: record.files?.length
          ? record.files.map((m) => ({
              assetKey: m.assetKey,
              id: m.id,
              name: m.name,
              type: m.type,
              uri: m.uri,
            }))
          : undefined,
      });
    }

    for (const reply of data.replies ?? []) {
      const text = trimDisplayText(reply.text);

      const attachmentNames = [
        ...getAttachmentNames(reply.files),
        ...getLinkLabels(reply.links),
      ];

      const attachmentUrls = getLinkUrls(reply.links);
      const attachmentText = [...attachmentNames, ...attachmentUrls].join(' ');
      const mediaItems = getMediaItems(reply.files);
      const mediaText = mediaMetadata.getMediaSearchText(mediaItems);
      if (!text && !attachmentText && !mediaText) continue;

      docs.push({
        id: `reply:${reply.id}`,
        type: 'reply',
        text,
        attachmentNames,
        attachmentUrls,
        attachmentText,
        mediaItems,
        mediaText,
        tagItems: [],
        tagText: '',
        name: '',
        date: reply.date,
        logId: reply.record?.log?.id,
        logName: reply.record?.log?.name,
        logColor: reply.record?.log?.color,
        recordId: reply.record?.id,
        people: reply.author?.name ?? '',
        authorId: reply.author?.id,
        authorAvatarSeedId: reply.author?.avatarSeedId,
        authorName: reply.author?.name,
        authorImage: reply.author?.image?.uri,
        files: reply.files?.length
          ? reply.files.map((m) => ({
              assetKey: m.assetKey,
              id: m.id,
              name: m.name,
              type: m.type,
              uri: m.uri,
            }))
          : undefined,
      });
    }

    return docs;
  }, [data]);

  const miniSearch = React.useMemo(() => {
    return createSearchIndex<SearchDocument>({
      documents,
      fields: [
        'text',
        'attachmentText',
        'mediaText',
        'tagText',
        'name',
        'people',
      ],
      storeFields: [
        'text',
        'attachmentNames',
        'attachmentUrls',
        'attachmentText',
        'mediaItems',
        'mediaText',
        'tagItems',
        'tagText',
        'name',
        'type',
        'date',
        'logId',
        'logName',
        'logColor',
        'recordId',
        'authorId',
        'authorAvatarSeedId',
        'authorName',
        'authorImage',
        'people',
        'files',
        'profiles',
      ],
    });
  }, [documents]);

  const results = React.useMemo((): searchTypes.SearchResult[] => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const raw = miniSearch.search(trimmed).filter(isSearchDocument);

    return raw.map((result) => {
      const entityId = String(result.id).split(':')[1] ?? '';

      const textTerms =
        result.type === 'log'
          ? result.terms
          : getMatchedTermsForField(result.match, 'text');

      const attachmentTerms = getMatchedTermsForField(
        result.match,
        'attachmentText'
      );

      const attachmentNames = filterMatchingSearchValues(
        result.attachmentNames,
        attachmentTerms
      );

      const attachmentUrls = filterMatchingSearchValues(
        result.attachmentUrls,
        attachmentTerms
      );

      const tagTerms = getMatchedTermsForField(result.match, 'tagText');
      const tagItems = filterMatchingTags(result.tagItems, tagTerms);
      const mediaTerms = getMatchedTermsForField(result.match, 'mediaText');

      const mediaSnippets = filterMatchingItems(
        result.mediaItems,
        mediaTerms,
        (item) => item.text
      ).map((item) => item.snippet);

      return {
        id: entityId,
        type: result.type,
        score: result.score,
        terms: result.terms,
        attachmentTerms,
        tagTerms,
        textTerms,
        text:
          result.type === 'log'
            ? (result.logName ?? '')
            : textTerms.length
              ? (result.text ?? '')
              : '',
        attachmentNames,
        attachmentUrls,
        mediaSnippets: uniqueStrings(mediaSnippets),
        mediaTerms,
        tagItems,
        date: result.date,
        logId: result.logId,
        logName: result.type === 'log' ? undefined : result.logName,
        logColor: result.logColor,
        recordId: result.recordId,
        author: result.authorId
          ? {
              id: result.authorId,
              avatarSeedId: result.authorAvatarSeedId,
              name: result.authorName ?? '',
              image: result.authorImage
                ? { uri: result.authorImage }
                : undefined,
            }
          : undefined,
        files: result.files,
        profiles: result.profiles,
      } satisfies searchTypes.SearchResult;
    });
  }, [query, miniSearch]);

  return { results, isLoading };
};
