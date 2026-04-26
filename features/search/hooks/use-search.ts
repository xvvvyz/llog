import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import type * as searchTypes from '@/features/search/types/search';
import { useTeams } from '@/features/teams/queries/use-teams';
import { db } from '@/lib/db';
import type { SearchResult as MiniSearchResult } from 'minisearch';
import MiniSearch from 'minisearch';
import * as React from 'react';

type SearchDocument = {
  id: string;
  type: 'record' | 'reply' | 'log';
  text: string;
  attachmentNames: string[];
  attachmentText: string;
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
  media?: searchTypes.SearchMediaItem[];
  profiles?: searchTypes.SearchProfile[];
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
  Array.isArray(result.attachmentNames) &&
  typeof result.attachmentText === 'string' &&
  typeof result.name === 'string' &&
  typeof result.people === 'string';

const getAttachmentNames = (
  media?: { name?: string | null }[] | null
): string[] =>
  media
    ?.map((item) => item.name?.trim())
    .filter((name): name is string => !!name) ?? [];

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
            $: { where: { teamId: { $in: teamIds }, isDraft: false } },
            author: { image: {} },
            log: { tags: { $: { fields: ['id'] } } },
            media: {},
          },
          replies: {
            $: { where: { teamId: { $in: teamIds }, isDraft: false } },
            author: { image: {} },
            record: { log: { tags: { $: { fields: ['id'] } } } },
            media: {},
          },
          logs: {
            $: { where: { teamId: { $in: teamIds } } },
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
        attachmentNames: [],
        attachmentText: '',
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
        tagIds: log.tags?.map((t) => t.id),
      });
    }

    for (const record of data.records ?? []) {
      const text = trimDisplayText(record.text);
      const attachmentNames = getAttachmentNames(record.media);
      const attachmentText = attachmentNames.join(' ');
      if (!text && !attachmentText) continue;

      docs.push({
        id: `record:${record.id}`,
        type: 'record',
        text,
        attachmentNames,
        attachmentText,
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
        media: record.media?.length
          ? record.media.map((m) => ({
              id: m.id,
              name: m.name,
              type: m.type,
              uri: m.uri,
            }))
          : undefined,
        tagIds: record.log?.tags?.map((t) => t.id),
      });
    }

    for (const reply of data.replies ?? []) {
      const text = trimDisplayText(reply.text);
      const attachmentNames = getAttachmentNames(reply.media);
      const attachmentText = attachmentNames.join(' ');
      if (!text && !attachmentText) continue;

      docs.push({
        id: `reply:${reply.id}`,
        type: 'reply',
        text,
        attachmentNames,
        attachmentText,
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
        media: reply.media?.length
          ? reply.media.map((m) => ({
              id: m.id,
              name: m.name,
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
      fields: ['text', 'attachmentText', 'name', 'people'],
      storeFields: [
        'text',
        'attachmentNames',
        'attachmentText',
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
        'media',
        'profiles',
        'tagIds',
      ],
      searchOptions: { fuzzy: 0.2, prefix: true, boost: { name: 2 } },
    });

    ms.addAll(documents);
    return ms;
  }, [documents]);

  const results = React.useMemo((): searchTypes.SearchResult[] => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const raw = miniSearch.search(trimmed).filter(isSearchDocument);
    const logIdSet = logIds?.length ? new Set(logIds) : null;
    const tagIdSet = tagIds?.length ? new Set(tagIds) : null;

    const filtered = raw.filter((r) => {
      if (logIdSet) if (!r.logId || !logIdSet.has(r.logId)) return false;
      if (tagIdSet) if (!r.tagIds?.some((t) => tagIdSet.has(t))) return false;
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
        attachmentNames: result.attachmentNames,
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
        media: result.media,
        profiles: result.profiles,
      } satisfies searchTypes.SearchResult;
    });
  }, [query, logIds, tagIds, miniSearch]);

  return { results, isLoading };
};
