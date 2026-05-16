import type { Template } from '@/domain/entities';
import type { Log } from '@/features/logs/types/log';
import type { Tag } from '@/features/tags/types/tag';

export type LogTemplate = Template & {
  log?: Pick<Log, 'id'> | null;
  tags?: Tag[];
};
