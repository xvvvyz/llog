import type { Tag } from '@/features/tags/types/tag';

export type LogTemplate = {
  id: string;
  log?: { id?: string | null } | null;
  order: number;
  tags?: Tag[];
  teamId: string;
  text: string;
};
