import type { Log } from '@/features/logs/types/log';
import type { Tag } from '@/features/tags/types/tag';
import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type LogTemplate = InstaQLEntity<typeof schema, 'templates'> & {
  log?: Pick<Log, 'id'> | null;
  tags?: Tag[];
};
