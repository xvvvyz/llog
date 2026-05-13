import { Href } from 'expo-router';

type SearchFilterTarget = { id?: string; name?: string | null };

const getFilterValue = ({ id, name }: SearchFilterTarget) => {
  const trimmedName = name?.trim();
  if (!trimmedName) return id;
  if (!/\s/.test(trimmedName) && !/["']/.test(trimmedName)) return trimmedName;
  if (!trimmedName.includes('"')) return `"${trimmedName}"`;
  if (!trimmedName.includes("'")) return `'${trimmedName}'`;
  return id;
};

const getSearchFilter = (key: 'log' | 'tag', target: SearchFilterTarget) => {
  const value = getFilterValue(target);
  return value ? `${key}:${value} ` : '';
};

export const getLogSearchQuery = (log: SearchFilterTarget) =>
  getSearchFilter('log', log);

export const getTagSearchQuery = (tag: SearchFilterTarget) =>
  getSearchFilter('tag', tag);

export const getRecordTagSearchQuery = ({
  log,
  tag,
}: {
  log?: SearchFilterTarget;
  tag: SearchFilterTarget;
}) => `${log ? getLogSearchQuery(log) : ''}${getTagSearchQuery(tag)}`;

export const getLookupHref = (query: string): Href => ({
  pathname: '/lookup',
  params: { q: query },
});
