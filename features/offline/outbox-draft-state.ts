import type * as types from '@/features/offline/types';

export type DraftParent = { parentId: string; parentType: 'record' | 'reply' };

export const sortQueuedLinks = (links: types.QueuedLinkSnapshot[]) =>
  [...links].sort((a, b) => a.order - b.order);

export const patchQueuedSubmissionLinks = (
  links: types.QueuedLinkSnapshot[]
) => ({ links: sortQueuedLinks(links) });

export const patchQueuedDraftLinks = (links: types.QueuedLinkSnapshot[]) => ({
  linksUpdated: true,
  links: sortQueuedLinks(links),
});

export const getSubmissionIdForParent = ({
  parentId,
  parentType,
}: DraftParent) => `${parentType}:${parentId}`;

export const getDraftIdForParent = ({ parentId, parentType }: DraftParent) =>
  `${parentType}:${parentId}`;

export const createEmptyDraft = ({
  parentId,
  parentType,
}: DraftParent): types.QueuedDraft => {
  const now = new Date().toISOString();
  const id = getDraftIdForParent({ parentId, parentType });

  return parentType === 'record'
    ? {
        contentId: parentId,
        id,
        links: [],
        tagIds: [],
        tags: [],
        type: 'record',
        updatedAt: now,
      }
    : { contentId: parentId, id, links: [], type: 'reply', updatedAt: now };
};

export const getQueuedDraftForParent = (
  state: Pick<types.PersistedOutbox, 'drafts'>,
  parent?: DraftParent
) => {
  if (!parent) return;
  const id = getDraftIdForParent(parent);
  return state.drafts.find((draft) => draft.id === id);
};
