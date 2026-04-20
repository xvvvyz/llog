import { useTeams } from '@/queries/use-teams';
import { SearchMediaItem, SearchProfile, SearchResult } from '@/types/search';
import { db } from '@/utilities/db';
import type { SearchResult as MiniSearchResult } from 'minisearch';
import MiniSearch from 'minisearch';
import * as React from 'react';

type SearchDocument = {
  id: string;
  type: 'record' | 'reply' | 'log';
  text: string;
  name: string;
  date?: string | number;
  logId?: string;
  logName?: string;
  logColor?: number;
  recordId?: string;
  authorId?: string;
  authorName?: string;
  authorImage?: string;
  people: string;
  media?: SearchMediaItem[];
  profiles?: SearchProfile[];
  tagIds?: string[];
};

const isSearchDocument = (
  result: MiniSearchResult
): result is MiniSearchResult & SearchDocument =>
  typeof result.id !== 'undefined' &&
  (result.type === 'record' ||
    result.type === 'reply' ||
    result.type === 'log') &&
  typeof result.text === 'string' &&
  typeof result.name === 'string' &&
  typeof result.people === 'string';

export const useSearch = ({
  query,
  logIds,
  tagIds,
}: {
  query: string;
  logIds?: string[];
  tagIds?: string[];
}) => {
  const { teams } = useTeams();
  const teamIds = React.useMemo(() => teams.map((team) => team.id), [teams]);

  const { data, isLoading } = db.useQuery(
    teamIds.length
      ? {
          records: {
            $: {
              where: { teamId: { $in: teamIds }, isDraft: false },
            },
            author: { image: {} },
            log: { tags: { $: { fields: ['id'] } } },
            media: {},
          },
          replies: {
            $: {
              where: { teamId: { $in: teamIds }, isDraft: false },
            },
            author: { image: {} },
            record: {
              log: { tags: { $: { fields: ['id'] } } },
            },
            media: {},
          },
          logs: {
            $: {
              where: { teamId: { $in: teamIds } },
            },
            tags: { $: { fields: ['id'] } },
            profiles: { image: {} },
          },
        }
      : null
  );

  const documents = React.useMemo(() => {
    if (!data) return [];
    const docs: SearchDocument[] = [];

    for (const log of data.logs ?? []) {
      docs.push({
        id: `log:${log.id}`,
        type: 'log',
        text: '',
        name: log.name,
        logId: log.id,
        logName: log.name,
        logColor: log.color,
        people: log.profiles?.map((p) => p.name).join(' ') ?? '',
        profiles: log.profiles?.length
          ? log.profiles.map((p) => ({
              id: p.id,
              name: p.name,
              uri: p.image?.uri,
            }))
          : undefined,
        tagIds: log.tags?.map((t) => t.id),
      });
    }

    for (const record of data.records ?? []) {
      if (!record.text) continue;

      docs.push({
        id: `record:${record.id}`,
        type: 'record',
        text: record.text,
        name: '',
        date: record.date,
        logId: record.log?.id,
        logName: record.log?.name,
        logColor: record.log?.color,
        recordId: record.id,
        people: record.author?.name ?? '',
        authorId: record.author?.id,
        authorName: record.author?.name,
        authorImage: record.author?.image?.uri,
        media: record.media?.length
          ? record.media.map((m) => ({
              id: m.id,
              type: m.type,
              uri: m.uri,
            }))
          : undefined,
        tagIds: record.log?.tags?.map((t) => t.id),
      });
    }

    for (const reply of data.replies ?? []) {
      if (!reply.text) continue;

      docs.push({
        id: `reply:${reply.id}`,
        type: 'reply',
        text: reply.text,
        name: '',
        date: reply.date,
        logId: reply.record?.log?.id,
        logName: reply.record?.log?.name,
        logColor: reply.record?.log?.color,
        recordId: reply.record?.id,
        people: reply.author?.name ?? '',
        authorId: reply.author?.id,
        authorName: reply.author?.name,
        authorImage: reply.author?.image?.uri,
        media: reply.media?.length
          ? reply.media.map((m) => ({
              id: m.id,
              type: m.type,
              uri: m.uri,
            }))
          : undefined,
        tagIds: reply.record?.log?.tags?.map((t) => t.id),
      });
    }

    return docs;
  }, [data]);

  const miniSearch = React.useMemo(() => {
    const ms = new MiniSearch<SearchDocument>({
      fields: ['text', 'name', 'people'],
      storeFields: [
        'text',
        'name',
        'type',
        'date',
        'logId',
        'logName',
        'logColor',
        'recordId',
        'authorId',
        'authorName',
        'authorImage',
        'people',
        'media',
        'profiles',
        'tagIds',
      ],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { name: 2 },
      },
    });

    ms.addAll(documents);
    return ms;
  }, [documents]);

  const results = React.useMemo((): SearchResult[] => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const raw = miniSearch.search(trimmed).filter(isSearchDocument);
    const logIdSet = logIds?.length ? new Set(logIds) : null;
    const tagIdSet = tagIds?.length ? new Set(tagIds) : null;

    const filtered = raw.filter((r) => {
      if (logIdSet) {
        if (!r.logId || !logIdSet.has(r.logId)) return false;
      }

      if (tagIdSet) {
        if (!r.tagIds?.some((t) => tagIdSet.has(t))) return false;
      }

      return true;
    });

    return filtered.map((result) => {
      const entityId = String(result.id).split(':')[1] ?? '';

      return {
        id: entityId,
        type: result.type,
        score: result.score,
        terms: result.terms,
        text:
          result.type === 'log' ? (result.logName ?? '') : (result.text ?? ''),
        date: result.date,
        logId: result.logId,
        logName: result.type === 'log' ? undefined : result.logName,
        logColor: result.logColor,
        recordId: result.recordId,
        author: result.authorId
          ? {
              id: result.authorId,
              name: result.authorName ?? '',
              image: result.authorImage
                ? { uri: result.authorImage }
                : undefined,
            }
          : undefined,
        media: result.media,
        profiles: result.profiles,
      } satisfies SearchResult;
    });
  }, [query, logIds, tagIds, miniSearch]);

  return { results, isLoading };
};
